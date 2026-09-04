import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import { isValidLocation } from '../../src/config/locations'
import { isLiveLocation } from '../../src/lib/access'

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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

  let email = ''
  let location = ''
  try {
    const body = JSON.parse(event.body || '{}')
    email = String(body.email || '').trim()
    location = String(body.location || '').trim()
  } catch {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid request body' })
    }
  }

  if (!EMAIL_RE.test(email) || email.length > 254) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Please enter a valid email address' })
    }
  }

  // Only locations that exist and are not already live can be waitlisted.
  if (!isValidLocation(location) || isLiveLocation(location)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Unknown location' })
    }
  }

  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('location_waitlist')
    .insert({ email: email.toLowerCase(), location_slug: location })

  // 23505 is a duplicate signup, which is a success from the visitor's side.
  if (error && error.code !== '23505') {
    console.error('Waitlist insert error:', error.message)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Could not save your email. Please try again.' })
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ ok: true, already_signed_up: error?.code === '23505' })
  }
}
