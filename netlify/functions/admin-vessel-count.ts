import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { findSessionByAccessToken } from '../../src/lib/auth';
import { requireEnv } from '../../src/lib/env';
import { getAllLocationSlugs } from '../../src/config/locations';

function getSupabaseAdmin() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Session cookie -> sessions -> users -> admin_users by email, the same
// pattern admin-marinas.ts's verifyAdmin uses.
async function verifyAdminFromCookie(event: any): Promise<boolean> {
  const cookieHeader = event.headers?.cookie || event.headers?.Cookie;
  const accessToken = cookieHeader?.split(';')
    .map((c: string) => c.trim().split('='))
    .find(([name]: string[]) => name === 'sb-access-token')?.[1];

  if (!accessToken) return false;

  const session = await findSessionByAccessToken(accessToken);
  if (!session) return false;

  const { data: user } = await getSupabaseAdmin()
    .from('users')
    .select('email')
    .eq('id', session.user_id)
    .single();

  if (!user) return false;

  const { data: adminRecord } = await getSupabaseAdmin()
    .from('admin_users')
    .select('id')
    .eq('email', user.email)
    .single();

  return !!adminRecord;
}

const origin = requireEnv('SITE_URL');
const headers = {
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

interface VesselCountPayload {
  count: number;
  time_of_day: 'morning' | 'evening';
  reporter: string;
  notes?: string;
  location?: string;
}

// GET - Fetch recent submissions for one location (admin only; the
// records include the reporter's name)
async function handleGet(location: string): Promise<{ statusCode: number; body: string }> {
  try {
    const { data: records, error } = await getSupabaseAdmin()
      .from('vessel_counts')
      .select('id, count, recorded_at, time_of_day, reporter, notes, location')
      .eq('location', location)
      .order('recorded_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Error fetching vessel counts:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to fetch vessel counts' })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ records: records || [] })
    };
  } catch (error) {
    console.error('Unexpected error fetching vessel counts:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
}

// POST - Create new vessel count entry
async function handlePost(body: VesselCountPayload): Promise<{ statusCode: number; body: string }> {
  // Validation
  if (typeof body.count !== 'number' || isNaN(body.count)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Count must be a valid number' })
    };
  }

  if (body.count < 0 || body.count > 300) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Count must be between 0 and 300' })
    };
  }

  if (!body.time_of_day || !['morning', 'evening'].includes(body.time_of_day)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Time of day must be "morning" or "evening"' })
    };
  }

  if (!body.reporter || body.reporter.trim().length === 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Reporter name is required' })
    };
  }

  const location = body.location && getAllLocationSlugs().includes(body.location)
    ? body.location
    : 'rodney-bay';

  try {
    const { data: record, error } = await getSupabaseAdmin()
      .from('vessel_counts')
      .insert({
        count: body.count,
        recorded_at: new Date().toISOString(),
        time_of_day: body.time_of_day,
        reporter: body.reporter.trim(),
        notes: body.notes?.trim() || null,
        source: 'MANUAL_ENTRY',
        location
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting vessel count:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to save vessel count' })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        record,
        message: 'Vessel count recorded successfully'
      })
    };
  } catch (error) {
    console.error('Unexpected error inserting vessel count:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
}

export const handler: Handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers
    };
  }

  if (event.httpMethod === 'GET') {
    if (!(await verifyAdminFromCookie(event))) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Admin access required' }) };
    }

    const locationSlug = event.queryStringParameters?.location || 'rodney-bay';
    const location = getAllLocationSlugs().includes(locationSlug) ? locationSlug : 'rodney-bay';

    const result = await handleGet(location);
    return {
      statusCode: result.statusCode,
      headers,
      body: result.body
    };
  }

  if (event.httpMethod === 'POST') {
    if (!(await verifyAdminFromCookie(event))) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Admin access required' }) };
    }

    let body: VesselCountPayload;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON body' })
      };
    }

    const result = await handlePost(body);
    return {
      statusCode: result.statusCode,
      headers,
      body: result.body
    };
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Method not allowed' })
  };
};
