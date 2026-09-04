import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { verifyJwt } from '../../src/lib/auth';

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

const origin = process.env.SITE_URL || 'https://baystats.com';
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
}

// GET - Fetch recent submissions
async function handleGet(): Promise<{ statusCode: number; body: string }> {
  try {
    const { data: records, error } = await getSupabaseAdmin()
      .from('vessel_counts')
      .select('id, count, recorded_at, time_of_day, reporter, notes')
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

  try {
    const { data: record, error } = await getSupabaseAdmin()
      .from('vessel_counts')
      .insert({
        count: body.count,
        recorded_at: new Date().toISOString(),
        time_of_day: body.time_of_day,
        reporter: body.reporter.trim(),
        notes: body.notes?.trim() || null,
        source: 'MANUAL_ENTRY'
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
    const result = await handleGet();
    return {
      statusCode: result.statusCode,
      headers,
      body: result.body
    };
  }

  if (event.httpMethod === 'POST') {
    const authResult = await verifyJwt(event.headers.cookie)
    if ('error' in authResult) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) }
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
