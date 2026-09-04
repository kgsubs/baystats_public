import type { Handler } from '@netlify/functions';
import { getSupabaseAdmin } from '../../src/lib/auth';

const origin = process.env.SITE_URL || 'https://baystats.com';
const headers = {
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json',
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // Delete the session row from DB so the token can't be reused
  const cookies = (event.headers.cookie || '').split(';').reduce((acc, c) => {
    const eqIdx = c.indexOf('=');
    if (eqIdx > -1) acc[c.slice(0, eqIdx).trim()] = c.slice(eqIdx + 1).trim();
    return acc;
  }, {} as Record<string, string>);

  const accessToken = cookies['sb-access-token'];
  if (accessToken) {
    const supabase = getSupabaseAdmin();
    await supabase.from('sessions').delete().eq('access_token', accessToken);
  }

  const secure = process.env.SITE_URL?.startsWith('https') ? '; Secure' : '';
  const clearAccess  = `sb-access-token=;  HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secure}`;
  const clearRefresh = `sb-refresh-token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secure}`;

  return {
    statusCode: 200,
    headers: { ...headers, 'Set-Cookie': [clearAccess, clearRefresh] },
    body: JSON.stringify({ success: true }),
  };
};
