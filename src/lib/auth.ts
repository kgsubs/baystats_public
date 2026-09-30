import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

// sessions.access_token and sessions.refresh_token are uuid columns, so
// session tokens are stored as the first 128 bits of their SHA-256 hash,
// formatted as a uuid.
export function hashTokenAsUuid(token: string): string {
  const h = hashToken(token)
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`
}

export function getSupabaseAdmin() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || ''
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

export interface AuthenticatedUser {
  id: string
  email: string
  tier: 'free' | 'pro'
}

// Looks up a session by its access token. Sessions are stored hashed
// (see auth-verify.ts).
export async function findSessionByAccessToken(accessToken: string): Promise<{ user_id: string } | null> {
  const supabaseAdmin = getSupabaseAdmin()
  const now = new Date().toISOString()

  const { data } = await supabaseAdmin
    .from('sessions')
    .select('user_id, session_end')
    .eq('access_token', hashTokenAsUuid(accessToken))
    .gt('session_end', now)
    .maybeSingle()

  return data ? { user_id: data.user_id } : null
}

export async function verifySession(cookieHeader: string | undefined): Promise<{ user: AuthenticatedUser } | { error: string; status: number }> {
  if (!cookieHeader) {
    return { error: 'Unauthorized', status: 401 }
  }

  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=')
    acc[key] = value
    return acc
  }, {} as Record<string, string>)

  const accessToken = cookies['sb-access-token']

  if (!accessToken) {
    return { error: 'Unauthorized', status: 401 }
  }

  const session = await findSessionByAccessToken(accessToken)
  if (!session) {
    return { error: 'Unauthorized', status: 401 }
  }

  const supabaseAdmin = getSupabaseAdmin()

  // Fetch user record for tier
  const { data: dbUser, error: userError } = await supabaseAdmin
    .from('users')
    .select('id, email, tier')
    .eq('id', session.user_id)
    .single()

  if (userError || !dbUser) {
    return { error: 'User not found', status: 404 }
  }

  return {
    user: {
      id: dbUser.id,
      email: dbUser.email,
      tier: dbUser.tier as 'free' | 'pro'
    }
  }
}
