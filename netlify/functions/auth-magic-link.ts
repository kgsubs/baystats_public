import type { Handler } from '@netlify/functions';
import { Resend } from 'resend';
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

// Always return the same response to prevent email enumeration
const ok = { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };

// In-memory rate limiter: max 3 magic link requests per email per 10 minutes
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 10 * 60 * 1000;

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count++;
  return false;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const { email, location } = JSON.parse(event.body || '{}');
  if (!email) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Email required' }) };

  const normalizedEmail = email.toLowerCase().trim();

  // Rate limit by email (always return ok to prevent enumeration)
  if (isRateLimited(normalizedEmail)) return ok;

  const supabase = getSupabaseAdmin();

  const { data: user } = await supabase
    .from('users')
    .select('id, tier')
    .eq('email', normalizedEmail)
    .single();

  if (!user || user.tier !== 'pro') return ok;

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const { error: insertError } = await supabase.from('magic_tokens').insert({
    user_id: user.id,
    token,
    expires_at: expiresAt,
  });

  if (insertError) {
    console.error('Magic token insert error:', insertError.message);
    return ok;
  }

  const locationParam = location ? `&location=${location}` : '';
  const magicUrl = `${origin}/magic?token=${token}${locationParam}`;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error: emailError } = await resend.emails.send({
    from: 'BayStats <hello@baystats.com>',
    to: email,
    subject: 'Your BayStats sign-in link',
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7f7f7;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:48px 16px;">
    <tr><td align="center">
      <table cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e0e0e0;border-radius:3px;padding:40px 32px;max-width:480px;width:100%;">
        <tr><td style="text-align:center;">
          <p style="font-size:12px;font-weight:700;color:#000;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 24px 0;">BAYSTATS</p>
          <h1 style="font-size:20px;font-weight:700;color:#000;text-transform:uppercase;letter-spacing:0.04em;margin:0 0 12px 0;">Your sign-in link</h1>
          <p style="font-size:13px;color:#555555;font-weight:500;margin:0 0 32px 0;line-height:1.6;">Click below to sign in to BayStats.<br>This link expires in 15 minutes.</p>
          <a href="${magicUrl}" style="display:inline-block;background:#000000;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:3px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Sign in to BayStats &rarr;</a>
        </td></tr>
        <tr><td style="border-top:1px solid #e0e0e0;padding-top:20px;text-align:center;margin-top:32px;">
          <p style="font-size:11px;color:#888888;text-transform:uppercase;letter-spacing:0.04em;margin:20px 0 0 0;">If you didn&rsquo;t request this, you can safely ignore it.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });

  if (emailError) console.error('Resend error:', emailError);

  return ok;
};
