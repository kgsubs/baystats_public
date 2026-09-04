import { createClient } from '@supabase/supabase-js'

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

export async function verifyJwt(cookieHeader: string | undefined): Promise<{ user: AuthenticatedUser } | { error: string; status: number }> {
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

  const supabaseAdmin = getSupabaseAdmin()

  // Look up session in DB by access_token
  const { data: session, error: sessionError } = await supabaseAdmin
    .from('sessions')
    .select('user_id, session_end')
    .eq('access_token', accessToken)
    .gt('session_end', new Date().toISOString())
    .single()

  if (sessionError || !session) {
    return { error: 'Unauthorized', status: 401 }
  }

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

// refreshSession is no longer used but kept for interface compatibility
export async function refreshSession(_refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  user: AuthenticatedUser
} | null> {
  return null
}
