// Creates or promotes the first admin account by email, using the
// Supabase service key. No password is created or stored: sign-in is by
// emailed magic link (netlify/functions/auth-magic-link.ts), and the admin
// check everywhere else in the app is by email against admin_users (see
// netlify/functions/admin-marinas.ts's verifyAdmin).
//
// Usage: ADMIN_EMAIL=you@example.com npx tsx scripts/create-admin.ts
// Requires VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY (see .env.example).
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();

if (!supabaseUrl || !serviceKey) {
  console.error('VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY are required.');
  process.exit(1);
}
if (!adminEmail) {
  console.error('ADMIN_EMAIL is required: the email address to make admin.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// password_hash is a vestigial NOT NULL column from the removed
// email/password sign-in system. Nothing reads it.
const NO_PASSWORD_AUTH = 'no_password_auth';

async function main() {
  const { data: existingUser } = await supabase
    .from('users')
    .select('id, email, tier')
    .eq('email', adminEmail)
    .maybeSingle();

  if (existingUser) {
    if (existingUser.tier !== 'pro') {
      const { error } = await supabase.from('users').update({ tier: 'pro' }).eq('id', existingUser.id);
      if (error) {
        console.error('Failed to update user tier:', error.message);
        process.exit(1);
      }
    }
  } else {
    const { error } = await supabase.from('users').insert({
      email: adminEmail,
      password_hash: NO_PASSWORD_AUTH,
      tier: 'pro',
    });
    if (error) {
      console.error('Failed to create user:', error.message);
      process.exit(1);
    }
  }

  const { error: adminError } = await supabase
    .from('admin_users')
    .upsert({ email: adminEmail, password_hash: NO_PASSWORD_AUTH }, { onConflict: 'email' });

  if (adminError) {
    console.error('Failed to add admin:', adminError.message);
    process.exit(1);
  }

  console.log(`${adminEmail} is now an admin. Sign in at /admin/login to get a magic link.`);
}

main();
