import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

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

// CORS origin from SITE_URL env var
const origin = process.env.SITE_URL || 'https://baystats.com'
const headers = {
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json'
}

// Extract refresh token from cookie header
function getRefreshTokenFromCookie(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  
  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'sb-refresh-token') {
      return value;
    }
  }
  return null;
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

  try {
    const refreshToken = getRefreshTokenFromCookie(event.headers.cookie)
    
    if (!refreshToken) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'No refresh token' })
      }
    }

    const supabaseAdmin = getSupabaseAdmin()

    // F001: Look up session by refresh_token in DB
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('id, user_id, session_end')
      .eq('refresh_token', refreshToken)
      .gt('session_end', new Date().toISOString())
      .single()

    if (sessionError || !session) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Session expired - please log in again' })
      }
    }

    // F001: Generate new UUID tokens
    const { randomUUID } = await import('crypto')
    const newAccessToken = randomUUID()
    const newRefreshToken = randomUUID()

    // Update session row with new tokens and extended expiry
    const { error: updateError } = await supabaseAdmin
      .from('sessions')
      .update({
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        session_end: new Date(Date.now() + 86400 * 1000).toISOString()
      })
      .eq('id', session.id)

    if (updateError) {
      console.error('Session update error:', updateError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to refresh session' })
      }
    }

    const secure = process.env.SITE_URL?.startsWith('https') ? '; Secure' : ''
    const accessTokenCookie = `sb-access-token=${newAccessToken}; HttpOnly; Path=/; Max-Age=86400; SameSite=Lax${secure}`
    const refreshTokenCookie = `sb-refresh-token=${newRefreshToken}; HttpOnly; Path=/; Max-Age=86400; SameSite=Lax${secure}`

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Set-Cookie': [accessTokenCookie, refreshTokenCookie]
      },
      body: JSON.stringify({ success: true })
    }

  } catch (error) {
    console.error('Refresh error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to refresh session' })
    }
  }
}
