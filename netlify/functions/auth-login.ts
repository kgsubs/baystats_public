import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

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

export const handler: Handler = async (event) => {

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers
    }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { email, password } = JSON.parse(event.body || '{}')

    if (!email || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email and password are required' })
      }
    }

    const supabaseAdmin = getSupabaseAdmin()
    
    // Fetch user from database
    const { data: user, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id, email, password_hash, tier')
      // password_hash may be null for webhook-created accounts (handled below)
      .eq('email', email)
      .single()

    if (fetchError || !user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid email or password' })
      }
    }

    // Account exists but no password set (created via subscription webhook)
    if (!user.password_hash) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'No password set for this account. Sign in via your subscription confirmation email, or set a password from your Account page.' })
      }
    }

    // Compare password
    const isValid = await bcrypt.compare(password, user.password_hash)

    if (!isValid) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid email or password' })
      }
    }

    // F001: Generate real UUID tokens
    const { randomUUID } = await import('crypto')
    const accessToken = randomUUID()
    const refreshToken = randomUUID()

    // Insert tokens into sessions table
    const { error: sessionError } = await supabaseAdmin
      .from('sessions')
      .insert({
        user_id: user.id,
        access_token: accessToken,
        refresh_token: refreshToken,
        session_start: new Date().toISOString(),
        session_end: new Date(Date.now() + 86400 * 1000).toISOString()
      })

    if (sessionError) {
      console.error('Session insert error:', sessionError)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Authentication service unavailable. Please try again.' })
      }
    }

    const secure = process.env.SITE_URL?.startsWith('https') ? '; Secure' : ''
    const accessTokenCookie = `sb-access-token=${accessToken}; HttpOnly; Path=/; Max-Age=86400; SameSite=Lax${secure}`
    const refreshTokenCookie = `sb-refresh-token=${refreshToken}; HttpOnly; Path=/; Max-Age=86400; SameSite=Lax${secure}`

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Set-Cookie': [accessTokenCookie, refreshTokenCookie]
      },
      body: JSON.stringify({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          tier: user.tier
        }
      })
    }

  } catch (error) {
    console.error('Login error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Authentication service unavailable. Please try again.' })
    }
  }
}
