# PACKET_0: Environment + Dev Setup

## CRITICAL ARCHITECTURE NOTE
- API functions live in `netlify/functions/*.ts` using `@netlify/functions` types
- `server/index.ts` wraps each with `adapt()` and registers as Express routes
- Dev server: Vite :5173 (frontend) + Express :3457 (API) run concurrently
- LS webhook EXCEPTION: native Express route (express.raw()), NOT wrapped in adapt()

## DESIGN SPECIFICATION

### 1. Fix package.json dev script
Current (broken): `"dev": "netlify dev"`
New: `"dev": "concurrently \"vite\" \"node --import tsx/esm server/index.ts\""`
Install if not present: `npm install --save-dev concurrently`

Check vite.config.ts: if no proxy config exists, add one:
```typescript
server: {
  proxy: {
    '/api': 'http://localhost:3457'
  }
}
```

### 2. Delete netlify.toml
Remove the file entirely. VPS deployment uses `npm run build` + PM2. No redirects needed.

### 3. Create src/lib/access.ts
```typescript
// Locations that are permanently free -- no login or subscription required.
export const FREE_LOCATION_SLUGS = ['rodney-bay', 'marigot-bay'] as const;

export function isFreeLocation(slug: string): boolean {
  return (FREE_LOCATION_SLUGS as readonly string[]).includes(slug);
}
```

### 4. Update .env.example
Add these lines (placeholder values only):
```
# LemonSqueezy (added for Revenue Activation v2)
LEMONSQUEEZY_API_KEY=<redacted>
LEMONSQUEEZY_WEBHOOK_SECRET=<redacted>
LEMONSQUEEZY_STORE_ID=...
LEMONSQUEEZY_VARIANT_MONTHLY=...
LEMONSQUEEZY_VARIANT_ANNUAL=...
SITE_URL=https://baystats.com
```

### 5. Add stub comments to server/index.ts
Add comment block where PACKET_3_1 will insert its routes:
```typescript
// PACKET_3_1 will add here:
// import { handler as subscriptionCheckoutHandler } from '../netlify/functions/subscription-checkout.js';
// import { handler as subscriptionPortalHandler } from '../netlify/functions/subscription-portal.js';
// app.all('/api/subscription/checkout', (req, res) => adapt(subscriptionCheckoutHandler, req, res));
// app.all('/api/subscription/portal',   (req, res) => adapt(subscriptionPortalHandler, req, res));
// app.post('/api/ls/webhook', express.raw({type:'application/json'}), lsWebhookHandler);
```

## ACCEPTANCE CRITERIA
- [ ] `npm run dev` starts Vite on :5173 AND Express on :3457 simultaneously
- [ ] `netlify.toml` does not exist in repo root
- [ ] `src/lib/access.ts` exports FREE_LOCATION_SLUGS and isFreeLocation()
- [ ] `.env.example` contains all 6 new LemonSqueezy/site env vars
- [ ] `npm run build` passes with zero TypeScript errors
