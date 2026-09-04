import type { Handler } from '@netlify/functions';
import { getSupabaseAdmin } from '../../src/lib/auth';

const origin = process.env.SITE_URL || 'https://baystats.com';
const headers = {
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const { checkout_token } = JSON.parse(event.body || '{}');
  if (!checkout_token) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing token' }) };
  }

  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  // Atomic claim: UPDATE clears checkout_token in one operation, preventing double-redemption
  const { data: session } = await supabase
    .from('sessions')
    .update({ checkout_token: null })
    .eq('checkout_token', checkout_token)
    .gt('session_end', now)
    .select('id, access_token, refresh_token, user_id, session_end')
    .single();

  if (!session) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Token not found or expired' }) };
  }

  const { data: user } = await supabase
    .from('users')
    .select('id, email, tier')
    .eq('id', session.user_id)
    .single();

  if (!user) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'User not found' }) };
  }

  const maxAge = Math.max(0, Math.floor((new Date(session.session_end).getTime() - Date.now()) / 1000));
  const secure = process.env.SITE_URL?.startsWith('https') ? '; Secure' : '';
  const accessCookie  = `sb-access-token=${session.access_token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
  const refreshCookie = `sb-refresh-token=${session.refresh_token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;

  return {
    statusCode: 200,
    headers: { ...headers, 'Set-Cookie': [accessCookie, refreshCookie] },
    body: JSON.stringify({ success: true, user: { email: user.email, tier: user.tier } }),
  };
};
