import type { Handler } from '@netlify/functions';
import { verifyJwt, getSupabaseAdmin } from '../../src/lib/auth';
import bcrypt from 'bcryptjs';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

const origin = process.env.SITE_URL || 'https://baystats.com';
const headers = {
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json',
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const authResult = await verifyJwt(event.headers.cookie);
  if ('error' in authResult) {
    return { statusCode: authResult.status, headers, body: JSON.stringify({ error: authResult.error }) };
  }

  const { password } = JSON.parse(event.body || '{}');
  if (!password || !PASSWORD_REGEX.test(password)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Password must be at least 8 characters with uppercase, lowercase, and number' }),
    };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from('users')
    .update({ password_hash: passwordHash })
    .eq('id', authResult.user.id);

  if (error) {
    console.error('Set password error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to set password. Please try again.' }) };
  }

  return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
};
