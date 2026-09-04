---
project: "BayStats Revenue Activation"
version: "1.0"
generated: "2026-02-25"
prd_source: "PRD_v1.0.md (LOCKED, validated 17/19)"
total_packets: 9
parallel_groups: 6
codex_available: false
codex_note: "First project -- no CODEX.md. Run /shawn-6-harvest after shipping."
vps_note: "Hosted on VPS via Express adapter. API functions live in netlify/functions/ but run via server/index.ts adapt() helper. LS webhook is native Express route (raw body required). Deploy: npm run build (frontend) + pm2 restart baystats-api (backend)."
status: "READY FOR EXECUTION"
---

# ALL PACKETS COMPLETE: BayStats Revenue Activation

---

## CRITICAL ARCHITECTURE NOTE (Read Before Every Packet)

This codebase migrated from Netlify to VPS self-hosting. The architecture:

- API functions: live in `netlify/functions/*.ts` using `@netlify/functions` types (Handler, HandlerEvent)
- Express adapter: `server/index.ts` wraps each function with `adapt()` helper and registers as Express routes
- Dev server: Vite on port 5173 (frontend) + Express on port 3457 (API) run concurrently
- PM2: manages the Express API process in production (`pm2 restart baystats-api`)
- LS webhook EXCEPTION: must be native Express route (express.raw() middleware) NOT wrapped in adapt()

When packets say "create API function in netlify/functions/X.ts" they ALSO mean "register it in server/index.ts".

Shared constant: `src/lib/access.ts` exports `FREE_LOCATION_SLUGS = ['rodney-bay', 'marigot-bay']`
Functions import it: `import { FREE_LOCATION_SLUGS } from '../../src/lib/access';`

---

## DEPENDENCY GRAPH

```
PARALLEL GROUP 1 (no deps -- run together):
  PACKET_0   Environment + Setup
  PACKET_1_1 F001 Location Bug Fix
      |           |
      v           v
PARALLEL GROUP 2 (after group 1 complete -- run together):
  PACKET_2_1 F002 Backend Gating   PACKET_2_2 F002 Frontend Paywall
    (deps: PACKET_0)                 (deps: PACKET_0, PACKET_1_1)
      |                                    |
      v                                    v
PARALLEL GROUP 3 (after group 2 complete -- run together):
  PACKET_3_1 F003 LemonSqueezy Backend    PACKET_3_2 F003 Subscribe Pages
    (deps: PACKET_2_1)                (deps: PACKET_2_2)
             |                              |
             +----------+------------------+
                        v
PARALLEL GROUP 4 (after group 3 complete):
  PACKET_4_1 F003+F004 Session + Account
    (deps: PACKET_3_1, PACKET_3_2)
                        |
                        v
[REVENUE GATE -- do not proceed until first paying subscriber confirmed]
                        |
                        v
PARALLEL GROUP 5 (DEFERRED):
  PACKET_5_1 F005 UI Theme Foundation
    (deps: PACKET_4_1)
                        |
                        v
PARALLEL GROUP 6 (DEFERRED):
  PACKET_5_2 F005 Data Cards + Paywall Redesign
    (deps: PACKET_5_1)
```

Critical path: PACKET_0 -> PACKET_2_1 -> PACKET_3_1 -> PACKET_4_1
Revenue gate at PACKET_4_1 completion before Phase 5-6.

---

## Atomic Unit Rule

Each packet is 100% pass or 0% done. No partial completions. All acceptance criteria must be checked before marking a packet complete. If a packet fails mid-execution, revert all changes from that packet and start fresh.

---

## Scope Creep Prevention

- PACKET_0: Only env setup, dev script, access.ts constant. No feature code.
- PACKET_1_1: Only the location bug fix. Do not add paywall logic here.
- PACKET_2_1: Only server-side gating on existing API functions. No new UI.
- PACKET_2_2: Only RegionalPaywallBanner and DashboardV2 gating logic. No LS payment code.
- PACKET_3_1: Only LS backend functions + DB migration. No UI pages.
- PACKET_3_2: Only Subscribe.tsx and SubscribeSuccess.tsx pages. No account page.
- PACKET_4_1: Only session-check extension + Account.tsx page. No redesign.
- PACKET_5_1: Only global theme tokens and layout. No individual card redesign.
- PACKET_5_2: Only individual card visual redesign. No new data sources.

---

## Ambiguity Resolution

If a packet spec conflicts with actual file state in the repo:
1. Read the actual file first
2. Apply the packet's intent (not literal spec) to the actual structure
3. Document the deviation in BUILD_LOG.md
4. Do not block -- make the reasonable call and move forward

If a packet spec mentions "Netlify Function" language, translate to VPS architecture (see Critical Architecture Note above).

---

## Integration Testing Strategy

After each parallel group completes:

GROUP 1 -> 2 gate: `npm run build` must pass with zero TypeScript errors. `npm run dev` must start both servers.

GROUP 2 -> 3 gate: Manual test -- select Martinique location without auth -> must see RegionalPaywallBanner. API call to /api/weather?location=le-marin without auth -> must return 402.

GROUP 3 -> 4 gate: LemonSqueezy webhook test (ngrok + LS test mode). Complete test checkout -> subscription_created webhook fires -> user.tier becomes 'pro'..

GROUP 4 -> REVENUE GATE: Full flow: free user -> selects Martinique -> paywall -> subscribe ($69/year) -> checkout -> success page -> dashboard shows Martinique data. Account page shows plan + billing date.

DEFERRED gates: PACKET_5_1 and PACKET_5_2 execute only after production confirms first paying subscriber.

---

## PACKET_0: Environment + Setup

```yaml
packet_id: PACKET_0
name: "Environment + Dev Setup"
feature: "Foundation"
phase: 1
parallel_group: 1
dependencies: []
estimated_effort: "30-45 min"
files_modified:
  - package.json
  - netlify.toml (DELETE)
  - src/lib/access.ts (CREATE)
  - .env.example (MODIFY)
  - server/index.ts (MODIFY -- add stub imports for new LS routes)
```

### CONTEXT

The dev script currently runs `netlify dev` which does not work on VPS. This must be fixed before any development work can proceed. Also need to: delete the now-irrelevant netlify.toml, create the shared access constant used by both backend and frontend, and register placeholder routes in server/index.ts for the new LS functions (so TypeScript doesn't error on missing imports in later packets). This packet has no feature code -- pure environment hygiene.

### DESIGN SPECIFICATION

**1. Fix package.json dev script**

Current (broken): `"dev": "netlify dev"`

New: `"dev": "concurrently \"vite\" \"node --import tsx/esm server/index.ts\""`

Install concurrently if not present: `npm install --save-dev concurrently`

The Vite dev server runs on port 5173. The Express API runs on port 3457 (see ecosystem.config.cjs). Both must run simultaneously for local development. Vite proxies are NOT used -- the frontend calls /api/* routes which nginx proxies in production; in dev, the Express server handles them directly on :3457 but the Vite dev server on :8888...

Actually: check how the frontend calls APIs in dev. If calls go to /api/* and there's no proxy, they'll hit Vite's dev server which won't know about them. Need to check if there's a Vite proxy config.

Check vite.config.ts: if no proxy, add one:
```typescript
server: {
  proxy: {
    '/api': 'http://localhost:3457'
  }
}
```

This ensures /api/* calls from the Vite dev frontend are forwarded to the Express server.

**2. Delete netlify.toml**

Remove the file entirely. It served Netlify's build/function configuration. VPS deployment uses `npm run build` (Vite) + PM2 for the Express server. No redirect rules needed -- nginx handles routing in production.

**3. Create src/lib/access.ts**

```typescript
// Locations that are permanently free -- no login or subscription required.
// St. Lucia free tier: sailors use BayStats in Rodney Bay, love it,
// then hit the paywall when they try to look up Martinique.
export const FREE_LOCATION_SLUGS = ['rodney-bay', 'marigot-bay'] as const;

export function isFreeLocation(slug: string): boolean {
  return (FREE_LOCATION_SLUGS as readonly string[]).includes(slug);
}
```

**4. Update .env.example**

Add the following to .env.example (no real values -- placeholder only):

```
# LemonSqueezy (added for Revenue Activation v2)
LEMONSQUEEZY_API_KEY=eyJ...
LEMONSQUEEZY_WEBHOOK_SECRET=...
LEMONSQUEEZY_STORE_ID=...
LEMONSQUEEZY_VARIANT_MONTHLY=...
LEMONSQUEEZY_VARIANT_ANNUAL=...
SITE_URL=https://baystats.com
```

SITE_URL is needed by the checkout function for redirect URLs.
Get from LS dashboard: Settings -> API (API key), Settings -> Webhooks (secret), store ID from store URL.

**5. Add stub comments to server/index.ts for new LS routes**

Do NOT add imports yet (the files don't exist). Add comment blocks showing where PACKET_3_1 will insert its routes:

```typescript
// PACKET_3_1 will add here:
// import { handler as subscriptionCheckoutHandler } from '../netlify/functions/subscription-checkout.js';
// import { handler as subscriptionPortalHandler } from '../netlify/functions/subscription-portal.js';
// app.all('/api/subscription/checkout', (req, res) => adapt(subscriptionCheckoutHandler, req, res));
// app.all('/api/subscription/portal',   (req, res) => adapt(subscriptionPortalHandler, req, res));
// app.post('/api/ls/webhook', express.raw({type: 'application/json'}), lsWebhookHandler);
```

### DATA REQUIREMENTS

No database changes. No new API contracts. Reads existing .env for validation.

Data dependencies: Assumes .env already has SUPABASE_SERVICE_KEY and VITE_SUPABASE_URL (confirmed present).

### TESTING PROCEDURE

1. Verify delete: `ls netlify.toml` -> "No such file or directory"
2. Verify dev script: `npm run dev` -> both Vite (:5173) and Express (:3457) start without errors
3. Verify access.ts: `npx tsx -e "import { FREE_LOCATION_SLUGS } from './src/lib/access.ts'; console.log(FREE_LOCATION_SLUGS)"` -> `['rodney-bay', 'marigot-bay']`
4. Verify TypeScript: `npm run build` -> zero errors
5. Regression: `curl http://localhost:3457/api/weather?location=rodney-bay` -> returns weather data (Express still works)

### ACCEPTANCE CRITERIA

- [ ] `npm run dev` starts Vite on :5173 AND Express on :3457 simultaneously
- [ ] `netlify.toml` does not exist in repo root
- [ ] `src/lib/access.ts` exports FREE_LOCATION_SLUGS and isFreeLocation()
- [ ] `.env.example` contains all 6 new LemonSqueezy/site env vars
- [ ] `npm run build` passes with zero TypeScript errors

---

## PACKET_1_1: F001 Location Switching Bug Fix

```yaml
packet_id: PACKET_1_1
name: "F001 Location Switching Bug Fix"
feature: "F001"
phase: 1
parallel_group: 1
dependencies: []
estimated_effort: "45-60 min"
files_modified:
  - src/pages/DashboardV2.tsx (MODIFY)
  - src/hooks/useBriefingData.ts (VERIFY + minor fix if needed)
```

### CONTEXT

When a user switches from Rodney Bay to any other location, the dashboard displays stale Rodney Bay data. This breaks trust with free users before they even hit the paywall -- they think the product is broken. Must be fixed first. Existing hooks already accept `location` as parameter and include it in dependency arrays with cache-busting (`_=${Date.now()}`). The most reliable fix is adding `key={selectedLocation}` to the dashboard root container, forcing React to fully unmount and remount all children on location change. This is the nuclear option but guarantees clean state.

### DESIGN SPECIFICATION

**1. Primary fix: Add key prop to DashboardV2 root container**

In `DashboardV2.tsx`, find the outermost JSX container returned by the component. Add `key={selectedLocation}`:

```tsx
return (
  <div key={selectedLocation} className="...existing classes...">
    {/* all existing dashboard content unchanged */}
  </div>
);
```

This forces React to treat each location as a completely different component tree. All hooks re-initialize with the new location. No stale data possible.

**2. Secondary fix: Add explicit data reset in each hook**

In `useBriefingData.ts`, each hook (useBriefingWeather, useBriefingClearance, etc.) should reset its data state when location changes, BEFORE fetching new data. Add a reset effect:

```typescript
// At the top of each useEffect that depends on [location]:
useEffect(() => {
  setData(null);  // or setWeatherData(null) -- match existing state var name
  setError(null);
  setLoading(true);
  // then fetch...
}, [location]);
```

Check each hook -- if they already reset state on location change, skip this. Only add if stale data is possible during the loading phase (i.e., the old data shows while new data loads).

**3. Verify loading state shows skeleton, not stale data**

When `loading` is true, all cards should show their loading skeleton. If any card renders its content while `loading` is true (showing previous location's data), add a guard:

```tsx
if (loading || !data) return <LoadingSkeleton />;
```

### DATA REQUIREMENTS

No database changes. No new API endpoints.

Data dependencies: Assumes all useBriefingX hooks accept `location: string` parameter (confirmed from code review -- they do). Assumes each card component has a loading state / skeleton.

### TESTING PROCEDURE

1. Start dev server: `npm run dev`
2. Open http://localhost:5173 -> default shows Rodney Bay
3. Note Rodney Bay marina phone: `+1-758-452-0324` (Rodney Bay Marina)
4. Switch to Marigot Bay -> verify phone changes to `+1-758-451-4974`
5. Switch to Le Marin (Martinique) -> verify weather coordinates reflect Martinique lat/lon
6. Switch rapidly between locations (click 3-4 times fast) -> no stale data flash
7. Regression: `npm run build` passes with zero errors

Specific AC test values from PRD:
- Rodney Bay berth count: 234
- Marigot Bay berth count: 40
- Switching between these two should show different values on every card

### ACCEPTANCE CRITERIA

- [ ] Switch Rodney Bay -> Marigot Bay: phone shows `+1-758-451-4974` (not Rodney Bay number)
- [ ] Switch Rodney Bay -> Marigot Bay: berth count shows 40 (not 234)
- [ ] Switch to any Martinique location: weather coordinates reflect Martinique lat/lon
- [ ] No hard page refresh required -- location change alone updates all cards
- [ ] Loading skeleton shows during fetch -- not previous location's data
- [ ] `npm run build` passes with zero TypeScript errors

---

## PACKET_2_1: F002 Backend Location Gating

```yaml
packet_id: PACKET_2_1
name: "F002 Backend Location Gating"
feature: "F002"
phase: 1
parallel_group: 2
dependencies: [PACKET_0]
estimated_effort: "60-90 min"
files_modified:
  - netlify/functions/weather.ts (MODIFY)
  - netlify/functions/clearance.ts (MODIFY)
  - netlify/functions/tides.ts (MODIFY)
  - netlify/functions/currents.ts (MODIFY)
  - netlify/functions/sunmoon.ts (MODIFY)
```

### CONTEXT

Five of the six data API functions need a location gating check at the top. If the requested location is in FREE_LOCATION_SLUGS -> proceed as normal (no auth needed). If not -> verify JWT from cookie, check user.tier = 'pro', reject with 402 if not. tropical.ts is NOT gated (it returns global Atlantic tropical data, no location param). This is the server-side enforcement layer -- the frontend gating in PACKET_2_2 is UX only; this is authoritative.

Data dependencies: Assumes `src/lib/access.ts` exists with FREE_LOCATION_SLUGS (created by PACKET_0). Assumes `src/lib/auth.ts` exports `verifyJwt` function (confirmed present in existing codebase).

### DESIGN SPECIFICATION

**Gating snippet -- add to top of each of the 5 handler functions:**

```typescript
import { FREE_LOCATION_SLUGS } from '../../src/lib/access';
import { verifyJwt } from '../../src/lib/auth';

// Inside the handler, after parsing location param:
const location = event.queryStringParameters?.location || 'rodney-bay';

if (!FREE_LOCATION_SLUGS.includes(location as typeof FREE_LOCATION_SLUGS[number])) {
  const authResult = await verifyJwt(event.headers?.cookie || '');
  if ('error' in authResult) {
    return {
      statusCode: 402,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'PRO_REQUIRED', message: 'Subscribe to access this location' })
    };
  }
  if (authResult.user?.tier !== 'pro') {
    return {
      statusCode: 402,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'PRO_REQUIRED', message: 'Subscribe to access this location' })
    };
  }
}
// else: free location or verified pro user -- proceed normally
```

**Apply to each file:**

`weather.ts`: location param from queryStringParameters.location
`clearance.ts`: location param from queryStringParameters.location
`tides.ts`: location param from queryStringParameters.location
`currents.ts`: location param from queryStringParameters.location
`sunmoon.ts`: location param from queryStringParameters.location

**Do NOT modify:** tropical.ts (global, no location param), vessels.ts (vessel counts are location-specific but free-tier display is fine for discovery), admin-marinas.ts, session-check.ts, auth functions.

**Import path note:** The functions are in `netlify/functions/` and access.ts is in `src/lib/`. Relative path is `../../src/lib/access`. Verify this resolves correctly -- if TypeScript path aliases are configured, use those instead.

**verifyJwt signature:** Read src/lib/auth.ts to confirm the exact function signature and return type. It likely returns `{ user: { id, email, tier } }` on success or `{ error: string }` on failure. Adapt the check accordingly.

### DATA REQUIREMENTS

No database changes. No new tables.

Data dependencies: Requires PACKET_0 complete (src/lib/access.ts must exist). Assumes verifyJwt reads JWT from httpOnly cookie string. Assumes users.tier column exists in Supabase (confirmed in PRD -- existing schema).

### TESTING PROCEDURE

1. Test free location (no auth): `curl "http://localhost:3457/api/weather?location=rodney-bay"` -> returns 200 with weather data
2. Test paid location (no auth): `curl "http://localhost:3457/api/weather?location=le-marin"` -> returns 402 `{"error":"PRO_REQUIRED"}`
3. Test paid location (with pro JWT): set cookie in curl -> returns 200 with data
4. Test all 5 functions: repeat steps 1-2 for clearance, tides, currents, sunmoon with le-marin
5. Test tropical is unaffected: `curl "http://localhost:3457/api/tropical"` -> still returns 200 regardless of auth
6. Regression: free locations still work for all 5 endpoints
7. `npm run build` -> zero TypeScript errors

### ACCEPTANCE CRITERIA

- [ ] /api/weather?location=rodney-bay -> 200 with no auth (free)
- [ ] /api/weather?location=le-marin -> 402 `{"error":"PRO_REQUIRED"}` with no auth
- [ ] Same 402 behavior for clearance, tides, currents, sunmoon with non-free location
- [ ] /api/tropical -> 200 regardless of auth or location (not gated)
- [ ] Pro user JWT + non-free location -> 200 with full data
- [ ] `npm run build` passes with zero TypeScript errors

---

## PACKET_2_2: F002 Frontend Paywall UI

```yaml
packet_id: PACKET_2_2
name: "F002 Frontend Paywall UI"
feature: "F002"
phase: 1
parallel_group: 2
dependencies: [PACKET_0, PACKET_1_1]
estimated_effort: "90-120 min"
files_modified:
  - src/components/session/RegionalPaywallBanner.tsx (CREATE)
  - src/pages/DashboardV2.tsx (MODIFY -- add location gating logic)
  - src/components/session/PaywallModal.tsx (MODIFY -- patch /upgrade -> /subscribe)
  - src/components/session/UpgradeBanner.tsx (MODIFY -- patch /upgrade -> /subscribe)
```

### CONTEXT

This is the conversion moment. When a free user selects Martinique or Grenada, they see RegionalPaywallBanner instead of data cards. The banner is the UX layer -- server-side enforcement is PACKET_2_1. The banner must make the value proposition immediately clear: "you know this product works (you've used it in St. Lucia), here's what you're unlocking, here's the price." Do not make it feel like a wall -- make it feel like an invitation.

Data dependencies: Assumes PACKET_1_1 complete (DashboardV2.tsx location bug fixed -- we're modifying it again here). Assumes PACKET_0 complete (src/lib/access.ts exports FREE_LOCATION_SLUGS and isFreeLocation). Assumes useSession hook returns `{ tier }` field (confirms from existing session-check which already returns tier).

### DESIGN SPECIFICATION

**1. Create src/components/session/RegionalPaywallBanner.tsx**

Props:
```typescript
interface RegionalPaywallBannerProps {
  locationName: string;   // e.g., "Le Marin"
  locationRegion: string; // e.g., "Martinique"
  isAuthenticated: boolean; // show "sign in" vs "subscribe" variant
}
```

Layout: Full-width card replacing all 7 data cards. Single column, centered, max-width 640px, vertically centered in the dashboard area.

Content:
- Flag emoji + location name as heading: "Unlock [locationName], [locationRegion]"
- Subheading: "Get real-time conditions for [locationName] and all other Caribbean marinas"
- Two buttons, stacked vertically:
  - Primary (large): "Subscribe -- $9/month" -> navigate to `/subscribe?plan=monthly&location=[slug]`
  - Secondary (outlined): "Save 36% -- $69/year" -> navigate to `/subscribe?plan=annual&location=[slug]`
- Fine print below buttons: "Cancel anytime. No contracts."
- Divider line
- Footer: "Already subscribed? [Sign in ->]" -> navigate to `/login`
- If `isAuthenticated` is true (logged in but free tier): change footer to "Upgrade your plan [->]" -> navigate to `/subscribe`

Styling: Use existing Tailwind classes. Dark card with subtle border. Primary button uses existing accent color. No new design system -- match existing dashboard card aesthetic.

**2. Update DashboardV2.tsx -- add location gating logic**

After the existing location state and hook calls, add gating check:

```tsx
import { isFreeLocation } from '../lib/access';
import { useSession } from '../hooks/useSession';
import { RegionalPaywallBanner } from '../components/session/RegionalPaywallBanner';

// In component:
const { session } = useSession(); // existing hook
const isPro = session?.tier === 'pro';
const isGated = !isFreeLocation(selectedLocation) && !isPro;

// In JSX, before rendering data cards:
if (isGated) {
  const locationConfig = getLocationOrDefault(selectedLocation);
  return (
    <div key={selectedLocation} className="...existing wrapper...">
      {/* Keep location selector at top so user can switch back */}
      {/* location dropdown / search here -- existing code */}
      <RegionalPaywallBanner
        locationName={locationConfig.name}
        locationRegion={locationConfig.region || ''}
        isAuthenticated={!!session}
      />
    </div>
  );
}
// else: render existing dashboard cards normally
```

Note: The `key={selectedLocation}` from PACKET_1_1 should still be on the outermost div.

**3. Patch /upgrade links in PaywallModal.tsx and UpgradeBanner.tsx**

Search both files for `/upgrade` and replace with `/subscribe`. These components may not be actively triggered anymore (the session-based flow is being deprecated) but should not have broken links.

### DATA REQUIREMENTS

No database changes. No new API endpoints.

Data dependencies: Requires `isFreeLocation` from src/lib/access.ts (PACKET_0). Requires useSession hook returning `tier` field (existing). Requires locationConfig to include a `region` field or similar -- check locations.ts structure and adapt if needed.

### TESTING PROCEDURE

1. Open dashboard at localhost:5173 (no auth)
2. Default location Rodney Bay -> all 7 cards render normally (free)
3. Switch to Marigot Bay -> all 7 cards render normally (free)
4. Switch to Le Marin -> RegionalPaywallBanner shows with "Le Marin, Martinique"
5. Verify banner shows both plan options ($9/month and $69/year)
6. Click "Already subscribed? Sign in" -> navigates to /login
7. Log in as a Pro user -> switch to Le Marin -> data cards render (no banner)
8. Free user: switch to a Grenada location -> banner shows
9. Regression: Rodney Bay + Marigot Bay still load all data normally
10. `npm run build` -> zero TypeScript errors

### ACCEPTANCE CRITERIA

- [ ] Rodney Bay and Marigot Bay load fully without any login or cookie
- [ ] Selecting any Martinique or Grenada location shows RegionalPaywallBanner for unauthenticated users
- [ ] Banner shows correct location name populated from locationConfig
- [ ] Banner has both $9/month and $69/year options
- [ ] Pro subscribers access all 27 locations without any paywall banner
- [ ] Any /upgrade links in PaywallModal.tsx and UpgradeBanner.tsx patched to /subscribe
- [ ] Location selector remains visible on paywall screen (user can switch back to free location)
- [ ] `npm run build` passes with zero TypeScript errors

---

## PACKET_3_1: F003 LemonSqueezy Backend

```yaml
packet_id: PACKET_3_1
name: "F003 LemonSqueezy Backend"
feature: "F003"
phase: 2
parallel_group: 3
dependencies: [PACKET_2_1]
estimated_effort: "120-180 min"
files_modified:
  - netlify/functions/subscription-checkout.ts (CREATE)
  - netlify/functions/subscription-portal.ts (CREATE)
  - server/index.ts (MODIFY -- checkout + portal via adapt(), webhook as native route)
  - supabase/migrations/024_add_subscriptions.sql (CREATE)
  - supabase/migrations/025_rename_stripe_to_ls.sql (CREATE)
  - package.json (MODIFY -- install @lemonsqueezy/lemonsqueezy.js, remove stripe)
```

### CONTEXT

Wire LemonSqueezy to the "Subscribe" button. Three new API functions: checkout (creates LS checkout URL), webhook (handles subscription lifecycle events), portal (returns LS customer portal URL from stored subscription data). Critical architectural note: the webhook handler MUST be a native Express route (not wrapped in adapt()) because LemonSqueezy signature verification requires the raw request body. express.raw() captures it. If you use adapt(), the body gets JSON-parsed and HMAC verification fails.

LemonSqueezy SDK: install `@lemonsqueezy/lemonsqueezy.js`. Remove `stripe` package (no longer needed).
Env vars required before testing: LEMONSQUEEZY_API_KEY, LEMONSQUEEZY_WEBHOOK_SECRET, LEMONSQUEEZY_STORE_ID, LEMONSQUEEZY_VARIANT_MONTHLY, LEMONSQUEEZY_VARIANT_ANNUAL.

Data dependencies: Requires PACKET_0 (env vars, server/index.ts stubs). Requires PACKET_2_1 (gating confirmed). Requires subscriptions table -- run both migrations as part of this packet.

### DESIGN SPECIFICATION

**1. Install LemonSqueezy SDK + remove Stripe**

```bash
npm install @lemonsqueezy/lemonsqueezy.js
npm uninstall stripe
```

**2. Create supabase/migrations/024_add_subscriptions.sql**

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

Note: `ls_customer_portal_url` stores the portal URL from the webhook payload so we don't need to call the LS API each time.

**3. Create supabase/migrations/025_rename_stripe_to_ls.sql**

```sql
-- Rename existing stripe_customer_id column on users table
-- Safe to run -- zero users in production (confirmed)
alter table users rename column stripe_customer_id to ls_customer_id;
```

Run both migrations via Supabase SQL editor in order: 024 first, then 025.

**4. Create netlify/functions/subscription-checkout.ts**

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

Register in server/index.ts with adapt():
```typescript
import { handler as subscriptionCheckoutHandler } from '../netlify/functions/subscription-checkout.js';
app.all('/api/subscription/checkout', (req, res) => adapt(subscriptionCheckoutHandler, req, res));
```

**5. Create netlify/functions/subscription-portal.ts**

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

Register in server/index.ts with adapt():
```typescript
import { handler as subscriptionPortalHandler } from '../netlify/functions/subscription-portal.js';
app.all('/api/subscription/portal', (req, res) => adapt(subscriptionPortalHandler, req, res));
```

**6. Add LemonSqueezy webhook as NATIVE Express route in server/index.ts**

Register BEFORE the global express.json() middleware:

```typescript
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

app.post('/api/ls/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    // Verify signature
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

        // Upsert user: create if new, set tier='pro'
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
        const status = attrs.status; // 'active', 'paused', 'past_due', 'unpaid', 'cancelled', 'expired'
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
      // Log but return 200 -- never 400/500 for processing errors (prevents retry storm)
      console.error('LS webhook processing error:', err);
    }

    res.json({ received: true });
  }
);
```

**7. Update PACKET_0 stub comment in server/index.ts**

The stub comment from PACKET_0 referenced Stripe -- already updated above. Update it to reference LS routes:
```typescript
// PACKET_3_1 will add here:
// import { handler as subscriptionCheckoutHandler } from '../netlify/functions/subscription-checkout.js';
// import { handler as subscriptionPortalHandler } from '../netlify/functions/subscription-portal.js';
// app.all('/api/subscription/checkout', (req, res) => adapt(subscriptionCheckoutHandler, req, res));
// app.all('/api/subscription/portal',   (req, res) => adapt(subscriptionPortalHandler, req, res));
// app.post('/api/ls/webhook', express.raw({type:'application/json'}), lsWebhookHandler);
```

### DATA REQUIREMENTS

New table: subscriptions with ls_customer_portal_url column (run 024).
Rename: users.stripe_customer_id -> users.ls_customer_id (run 025).
Modifies: users.tier, users.ls_customer_id.
Inserts into: subscriptions table.

Data dependencies: Assumes users table exists with email, tier, ls_customer_id columns. Assumes LEMONSQUEEZY_VARIANT_ANNUAL env var is set correctly to distinguish plan_tier.

### TESTING PROCEDURE

1. Run migrations 024 then 025 in Supabase SQL editor (in order)
2. `npm install @lemonsqueezy/lemonsqueezy.js && npm uninstall stripe`
3. Add LS credentials to .env (API key from LS dashboard -> Settings -> API)
4. `npm run dev`
5. Test checkout: `curl -X POST http://localhost:3457/api/subscription/checkout -H "Content-Type: application/json" -d '{"plan":"annual","return_location":"le-marin"}'` -> returns `{"checkout_url":"https://baystats.lemonsqueezy.com/..."}`
6. Test invalid plan: plan=weekly -> 400 INVALID_PLAN
7. Webhook test: happens against production URL (https://baystats.com/api/ls/webhook). Deploy feat/revenue-v2 to production first, then complete a test checkout.
8. Complete a test checkout in LS test mode -> webhook fires -> verify user.tier='pro' in Supabase
9. Cancel subscription via LS dashboard -> subscription_cancelled webhook -> user.tier='free'
10. Invalid signature: POST /api/ls/webhook with wrong x-signature -> 400
11. `npm run build` -> zero errors

### ACCEPTANCE CRITERIA

- [ ] /api/subscription/checkout with plan=annual -> returns LemonSqueezy checkout URL
- [ ] /api/subscription/checkout with invalid plan -> returns 400 INVALID_PLAN
- [ ] LS webhook subscription_created -> Supabase user.tier='pro' + subscription row created
- [ ] LS webhook subscription_cancelled -> Supabase user.tier='free'
- [ ] /api/ls/webhook rejects invalid x-signature with 400
- [ ] /api/subscription/portal with valid JWT -> returns ls_customer_portal_url
- [ ] subscriptions table exists with ls_customer_portal_url populated after webhook
- [ ] users.ls_customer_id column exists (renamed from stripe_customer_id)
- [ ] npm run build passes with zero TypeScript errors

---

## PACKET_3_2: F003 Subscribe Pages

```yaml
packet_id: PACKET_3_2
name: "F003 Subscribe Pages"
feature: "F003"
phase: 2
parallel_group: 3
dependencies: [PACKET_2_2]
estimated_effort: "90-120 min"
files_modified:
  - src/pages/Subscribe.tsx (CREATE)
  - src/pages/SubscribeSuccess.tsx (CREATE)
  - src/App.tsx (MODIFY -- add /subscribe and /subscribe/success routes)
```

### CONTEXT

The Subscribe page is the last step before LemonSqueezy Checkout. User arrives from RegionalPaywallBanner. Annual $69 is selected by default (confirmed user decision). User clicks Continue -> POST /api/subscription/checkout -> redirect to LemonSqueezy. After checkout, /subscribe/success polls for tier upgrade then sends user back to dashboard with their original location.

Data dependencies: Requires PACKET_2_2 (RegionalPaywallBanner links to /subscribe). PACKET_3_1 and PACKET_3_2 are in the same parallel group -- build the UI independently, full integration test after both complete.

### DESIGN SPECIFICATION

**1. src/pages/Subscribe.tsx**

URL params: ?plan=annual|monthly (pre-select), ?location=le-marin (return after checkout)

State: selectedPlan defaults to 'annual' (user decision confirmed).

Two plan cards:
- Annual: "$69 / year" + "Save 36%" badge + "Most Popular" badge -- default selected
- Monthly: "$9 / month"

Selected card shows highlighted border (ring-2 ring-accent or similar).

Continue button calls POST /api/subscription/checkout, receives checkout_url, sets window.location.href to it.

On API error: inline error message "Payment service unavailable. Please try again."

Footer: "Already subscribed? Sign in ->" -> /login
Fine print: "Cancel anytime. No contracts. Secure payment via LemonSqueezy."

**2. src/pages/SubscribeSuccess.tsx**

URL params: ?session_id=cs_..., ?location=le-marin

Immediate display: "You're in! Welcome to BayStats Pro."

Poll GET /api/session/check every 3 seconds, max 10 attempts (30 seconds):
- If tier === 'pro': navigate to /?location={returnLocation}
- After 10 attempts: show "Your access is being activated..." + "Go to Dashboard" button

**3. src/App.tsx routes**

Add:
```tsx
<Route path="/subscribe" element={<Subscribe />} />
<Route path="/subscribe/success" element={<SubscribeSuccess />} />
```

### DATA REQUIREMENTS

No database changes. Calls existing /api/subscription/checkout and /api/session/check.

### TESTING PROCEDURE

1. /subscribe -> Annual selected by default
2. Click Monthly card -> Monthly selected, Annual deselected
3. Click "Continue with Annual" -> navigates to LemonSqueezy Checkout URL
4. /subscribe?plan=monthly -> Monthly pre-selected
5. /subscribe/success -> shows success message, polls session-check
6. Manually set user.tier='pro' in Supabase -> /subscribe/success detects and redirects to dashboard
7. 30s timeout case: success page shows "activating" message + manual button
8. npm run build -> zero errors

### ACCEPTANCE CRITERIA

- [ ] /subscribe shows Annual ($69) selected by default
- [ ] /subscribe shows Monthly ($9) as alternate option
- [ ] Selecting Monthly plan deselects Annual
- [ ] Continue button calls /api/subscription/checkout and redirects to LemonSqueezy URL
- [ ] /subscribe/success polls for tier='pro' and redirects to dashboard on success
- [ ] Timeout (30s): "activating" message + manual dashboard button shown
- [ ] npm run build passes with zero TypeScript errors

---

## PACKET_4_1: F003+F004 Session Extension + Account Page

```yaml
packet_id: PACKET_4_1
name: "F003+F004 Session Extension + Account Page"
feature: "F003, F004"
phase: 2
parallel_group: 4
dependencies: [PACKET_3_1, PACKET_3_2]
estimated_effort: "90-120 min"
high_fan_in_note: "Depends on PACKET_3_1 (subscription data) and PACKET_3_2 (subscribe route for redirects). Both must complete before this packet starts."
files_modified:
  - netlify/functions/session-check.ts (MODIFY -- add subscription fields to response)
  - src/hooks/useSession.ts (MODIFY -- consume new session-check fields)
  - src/pages/Account.tsx (CREATE)
  - src/App.tsx (MODIFY -- add /account route)
```

### CONTEXT

Extend session-check to return subscription data, then build Account.tsx to display it. Pro subscriber self-service: see their plan, click "Manage Billing" -> LemonSqueezy Customer Portal handles everything. Zero support tickets. Free users hitting /account get redirected to /subscribe. This completes the full revenue loop: subscribe -> access -> manage billing -> cancel if needed -> downgraded automatically by webhook.

Data dependencies: subscriptions table exists (PACKET_3_1). subscribe route exists for redirect (PACKET_3_2). ProtectedRoute.tsx exists (confirmed in codebase).

### DESIGN SPECIFICATION

**1. Extend netlify/functions/session-check.ts**

After the existing user lookup, query the subscriptions table:

```typescript
const { data: subscription } = await supabase
  .from('subscriptions')
  .select('status, current_period_end, ls_customer_id, plan_tier')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false })
  .limit(1)
  .single();
```

Add to existing response body (do not remove any existing fields):
```json
{
  "subscription_status": "active|canceled|past_due|null",
  "current_period_end": "2027-02-18T00:00:00Z|null",
  "ls_customer_id": "cus_...|null",
  "plan_tier": "monthly|annual|null"
}
```

**2. Update src/hooks/useSession.ts**

Extend the session state type and response mapping to include new fields. Read the actual file first -- match its current pattern.

**3. Create src/pages/Account.tsx**

Guards:
- Not authenticated -> redirect to /login
- tier === 'free' -> redirect to /subscribe

Layout: max-width 480px, centered, single column.

Plan Card:
- "BayStats Pro" heading
- Green "Active" badge if subscription_status='active', red "Canceled" if canceled
- Plan: "Annual -- $69/year" or "Monthly -- $9/month" from plan_tier
- "Renews [date]" -- format current_period_end as "February 18, 2027"
- "Manage Billing ->" button: POST /api/subscription/portal -> window.location.href to portal_url
- If canceled: "Reactivate" button -> /subscribe

Access Card:
- "You have access to all 27 marina locations"
- "<- Back to Dashboard" link -> /

Sign Out:
- Clear auth cookies (match existing logout pattern from Login.tsx or auth hooks)
- Redirect to /

Pro badge in header:
- Find the existing header/nav in DashboardV2.tsx
- If session.tier === 'pro': show "Pro" badge + "Account" link -> /account

**4. Update src/App.tsx**

Add: `<Route path="/account" element={<Account />} />`

### DATA REQUIREMENTS

No new tables. Reads subscriptions table (PACKET_3_1). Updates no data.

### TESTING PROCEDURE

1. Log in as Pro user (or manually set tier='pro' in Supabase)
2. /account -> plan card shows with correct type and renewal date
3. "Manage Billing" -> LemonSqueezy Customer Portal opens
4. Sign out -> cookies cleared -> / (free dashboard)
5. Log in as free user -> /account -> redirected to /subscribe
6. Unauthenticated -> /account -> redirected to /login
7. curl /api/session/check with Pro JWT -> response includes subscription_status, current_period_end, plan_tier
8. npm run build -> zero errors

### ACCEPTANCE CRITERIA

- [ ] /account shows correct plan name and next billing date for Pro users
- [ ] "Manage Billing" opens LemonSqueezy Customer Portal
- [ ] Free tier users at /account are redirected to /subscribe
- [ ] Unauthenticated users at /account are redirected to /login
- [ ] Sign out clears cookies and returns user to homepage
- [ ] session-check response includes subscription_status, current_period_end, plan_tier
- [ ] Pro badge visible in dashboard header for Pro users with Account link
- [ ] npm run build passes with zero TypeScript errors

---

## PACKET_5_1: F005 UI Theme Foundation (DEFERRED)

```yaml
packet_id: PACKET_5_1
name: "F005 UI Theme Foundation"
feature: "F005"
phase: 4
parallel_group: 5
dependencies: [PACKET_4_1]
status: "DEFERRED"
gate: "Revenue Gate: at least 1 paying subscriber confirmed in production before executing"
estimated_effort: "120-180 min"
files_modified:
  - tailwind.config.js (MODIFY)
  - src/index.css (MODIFY)
  - src/pages/DashboardV2.tsx (MODIFY -- layout grid)
  - index.html (MODIFY -- Barlow Condensed font)
```

### CONTEXT

Dark maritime theme: deep navy (#0a1628) background, card elevation with glow, Barlow Condensed for key numbers. This packet sets global tokens only -- PACKET_5_2 redesigns individual cards using these tokens. Do not execute until first paying subscriber is in production.

### DESIGN SPECIFICATION

Tailwind theme extension: maritime color palette (bg, surface, border, accent, success, warning, muted). Font family: Barlow Condensed (data values). Google Fonts import in index.html. Body background #0a1628. Dashboard grid: 1-col mobile, 2-col tablet. Location switch: CSS transition on content area.

### ACCEPTANCE CRITERIA (DEFERRED)

- [ ] Dark maritime theme applied -- no white backgrounds on dashboard
- [ ] Barlow Condensed font loaded and used for data values
- [ ] 1-col mobile, 2-col tablet grid
- [ ] npm run build passes with zero TypeScript errors

---

## PACKET_5_2: F005 Data Cards + Paywall Redesign (DEFERRED)

```yaml
packet_id: PACKET_5_2
name: "F005 Data Cards + Paywall Redesign"
feature: "F005"
phase: 4
parallel_group: 6
dependencies: [PACKET_5_1]
status: "DEFERRED"
gate: "Revenue Gate: PACKET_5_1 complete AND first subscriber confirmed"
estimated_effort: "240-360 min"
files_modified:
  - src/components/briefing/WeatherBriefingCard.tsx (MODIFY)
  - src/components/briefing/TidesCard.tsx (MODIFY)
  - src/components/briefing/CurrentsCard.tsx (MODIFY)
  - src/components/briefing/ClearanceBriefingCard.tsx (MODIFY)
  - src/components/briefing/SunMoonCard.tsx (MODIFY)
  - src/components/session/RegionalPaywallBanner.tsx (MODIFY)
  - src/components/briefing/MarinaBriefingCard.tsx (MODIFY)
```

### CONTEXT

Instrument-panel card redesign: wind gauge (SVG), tide sparkline chart, color-coded current speed, prominent clearance status badge, horizon arc for sun/moon. RegionalPaywallBanner gets a blurred data preview behind the subscribe prompt -- paywall feels like an invitation, not a wall.

### ACCEPTANCE CRITERIA (DEFERRED)

- [ ] Wind speed shown as SVG gauge, not plain text
- [ ] Tides shown as sparkline curve, not just high/low times
- [ ] RegionalPaywallBanner shows blurred-but-visible marina data preview
- [ ] Lighthouse mobile score >= 85
- [ ] Pro subscribers see no functional regression
- [ ] npm run build passes with zero TypeScript errors

---

## CODEX INTEGRATION SUMMARY

No CODEX.md available -- this is the first project using this workflow.
Run /shawn-6-harvest after PACKET_4_1 ships and first subscriber confirmed.

Key patterns to harvest:
- Express adapter pattern (netlify/functions + server/index.ts adapt())
- LS webhook native Express route (raw body + HMAC-SHA256 signature verification)
- Location-gating pattern (server-side 402 + frontend banner)
- React key={location} remount for stale data prevention
