import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import { verifyJwt } from '../../src/lib/auth'

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

const origin = process.env.SITE_URL || 'https://baystats.com'
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

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  // Verify JWT
  const authResult = await verifyJwt(event.headers.cookie)
  if ('error' in authResult) {
    return {
      statusCode: authResult.status,
      headers,
      body: JSON.stringify({ error: authResult.error })
    }
  }

  const { user } = authResult

  // Pro users don't need sessions
  if (user.tier === 'pro') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        tier: 'pro',
        unlimited: true,
        message: 'Pro users have unlimited access'
      })
    }
  }

  // Check for existing active session
  const now = new Date().toISOString()

  const { data: existingSession } = await getSupabaseAdmin()
    .from('sessions')
    .select('id, session_end')
    .eq('user_id', user.id)
    .gt('session_end', now)
    .order('session_end', { ascending: false })
    .limit(1)
    .single()

  if (existingSession) {
    const sessionEnd = new Date(existingSession.session_end)
    const timeRemainingMs = sessionEnd.getTime() - new Date().getTime()
    const timeRemainingMinutes = Math.max(0, Math.floor(timeRemainingMs / 60000))

    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({
        error: 'Current session still active',
        session_end: existingSession.session_end,
        time_remaining_minutes: timeRemainingMinutes
      })
    }
  }

  // Create new 24-hour session
  const sessionStart = new Date()
  const sessionEnd = new Date(sessionStart.getTime() + 24 * 60 * 60 * 1000)

  const { data: newSession, error } = await getSupabaseAdmin()
    .from('sessions')
    .insert({
      user_id: user.id,
      session_start: sessionStart.toISOString(),
      session_end: sessionEnd.toISOString()
    })
    .select('session_start, session_end')
    .single()

  if (error || !newSession) {
    console.error('Session creation error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to start session' })
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      session_start: newSession.session_start,
      session_end: newSession.session_end
    })
  }
}
