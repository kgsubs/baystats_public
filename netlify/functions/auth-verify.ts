import type { Handler } from '@netlify/functions';
import { getSupabaseAdmin } from '../../src/lib/auth';
import { randomUUID } from 'crypto';

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

  const { token } = JSON.parse(event.body || '{}');
  if (!token) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Token required' }) };
  }

  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  // Atomic claim: UPDATE with WHERE used_at IS NULL prevents double-redemption
  const { data: magicToken } = await supabase
    .from('magic_tokens')
    .update({ used_at: now })
    .eq('token', token)
    .is('used_at', null)
    .gt('expires_at', now)
    .select('id, user_id')
    .single();

  if (!magicToken) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid or expired sign-in link.' }) };
  }

  const { data: user } = await supabase
    .from('users')
    .select('id, email, tier')
    .eq('id', magicToken.user_id)
    .single();

  if (!user || user.tier !== 'pro') {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'No active subscription found.' }) };
  }

  const accessToken = randomUUID();
  const refreshToken = randomUUID();
  const sessionEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await supabase.from('sessions').insert({
    user_id: user.id,
    access_token: accessToken,
    refresh_token: refreshToken,
    session_start: now,
    session_end: sessionEnd,
  });

  const maxAge = 30 * 24 * 60 * 60;
  const secure = process.env.SITE_URL?.startsWith('https') ? '; Secure' : '';
  const accessCookie  = `sb-access-token=${accessToken}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
  const refreshCookie = `sb-refresh-token=${refreshToken}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;

  return {
    statusCode: 200,
    headers: { ...headers, 'Set-Cookie': [accessCookie, refreshCookie] },
    body: JSON.stringify({ success: true }),
  };
};
