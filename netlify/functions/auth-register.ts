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

// Email validation regex (RFC 5322 simplified)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Password validation: min 8 chars, 1 uppercase, 1 lowercase, 1 number
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

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

    // Validation
    if (!email || !EMAIL_REGEX.test(email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Please enter a valid email address' })
      }
    }

    if (!password || !PASSWORD_REGEX.test(password)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Password must be at least 8 characters with uppercase, lowercase, and number' 
        })
      }
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Check if email already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, email, tier, password_hash')
      .eq('email', email)
      .single()

    // If user exists WITH a password already set, reject
    if (existingUser && existingUser.password_hash) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: 'An account with this email already exists' })
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    let user: { id: string; email: string; tier: string }

    if (existingUser && !existingUser.password_hash) {
      // Webhook-created account (paid before registering) — set their password and preserve pro tier
      const { data: updatedUser, error: updateError } = await supabaseAdmin
        .from('users')
        .update({ password_hash: passwordHash })
        .eq('id', existingUser.id)
        .select('id, email, tier')
        .single()

      if (updateError || !updatedUser) {
        console.error('Password set error:', updateError)
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Authentication service unavailable. Please try again.' })
        }
      }
      user = updatedUser
    } else {
      // New user — create with free tier
      const { data: newUser, error: insertError } = await supabaseAdmin
        .from('users')
        .insert({ email, password_hash: passwordHash, tier: 'free' })
        .select('id, email, tier')
        .single()

      if (insertError || !newUser) {
        console.error('Insert error:', insertError)
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Authentication service unavailable. Please try again.' })
        }
      }
      user = newUser
    }

    // Auto-login: create a session so the user lands on the dashboard authenticated
    const { randomUUID } = await import('crypto')
    const accessToken = randomUUID()
    const refreshToken = randomUUID()

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
      // Registration succeeded — return success without cookie, user can log in manually
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, user: { id: user.id, email: user.email, tier: user.tier } })
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
        user: { id: user.id, email: user.email, tier: user.tier }
      })
    }

  } catch (error) {
    console.error('Registration error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Authentication service unavailable. Please try again.' })
    }
  }
}
