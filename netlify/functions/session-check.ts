import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import { verifySession } from '../../src/lib/auth'
import { requireEnv } from '../../src/lib/env'

function getSupabaseAdmin() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || ''
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

const origin = requireEnv('SITE_URL')
const headers = {
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json'
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers }
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  // Verify session via sessions table DB lookup
  const authResult = await verifySession(event.headers.cookie)
  
  if ('error' in authResult) {
    return {
      statusCode: authResult.status,
      headers,
      body: JSON.stringify({ error: authResult.error })
    }
  }

  const { user } = authResult

  // Payment code (LemonSqueezy) removed; there is no paid tier to look up.
  const supabaseAdmin = getSupabaseAdmin()
  const { data: adminRecord, error: adminError } = await supabaseAdmin
    .from('admin_users')
    .select('id')
    .eq('email', user.email)
    .single()

  const isAdmin = !adminError && !!adminRecord

  // Pro users have unlimited access
  if (user.tier === 'pro') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        tier: 'pro',
        session_active: true,
        unlimited: true,
        is_admin: isAdmin,
      })
    }
  }

  // Free users - check for active session
  return await checkFreeUserSession(user.id, headers)
}

async function checkFreeUserSession(userId: string, responseHeaders: Record<string, string>) {
  const now = new Date().toISOString()

  const supabaseAdmin = getSupabaseAdmin()

  const { data: session, error } = await supabaseAdmin
    .from('sessions')
    .select('id, session_start, session_end')
    .eq('user_id', userId)
    .gt('session_end', now)
    .order('session_end', { ascending: false })
    .limit(1)
    .single()

  if (error || !session) {
    return {
      statusCode: 200,
      headers: responseHeaders,
      body: JSON.stringify({
        tier: 'free',
        session_active: false,
        can_start_new_session: true,
        next_session_available_at: null,
      })
    }
  }

  const sessionEnd = new Date(session.session_end)
  const timeRemainingMs = sessionEnd.getTime() - new Date().getTime()
  const timeRemainingMinutes = Math.max(0, Math.floor(timeRemainingMs / 60000))

  return {
    statusCode: 200,
    headers: responseHeaders,
    body: JSON.stringify({
      tier: 'free',
      session_active: true,
      session_start: session.session_start,
      session_end: session.session_end,
      time_remaining_minutes: timeRemainingMinutes,
    })
  }
}
