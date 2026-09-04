# PACKET_3_1: F003 LemonSqueezy Backend

## CRITICAL ARCHITECTURE NOTE
- LS webhook MUST be a NATIVE Express route (NOT wrapped in adapt())
- It uses express.raw() to capture raw body for HMAC-SHA256 signature verification
- Register it BEFORE the global express.json() middleware in server/index.ts
- Checkout and portal handlers use normal adapt() pattern
- Working dir: /home/dev/_prod/baystats.com, branch: feat/revenue-v2

## FILES TO CREATE/MODIFY
- netlify/functions/subscription-checkout.ts (CREATE)
- netlify/functions/subscription-portal.ts (CREATE)
- server/index.ts (MODIFY -- replace stub comments with real imports + routes)
- supabase/migrations/024_add_subscriptions.sql (CREATE)
- supabase/migrations/025_rename_stripe_to_ls.sql (CREATE)
- package.json (MODIFY -- install @lemonsqueezy/lemonsqueezy.js, uninstall stripe)

## ENV VARS (already in .env -- verified)
- LEMONSQUEEZY_API_KEY
- LEMONSQUEEZY_WEBHOOK_SECRET
- LEMONSQUEEZY_STORE_ID=291604
- LEMONSQUEEZY_VARIANT_MONTHLY=1344649
- LEMONSQUEEZY_VARIANT_ANNUAL=1344659
- SITE_URL=https://baystats.com

## DESIGN SPECIFICATION

### 1. Install LS SDK
```bash
cd /home/dev/_prod/baystats.com
npm install @lemonsqueezy/lemonsqueezy.js
npm uninstall stripe
```

### 2. Create supabase/migrations/024_add_subscriptions.sql
```sql
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  ls_subscription_id varchar(255) unique,
  ls_customer_id varchar(255) not null,
  ls_customer_portal_url text,
  plan_tier varchar(50) not null default 'monthly',
  status varchar(50) not null default 'active',
  current_period_end timestamp,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create index if not exists idx_subscriptions_ls_customer on subscriptions(ls_customer_id);
create index if not exists idx_subscriptions_user_id on subscriptions(user_id);
```

### 3. Create supabase/migrations/025_rename_stripe_to_ls.sql
```sql
-- Rename existing stripe_customer_id column on users table
-- Safe to run -- zero users in production (confirmed)
alter table users rename column stripe_customer_id to ls_customer_id;
```

NOTE: These SQL files are created locally but run manually in Supabase SQL editor. Creating the files is sufficient for this packet.

### 4. Create netlify/functions/subscription-checkout.ts
```typescript
import type { Handler, HandlerEvent } from '@netlify/functions';
import { lemonSqueezySetup, createCheckout } from '@lemonsqueezy/lemonsqueezy.js';

lemonSqueezySetup({ apiKey: process.env.LEMONSQUEEZY_API_KEY! });

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  const headers = { 'Content-Type': 'application/json' };

  try {
    const body = JSON.parse(event.body || '{}');
    const { plan, return_location } = body;

    if (!['monthly', 'annual'].includes(plan)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'INVALID_PLAN', message: "Plan must be 'monthly' or 'annual'" }) };
    }

    const variantId = plan === 'annual'
      ? process.env.LEMONSQUEEZY_VARIANT_ANNUAL!
      : process.env.LEMONSQUEEZY_VARIANT_MONTHLY!;

    const storeId = process.env.LEMONSQUEEZY_STORE_ID!;
    const siteUrl = process.env.SITE_URL || 'https://baystats.com';
    const returnLoc = return_location || 'rodney-bay';

    const { data: checkout, error } = await createCheckout(storeId, variantId, {
      checkoutData: {
        custom: { return_location: returnLoc },
      },
      productOptions: {
        redirectUrl: `${siteUrl}/subscribe/success?location=${returnLoc}`,
        receiptButtonText: 'Back to BayStats',
        receiptLinkUrl: siteUrl,
      },
    });

    if (error || !checkout) {
      throw new Error(error?.message || 'Checkout creation failed');
    }

    return { statusCode: 200, headers, body: JSON.stringify({ checkout_url: checkout.data.attributes.url }) };

  } catch (err) {
    console.error('LS checkout error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'PAYMENT_UNAVAILABLE', message: 'Payment service unavailable' }) };
  }
};
```

### 5. Create netlify/functions/subscription-portal.ts
```typescript
import type { Handler, HandlerEvent } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { verifyJwt } from '../../src/lib/auth';

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  const headers = { 'Content-Type': 'application/json' };

  const authResult = await verifyJwt(event.headers?.cookie || '');
  if ('error' in authResult) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'UNAUTHORIZED' }) };
  }

  const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('ls_customer_portal_url')
    .eq('user_id', authResult.user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!subscription?.ls_customer_portal_url) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'NO_SUBSCRIPTION', message: 'No billing account found' }) };
  }

  return { statusCode: 200, headers, body: JSON.stringify({ portal_url: subscription.ls_customer_portal_url }) };
};
```

### 6. Update server/index.ts
Read the file first. Find the PACKET_3_1 stub comment block (added by PACKET_0).
Replace those comments with real code:

IMPORTANT: The webhook route MUST be registered BEFORE app.use(express.json()).
The checkout and portal routes can go after express.json().

Add at the top (imports section):
```typescript
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { handler as subscriptionCheckoutHandler } from '../netlify/functions/subscription-checkout.js';
import { handler as subscriptionPortalHandler } from '../netlify/functions/subscription-portal.js';
```

Register webhook BEFORE express.json() (find where express.json() is registered and put this before it):
```typescript
app.post('/api/ls/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET!;
    const signature = req.headers['x-signature'] as string || '';
    const hmac = crypto.createHmac('sha256', secret);
    const digest = hmac.update(req.body).digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature))) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const payload = JSON.parse(req.body.toString());
    const eventName = payload.meta?.event_name;
    const attrs = payload.data?.attributes;
    const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

    try {
      if (eventName === 'subscription_created') {
        const email = attrs.user_email;
        const lsCustomerId = String(attrs.customer_id);
        const lsSubscriptionId = String(payload.data.id);
        const variantId = String(attrs.variant_id);
        const planTier = variantId === process.env.LEMONSQUEEZY_VARIANT_ANNUAL ? 'annual' : 'monthly';
        const portalUrl = attrs.urls?.customer_portal || null;
        const periodEnd = attrs.renews_at || null;

        const { data: user } = await supabase
          .from('users')
          .upsert({ email, tier: 'pro', ls_customer_id: lsCustomerId }, { onConflict: 'email' })
          .select('id')
          .single();

        if (user?.id) {
          await supabase.from('subscriptions').upsert({
            user_id: user.id,
            ls_subscription_id: lsSubscriptionId,
            ls_customer_id: lsCustomerId,
            ls_customer_portal_url: portalUrl,
            plan_tier: planTier,
            status: 'active',
            current_period_end: periodEnd,
          }, { onConflict: 'ls_subscription_id' });
        }
      }

      if (eventName === 'subscription_updated') {
        const lsCustomerId = String(attrs.customer_id);
        const status = attrs.status;
        const tier = ['active', 'on_trial'].includes(status) ? 'pro' : 'free';
        const portalUrl = attrs.urls?.customer_portal || null;
        const periodEnd = attrs.renews_at || null;

        await supabase.from('users').update({ tier }).eq('ls_customer_id', lsCustomerId);
        await supabase.from('subscriptions')
          .update({ status, ls_customer_portal_url: portalUrl, current_period_end: periodEnd, updated_at: new Date().toISOString() })
          .eq('ls_customer_id', lsCustomerId);
      }

      if (eventName === 'subscription_cancelled' || eventName === 'subscription_expired') {
        const lsCustomerId = String(attrs.customer_id);
        await supabase.from('users').update({ tier: 'free' }).eq('ls_customer_id', lsCustomerId);
        await supabase.from('subscriptions')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('ls_customer_id', lsCustomerId);
      }

    } catch (err) {
      console.error('LS webhook processing error:', err);
    }

    res.json({ received: true });
  }
);
```

Register checkout and portal AFTER express.json():
```typescript
app.all('/api/subscription/checkout', (req, res) => adapt(subscriptionCheckoutHandler, req, res));
app.all('/api/subscription/portal', (req, res) => adapt(subscriptionPortalHandler, req, res));
```

## ACCEPTANCE CRITERIA
- [ ] /api/subscription/checkout with plan=annual -> returns LemonSqueezy checkout URL
- [ ] /api/subscription/checkout with invalid plan -> returns 400 INVALID_PLAN
- [ ] /api/ls/webhook rejects invalid x-signature with 400
- [ ] supabase/migrations/024_add_subscriptions.sql created
- [ ] supabase/migrations/025_rename_stripe_to_ls.sql created
- [ ] npm run build passes with zero TypeScript errors
