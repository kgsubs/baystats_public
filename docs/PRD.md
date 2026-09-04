---
prd_metadata:
  version: "1.0"
  created_date: "2026-02-18"
  project_name: "BayStats — Revenue Activation"
  author: "Claude Sonnet 4.6 (based on live codebase audit)"
  status: "LOCKED — v1.0"

constraints:
  revenue_target: "$1,000+/month MRR"
  budget: "<$100/month infrastructure"
  timeline: "2 weeks to first paying customer"
  team_size: "1 (solo, AI-assisted)"
  tech_stack: "React 19, Vite 7, Tailwind 4, Netlify Functions, Supabase, Stripe (already installed)"
  already_built:
    - "Custom JWT auth (register/login/refresh) — Netlify Functions"
    - "users table with tier ('free'|'pro') + stripe_customer_id field"
    - "PaywallModal, SessionBadge, UpgradeBanner components"
    - "All 6 API endpoints (weather, clearance, tides, currents, tropical, sunmoon)"
    - "27 marina locations: 6 St. Lucia, 12 Martinique, 7 Grenada"
    - "DashboardV2 with all 7 briefing cards"
    - "Admin marinas panel"
    - "Centralized locations.ts registry"
  not_built:
    - "Stripe checkout + subscription webhooks (stripe installed, not wired)"
    - "Location-based paywall (currently session-based, needs to be location-based)"
    - "Account/billing management page"
    - "Location switching bug fix"

codex_note: "First project — no CODEX.md. Run /shawn-6-harvest after shipping."
---

# PRD: BayStats Revenue Activation

---

## The Strategy in One Paragraph

BayStats is live with a real product and 27 marina locations. The free tier currently requires registration and gives 3 sessions/month — friction that kills conversion before it starts. The fix: make St. Lucia (Rodney Bay + Marigot Bay) **permanently free with zero login**, showing every card at full quality. Sailors use it in St. Lucia, love it, then try to look up their next stop (Martinique, Grenada) and hit a clean upgrade prompt. That's the conversion moment. Wire Stripe to that moment and we have revenue. Everything else — partner portal, passage briefings — comes after first dollar.

---

## Section 1: Executive Summary

### Problem Statement
BayStats has a live product that sailors genuinely need. The only thing standing between the product and revenue is: (1) a session-based free tier that confuses users with registration friction, (2) no Stripe checkout wired to the upgrade prompt, and (3) a location switching bug that degrades trust. Fix these three things and the revenue model activates.

### Free Tier Strategy: Location-Gated, Not Session-Gated

**Current (broken):** Free users must register → get 3 sessions/month → confusing, feels like a trial, not a product.

**New (correct):**
- **Free forever, no login:** Rodney Bay + Marigot Bay (St. Lucia) — full experience, all 7 cards, real-time data
- **Pro ($9/month or $69/year):** Unlock all other marinas (Martinique, Grenada, and every future region)

Why this works for sailors: They arrive in St. Lucia, find BayStats (or someone shows them), use it daily with zero friction. When they're ready to sail to Martinique and switch locations, they see: "Unlock Martinique and 25 other marinas — $9/month." They already know the product is good. Conversion is easy.

### Target Users
- **B2C:** Liveaboard cruisers actively sailing the Caribbean (35-70, mix of early retirees and remote workers)
- **Conversion trigger:** Moving between islands — the exact moment they switch locations in the app

### Success Criteria
- Week 2: Stripe checkout live, first subscriber
- Month 1: 10 paying subscribers (~$90 MRR)
- Month 3: 60 monthly + 18 annual subscribers (~$665 MRR)
- Month 4: $1,000+ MRR (100 monthly + 30 annual)
- Month 6: $1,400+ MRR from subscriptions + first marina partner revenue

---

## Section 2: User Stories

### Primary: Sailor converts from free to Pro

**User:** Captain anchored in Rodney Bay, planning passage to Martinique
**Current behavior:** Opens BayStats, checks Rodney Bay conditions (free, no login)
**Conversion moment:** Selects Le Marin (Martinique) from location dropdown
**Our flow:** Paywall banner appears — "Unlock Martinique + 25 other marinas. $9/month." → clicks Subscribe → Stripe Checkout → email/password register → payment → immediate access to Le Marin data
**No call. No friction. Immediate value.**

### Secondary: Pro subscriber manages billing

**User:** Existing Pro subscriber wants to cancel or update card
**Flow:** `/account` page → "Manage Billing" → Stripe Customer Portal → self-serve
**Zero customer support required.**

### Edge Cases
- Sailor already has an account (prior session-based free user) → existing account upgrades via Stripe, no new registration
- Sailor subscribes then sails to a marina not yet in BayStats → see "Coming Soon" state for unknown slugs, all existing 27 locations still accessible
- Payment fails → Stripe handles retry logic, user stays on free tier until payment succeeds

---

## Section 3: Features & Requirements

---

#### F001: Location Switching Bug Fix

**Description:** When a user switches from Rodney Bay to Marigot Bay (or any other location), the UI displays stale Rodney Bay data. This is a data propagation bug in React state/hooks. Must be fixed before launch — it breaks trust with free users before they ever hit the paywall.

**Root cause (per CLAUDE_HANDOFF.md):** The `useBriefingData` hooks likely have a caching issue — either React Query stale data, a `useCallback`/`useMemo` not re-running on location change, or a stale closure. The APIs return correct data; the frontend is not consuming it.

**Fix approach:**
1. In `src/hooks/useBriefingData.ts`: ensure every hook has `location` as a dependency and forces a fresh fetch on change (no stale cache)
2. In `src/pages/DashboardV2.tsx`: verify `selectedLocation` state change triggers complete re-fetch, not just re-render with cached data
3. Add explicit `key={selectedLocation}` to the root dashboard container to force full remount on location change as a guaranteed fallback
4. Test: switch from Rodney Bay → Marigot Bay → verify phone number changes from `+1-758-452-0324` to `+1-758-451-4974`

**UI Components:** No new components — fix existing `useBriefingData.ts` hooks and `DashboardV2.tsx`

**Data Flow:**
1. User selects new location from dropdown → `setSelectedLocation(newSlug)`
2. All `useBriefingX(location)` hooks detect location change → clear cached data → fetch fresh data from API
3. All 7 cards re-render with new location's data

**Validation Rules:**
- Every `useBriefingX` hook must accept `location: string` as parameter and include it in dependency arrays
- No hook should return data from a previous location during the loading state

**Error States:**
- Fetch fails for new location → show loading skeleton then error state, not stale data from previous location

**Acceptance criteria:**
- [ ] Switch Rodney Bay → Marigot Bay: phone shows `+1-758-451-4974` (not Rodney Bay's number)
- [ ] Switch Rodney Bay → Marigot Bay: berth count shows 40 (not 234)
- [ ] Switch to any Martinique location: weather coordinates reflect Martinique lat/lon
- [ ] No hard page refresh required — works on location change alone
- [ ] Loading state shows skeleton, not previous location's data

**Dependencies:** None — fix first

**Phase:** Phase 1 (Foundation)

---

#### F002: Location-Based Access Gating

**Description:** Replace the current session-based free tier (3 sessions/month, requires registration) with a location-based free tier (St. Lucia always free, no login required; all other marinas require Pro subscription). This is the core freemium mechanic.

**Free locations (hardcoded constant, never behind paywall):**
```typescript
const FREE_LOCATION_SLUGS = ['rodney-bay', 'marigot-bay'];
```

**Gating logic — Netlify Functions (server-side):**
Each API function (`weather.ts`, `clearance.ts`, `tides.ts`, `currents.ts`, `sunmoon.ts`) gets a gating check at the top:
```typescript
const location = event.queryStringParameters?.location || 'rodney-bay';
const FREE_LOCATIONS = ['rodney-bay', 'marigot-bay'];

if (!FREE_LOCATIONS.includes(location)) {
  // Check auth cookie → verify JWT → check users.tier = 'pro'
  const authResult = await verifyJwt(event.headers.cookie);
  if ('error' in authResult || authResult.user.tier !== 'pro') {
    return { statusCode: 402, body: JSON.stringify({ error: 'PRO_REQUIRED' }) };
  }
}
// else: proceed normally
```

**Note:** `tropical.ts` is global (no location param) — no gating needed.

**Frontend gating — `DashboardV2.tsx`:**
When user selects a non-free location:
- If no auth session OR user is free tier → show `RegionalPaywallBanner` instead of data cards
- If user is Pro → fetch and display normally

**UI Components:**
- `RegionalPaywallBanner.tsx` — replaces `PaywallModal.tsx` (which was session-focused)
  - Full-width card, replaces all 7 data cards
  - Heading: "Unlock [Location Name]"
  - Subheading: "Get real-time conditions for [Location] and [N] other Caribbean marinas"
  - Two buttons stacked: "Subscribe — $9/month" (primary) + "Save with Annual — $69/year" (secondary)
  - Fine print: "Cancel anytime. No contracts."
  - Already have an account? "Sign in →" link
  - Location preview: show the marina name, region flag emoji, and "weather, tides, clearance, and more" text to reinforce what they're unlocking

**Data Flow:**
1. User selects `le-marin` from dropdown
2. `DashboardV2.tsx` checks: is `le-marin` in FREE_LOCATIONS? → No
3. Check `useSession()` hook: authenticated + pro? → No
4. Render `RegionalPaywallBanner` with location name populated
5. User clicks "Subscribe" → navigates to `/subscribe?location=le-marin` (remembers desired location)
6. After subscription complete → redirect back to dashboard with `le-marin` selected → data loads

**Validation Rules:**
- `FREE_LOCATION_SLUGS` defined once in `src/config/access.ts`, imported by both frontend and referenced in Netlify functions (shared constant)
- Server-side check is authoritative — frontend check is UX only

**Error States:**
- API returns 402 for non-free location + no auth → frontend shows `RegionalPaywallBanner` (matches)
- API returns 402 + user is authenticated but free tier → banner shows "Upgrade your plan" variant
- Unknown location slug → return 404, frontend shows "Location not found" state

**Acceptance criteria:**
- [ ] Rodney Bay and Marigot Bay load fully without any login or cookie
- [ ] Selecting any Martinique or Grenada location shows `RegionalPaywallBanner` for unauthenticated users
- [ ] Pro subscribers can access all 27 locations without any paywall
- [ ] API returns 402 for non-free locations when request has no valid JWT or free-tier JWT
- [ ] `RegionalPaywallBanner` shows the correct marina name for the selected location
- [ ] Existing session-based `PaywallModal` and `session-start` / `session-check` functions are deprecated (can leave in codebase, just not triggered)
- [ ] Any existing `/upgrade` links patched to `/subscribe`

**Dependencies:** F001

**Phase:** Phase 1 (Foundation)

---

#### F003: Stripe Subscription Checkout + Webhooks

**Description:** Wire Stripe to the "Subscribe" button. User clicks → Stripe Checkout opens → they pay → webhook updates `users.tier = 'pro'` → immediate access to all marinas. Stripe is already installed (`stripe@20.3.1` in `package.json`). `users.stripe_customer_id` field already exists in schema.

**Stripe products to create (one-time manual setup in Stripe Dashboard):**
```
Product: "BayStats Pro"
  Price 1: $9.00 USD / month recurring  → env: STRIPE_PRICE_MONTHLY
  Price 2: $69.00 USD / year recurring   → env: STRIPE_PRICE_ANNUAL
```

**New Netlify Functions:**

`netlify/functions/subscription-checkout.ts`
```
POST /.netlify/functions/subscription-checkout
Auth: None required (user registers during Stripe Checkout flow)
Body: { plan: 'monthly' | 'annual', return_location?: string }
Behavior:
  - Create Stripe Checkout Session with:
    - mode: 'subscription'
    - line_items: [{ price: STRIPE_PRICE_MONTHLY or STRIPE_PRICE_ANNUAL }]
    - success_url: `${SITE_URL}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`
    - cancel_url: `${SITE_URL}/?location=${return_location}`
    - allow_promotion_codes: true
    - customer_email: (from cookie if logged in, else let Stripe collect)
  - Return { checkout_url: string }
Response: { checkout_url: string }
Errors:
  [400]: Invalid plan value
  [500]: Stripe API error
```

`netlify/functions/subscription-webhook.ts`
```
POST /.netlify/functions/subscription-webhook
Auth: Stripe-Signature header (verified with STRIPE_WEBHOOK_SECRET)
Events handled:
  checkout.session.completed:
    - Get customer email from session
    - Upsert user in Supabase users table (create if doesn't exist, set tier='pro')
    - Store stripe_customer_id on user record
    - Store stripe_subscription_id in new subscriptions table (migration 024)

  customer.subscription.updated:
    - If status = 'active' → ensure tier='pro'
    - If status = 'past_due' → keep tier='pro' (grace period)
    - If status = 'canceled' or 'unpaid' → set tier='free'

  customer.subscription.deleted:
    - Set users.tier = 'free' for matching stripe_customer_id

Response: { received: true }
Errors:
  [400]: Invalid Stripe signature → reject, do not process
```

`netlify/functions/subscription-portal.ts`
```
POST /.netlify/functions/subscription-portal
Auth: JWT cookie (must be pro user)
Body: {}
Behavior: Create Stripe Billing Portal session for user's stripe_customer_id
Response: { portal_url: string }
Errors:
  [401]: Not authenticated
  [404]: No stripe_customer_id on user record
  [500]: Stripe error
```

**New database migration (`supabase/migrations/024_add_subscriptions.sql`):**
```sql
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  stripe_subscription_id varchar(255) unique,
  stripe_customer_id varchar(255) not null,
  plan_tier varchar(50) not null default 'monthly',
  -- plan_tier: 'monthly' ($9/mo) or 'annual' ($69/yr)
  status varchar(50) not null default 'active',
  -- status: 'active', 'canceled', 'past_due', 'unpaid'
  current_period_end timestamp,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create index idx_subscriptions_stripe_customer on subscriptions(stripe_customer_id);
create index idx_subscriptions_user_id on subscriptions(user_id);
```

**`/subscribe` page (new route):**
- Simple page at `/subscribe`
- Two plan option cards: Annual ($69, "Most Popular" badge — default selected) and Monthly ($9)
- "Continue" button per card → calls `subscription-checkout` function → redirects to Stripe Checkout
- "Already subscribed? Sign in →" link

**`/subscribe/success` page (new route):**
- Shown after Stripe Checkout completes
- "You're in! Welcome to BayStats Pro."
- "Back to Dashboard →" button (with `?location=` preserved from original session)

**Frontend: Add sign-in for returning subscribers**
- The existing `Login.tsx` page remains — Pro subscribers use it to access their account
- After login: `useSession()` hook reads `tier` from auth response → if 'pro', all locations unlock automatically
- Header: when logged in as Pro, show small "Pro" badge + user email dropdown with "Account" and "Sign Out"

**Validation Rules:**
- Webhook: `stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)` — reject if fails
- `plan` param: must be exactly 'monthly' or 'annual'
- Stripe Checkout handles all payment field validation

**Error States:**
- Stripe Checkout creation fails → return `{ error: 'Payment unavailable' }`, show toast on frontend
- Webhook processing fails → log error, return 200 to Stripe (prevent retry storm), alert via console
- User completes Stripe Checkout but webhook delayed → `/subscribe/success` page polls `GET /api/auth/me` every 3 seconds for up to 30 seconds waiting for tier to become 'pro', then shows "Your access is being activated..."

**Acceptance criteria:**
- [ ] Clicking "Subscribe $9/month" from `RegionalPaywallBanner` opens Stripe Checkout
- [ ] Completing Stripe Checkout creates/updates Supabase user with `tier='pro'`
- [ ] Pro user refreshes dashboard → all 27 marina locations accessible immediately
- [ ] `customer.subscription.deleted` webhook sets `tier='free'` within 60 seconds
- [ ] Stripe Customer Portal accessible from account page for self-serve cancellation
- [ ] Webhook rejects requests with invalid `stripe-signature` (returns 400)
- [ ] Annual plan shows correct $69/year in Stripe Checkout

**Dependencies:** F001, F002

**Phase:** Phase 2 (Core)

---

#### F004: Account & Billing Page

**Description:** A minimal `/account` page for Pro subscribers to see their plan and manage billing. Zero customer support required — all billing is self-serve via Stripe Customer Portal.

**UI Components:**
- Route: `/account` — redirect to `/login` if not authenticated
- Layout: single column, max-width 480px, centered, mobile-first
- **Plan Card:**
  - "BayStats Pro" heading + green "Active" badge (or red "Canceled" badge)
  - Plan type: "Monthly — $9/month" or "Annual — $69/year"
  - Next billing date: "Renews February 18, 2027"
  - "Manage Billing →" button (opens Stripe Customer Portal in same tab)
  - If canceled: "Reactivate" button → new Stripe Checkout
- **Access Card:**
  - "You have access to all [N] marina locations"
  - Link: "← Back to Dashboard"
- **Danger Zone:**
  - "Sign Out" link (clears JWT cookie, redirects to homepage)

**Data Flow:**
1. User navigates to `/account` → `ProtectedRoute` checks auth (existing `ProtectedRoute.tsx`)
2. `GET /.netlify/functions/session-check` → returns `{ tier, stripe_customer_id, subscription_status }`
   (extend existing session-check to return these fields from Supabase)
3. "Manage Billing" click → `POST /.netlify/functions/subscription-portal` → get portal URL → redirect
4. Sign Out → delete `sb-access-token` and `sb-refresh-token` cookies → redirect to `/`

**Validation Rules:**
- `/account` requires valid JWT (existing `ProtectedRoute.tsx` handles this)
- If user is `tier='free'`, redirect to `/subscribe` instead of showing account page

**Error States:**
- Stripe Portal creation fails → show "Billing temporarily unavailable" inline message, not toast
- Session check fails → show loading skeleton for 5 seconds then "Unable to load account, try refreshing"

**Acceptance criteria:**
- [ ] `/account` shows correct plan name and next billing date
- [ ] "Manage Billing" opens Stripe Customer Portal
- [ ] Canceling via Stripe Portal → webhook fires → next time user loads `/account` they see "Canceled" badge
- [ ] Free-tier users accessing `/account` are redirected to `/subscribe`
- [ ] Sign out clears cookies and returns user to homepage (dashboard shows free tier)

**Dependencies:** F002, F003

**Phase:** Phase 2 (Core)

---

#### F005: UI/UX Redesign — PredictWind-Inspired Polish

**Description:** After all revenue infrastructure is live and the first paying subscribers are in, redesign the visual layer to be genuinely delightful — the kind of interface sailors show people at the dock. Inspired by PredictWind's dark maritime aesthetic: animated data, gauge-style displays, strong typography, and an overall feel of "this was built by someone who sails." The product is already differentiated (marina-specific, Caribbean-focused, clearance + tides + weather in one place) — the redesign makes the UI match the quality of the underlying data.

**Design direction (PredictWind reference points):**
- Dark background (#0a1628 deep navy, not black) — readable in bright Caribbean sunlight on a phone screen
- Data presented as visual instruments, not plain text: wind speed as a gauge, tide as a curve chart, swell as an animated waveform
- Card elevation with subtle glow/shadow — each briefing card feels like a physical instrument panel
- Bold, condensed typography for key numbers (wind speed, tide height, temp) — scannable at a glance from the cockpit
- Smooth transitions between locations — location switch feels like panning a chart, not a page reload
- Micro-animations: tide curve drawing in on load, wind direction indicator rotating to bearing
- Mobile-first gesture interactions: swipe between cards, pull-to-refresh with a wave animation

**Scope of changes:**
- Global: Tailwind theme tokens — replace current palette with maritime dark theme
- All 7 briefing cards: redesign each card layout for instrument-panel feel
- Location selector: upgrade from dropdown to a region map or horizontal pill scroll
- Dashboard layout: responsive grid that works beautifully on phone (portrait) and tablet (landscape)
- `RegionalPaywallBanner`: redesign to feel premium, not like a wall — show a blurred/locked preview of the marina data behind it
- Loading states: replace skeletons with wave/tide animations that feel on-brand
- Typography: introduce a condensed display font for key numbers (e.g., Barlow Condensed or DM Mono for data values)

**What this is NOT:**
- Not a full re-architecture — same React components, same API calls, same data
- Not a new feature — purely visual and interaction layer
- Not a rebrand — BayStats name, domain, and positioning stay the same

**Acceptance criteria:**
- [ ] Dark maritime theme applied globally — no white backgrounds on main dashboard
- [ ] Wind speed and direction displayed as visual gauge (SVG or CSS), not plain "12kt NE" text
- [ ] Tide data shown as a curve chart (mini sparkline), not just high/low times
- [ ] Location switch has a smooth animated transition (no flash/jump)
- [ ] Lighthouse mobile score ≥ 85 after redesign (performance preserved)
- [ ] Tested on iPhone 13 and Android mid-range in direct sunlight — all text readable
- [ ] `RegionalPaywallBanner` shows blurred-but-visible preview of locked marina data
- [ ] Existing Pro subscribers see no functional regression — all data still accessible

**Dependencies:** F001, F002, F003, F004 (all revenue infrastructure must be live first)

**Phase:** Phase 4 (Polish — after first revenue confirmed)

---

### Explicitly Out of Scope (Revenue Activation MVP)

- **Partner Portal (B2B marina managers):** High value but not needed for first dollar. Build after reaching 20 paid subscribers. Adding it now splits focus.
- **Passage Briefing (Claude API):** Same — valuable upsell but adds Claude API complexity. Build in Phase 2 post-revenue.
- **Additional marina regions (BVI, Bahamas, Antigua):** Data work can happen in parallel but doesn't block revenue activation. Each new region added is instantly monetized by the existing gating.
- **Email/drip marketing automation:** Manual community seeding is the channel for first 50 subscribers. Automate after PMF is confirmed.
- **Mobile app (iOS/Android):** PWA is sufficient. App Store approval cycles would delay launch by weeks.

---

## Section 4: Technical Architecture

### Tech Stack (confirmed from codebase audit)

```yaml
frontend:
  framework: "React 19.2.4"
  bundler: "Vite 7.3.1"
  styling: "Tailwind CSS 4.1.18"
  routing: "React Router DOM 7.13.0"
  state: "React hooks (useState, useEffect, useCallback) — no React Query installed"
  auth_client: "Custom JWT via httpOnly cookies (existing src/lib/auth.ts)"

backend:
  runtime: "Netlify Functions (Node.js 18+, serverless)"
  language: "TypeScript 5.9.3"
  framework: "Netlify Functions handlers (not Express)"
  existing_functions:
    - "auth-login.ts, auth-register.ts, auth-refresh.ts"
    - "session-check.ts, session-start.ts"
    - "weather.ts, clearance.ts, tides.ts, currents.ts, tropical.ts, sunmoon.ts"
    - "admin-marinas.ts, admin-vessel-count.ts, vessels.ts"
  new_functions:
    - "subscription-checkout.ts"
    - "subscription-webhook.ts"
    - "subscription-portal.ts"

database:
  service: "Supabase (PostgreSQL 15+)"
  existing_tables:
    - "users (id, email, password_hash, tier, stripe_customer_id, created_at)"
    - "sessions (id, user_id, session_start, session_end)"
    - "marina_profiles (slug, name, phone, website, amenities, customs_hours_structured, ...)"
    - "vessel_counts (location, count, recorded_at)"
  new_tables:
    - "subscriptions (024_add_subscriptions.sql)"

hosting:
  platform: "Netlify (keep — existing architecture fully built for it)"
  cdn: "Netlify CDN (automatic)"
  functions: "Netlify Functions (serverless, auto-scaled)"

integrations:
  - name: "Stripe"
    purpose: "Subscription billing ($9/mo, $69/yr) + Customer Portal"
    sdk: "stripe@20.3.1 (already installed)"
    new_env_vars:
      - "STRIPE_SECRET_KEY"
      - "STRIPE_WEBHOOK_SECRET"
      - "STRIPE_PRICE_MONTHLY"
      - "STRIPE_PRICE_ANNUAL"

  - name: "Supabase"
    purpose: "Database — users, subscriptions, marina data"
    sdk: "@supabase/supabase-js@2.95.3 (already installed)"
    existing_env_vars:
      - "VITE_SUPABASE_URL (existing)"
      - "SUPABASE_SERVICE_KEY (existing)"
```

---

### File Structure (changes only — existing files preserved)

```
baystats/
+-- src/
|   +-- config/
|   |   +-- locations.ts              (existing — 27 marinas defined)
|   |   +-- access.ts                 (NEW — FREE_LOCATION_SLUGS constant)
|   +-- components/
|   |   +-- session/
|   |   |   +-- PaywallModal.tsx      (existing — deprecate, keep in place)
|   |   |   +-- RegionalPaywallBanner.tsx  (NEW — F002 location-gated paywall)
|   |   |   +-- SessionBadge.tsx      (existing — keep for Pro badge display)
|   |   |   +-- UpgradeBanner.tsx     (existing — repurpose or deprecate)
|   +-- pages/
|   |   +-- DashboardV2.tsx           (existing — modify for F001 bug fix + F002 gating)
|   |   +-- Subscribe.tsx             (NEW — F003 plan selection page)
|   |   +-- SubscribeSuccess.tsx      (NEW — F003 post-checkout success page)
|   |   +-- Account.tsx               (NEW — F004 billing management)
|   |   +-- Login.tsx                 (existing — keep, used by returning Pro subscribers)
|   +-- hooks/
|   |   +-- useBriefingData.ts        (existing — fix location dependency in F001)
|   |   +-- useSession.ts             (existing — extend to return tier + subscription data)
+-- netlify/
|   +-- functions/
|   |   +-- subscription-checkout.ts  (NEW — F003)
|   |   +-- subscription-webhook.ts   (NEW — F003)
|   |   +-- subscription-portal.ts    (NEW — F004)
|   |   +-- session-check.ts          (existing — extend to return tier + stripe fields)
|   |   +-- weather.ts                (existing — add location gating, F002)
|   |   +-- clearance.ts              (existing — add location gating, F002)
|   |   +-- tides.ts                  (existing — add location gating, F002)
|   |   +-- currents.ts               (existing — add location gating, F002)
|   |   +-- sunmoon.ts                (existing — add location gating, F002)
+-- supabase/
|   +-- migrations/
|   |   +-- 024_add_subscriptions.sql (NEW — F003)
+-- netlify.toml                      (existing — add webhook function redirect)
+-- .env.example                      (existing — add new Stripe env vars)
```

---

### New API Endpoints (full spec)

```
POST /.netlify/functions/subscription-checkout
Auth: Optional (JWT cookie if already logged in — not required)
Body: {
  plan: "monthly" | "annual",
  return_location?: string  (slug to return to after checkout, e.g. "le-marin")
}
Response: {
  checkout_url: string  (Stripe Checkout hosted URL)
}
Errors:
  [400]: { error: "INVALID_PLAN", message: "Plan must be 'monthly' or 'annual'" }
  [500]: { error: "PAYMENT_UNAVAILABLE", message: "Payment service unavailable, try again" }

---

POST /.netlify/functions/subscription-webhook
Auth: stripe-signature header (STRIPE_WEBHOOK_SECRET)
Body: Raw Stripe event payload (do NOT parse body before signature verification)
Events handled:
  checkout.session.completed:
    - Extract customer_email from session.customer_details.email
    - Upsert users: { email, tier: 'pro', stripe_customer_id: session.customer }
    - Insert subscriptions: { user_id, stripe_subscription_id, stripe_customer_id, plan_tier, status: 'active' }
  customer.subscription.updated:
    - Match stripe_customer_id → update subscriptions.status + users.tier accordingly
    - 'active' or 'trialing' → tier='pro'
    - 'past_due' → tier='pro' (grace period, Stripe retries payment)
    - 'canceled' or 'unpaid' → tier='free'
  customer.subscription.deleted:
    - Match stripe_customer_id → set users.tier='free', subscriptions.status='canceled'
Response: { received: true }  (always return 200 for valid signature, even if processing fails)
Errors:
  [400]: Invalid stripe-signature (only error that returns non-200)

---

POST /.netlify/functions/subscription-portal
Auth: JWT cookie (required — must be authenticated)
Body: {}
Response: { portal_url: string }  (Stripe Billing Portal URL, valid for 5 minutes)
Errors:
  [401]: { error: "UNAUTHORIZED" }
  [404]: { error: "NO_SUBSCRIPTION", message: "No billing account found" }
  [500]: { error: "PORTAL_UNAVAILABLE" }

---

Modified: GET /.netlify/functions/session-check (existing)
Change: Return additional fields for Pro subscribers
New response fields added:
  subscription_status?: "active" | "canceled" | "past_due" | null
  current_period_end?: string (ISO timestamp) | null
  stripe_customer_id?: string | null
Existing fields preserved: tier, session_active, unlimited

---

Modified: GET /.netlify/functions/weather?location={slug} (existing)
Change: Add location gating at top of handler
New behavior:
  - if slug in FREE_LOCATIONS → proceed as before (no auth check)
  - if slug NOT in FREE_LOCATIONS → verifyJwt(cookie) → check tier='pro' → if not, return:
    { statusCode: 402, body: { error: 'PRO_REQUIRED', location: slug } }
Same change applied to: clearance, tides, currents, sunmoon (NOT tropical — global)
```

---

### Gating Middleware (shared function, added to 5 API files)

```typescript
// src/lib/access.ts — shared between frontend and functions
export const FREE_LOCATION_SLUGS = ['rodney-bay', 'marigot-bay'];

// In each gated Netlify function (weather.ts, clearance.ts, tides.ts, currents.ts, sunmoon.ts):
// Add at top of handler, after parsing location param:
import { FREE_LOCATION_SLUGS } from '../../src/lib/access';
import { verifyJwt } from '../../src/lib/auth';

if (!FREE_LOCATION_SLUGS.includes(location)) {
  const authResult = await verifyJwt(event.headers.cookie);
  if ('error' in authResult) {
    return { statusCode: 402, headers, body: JSON.stringify({ error: 'PRO_REQUIRED' }) };
  }
  if (authResult.user.tier !== 'pro') {
    return { statusCode: 402, headers, body: JSON.stringify({ error: 'PRO_REQUIRED' }) };
  }
}
```

---

### State Management

**Auth state (existing `useSession` hook — extended):**
- Reads JWT from cookie via `GET /.netlify/functions/session-check`
- Returns: `{ tier, session_active, unlimited, subscription_status, current_period_end }`
- Stored in: React `useState` in `useSession` hook
- Updated by: login, logout, Stripe Checkout success (poll for tier change)

**Location state (existing in `DashboardV2.tsx`):**
- `const [selectedLocation, setSelectedLocation] = useState('rodney-bay')`
- When location changes: all `useBriefingX(selectedLocation)` hooks re-fetch
- If new location is gated + user is free → render `RegionalPaywallBanner` instead of fetching

**No new global state management library needed** — existing pattern is sufficient for this scope.

---

### Error Handling Pattern

**API error format (consistent with existing patterns):**
```json
{ "error": "ERROR_CODE", "message": "Human-readable message" }
```

**Frontend handling:**
- `402 PRO_REQUIRED` → render `RegionalPaywallBanner` (not a toast — full UI replacement)
- `401 UNAUTHORIZED` → `RegionalPaywallBanner` with "Sign in" variant
- `500` → show error card in place of data card ("Data temporarily unavailable — try refreshing")
- Network error → existing offline handling preserved

**Stripe webhook failures:** Log to console, return 200 to Stripe (never return 400/500 for processing failures — only for invalid signatures). This prevents Stripe from retrying indefinitely.

---

### Architecture Decisions

**Decision: Keep Netlify Functions (not migrate to Express/Railway)**
- Why: Entire existing codebase is Netlify Functions. All 13 existing functions work. Migrating would break everything. Zero reason to change.
- Trade-offs: Cold starts on infrequently-called functions (~200-500ms). Acceptable for this traffic level.

**Decision: Location-gated free tier (not session-based)**
- Why: Session-based requires registration before any value delivery. Sailors won't register for an unknown product. Location-gating lets them experience the full product (St. Lucia) before hitting a paywall. Conversion at the moment they need the next island = highest intent.
- Trade-offs: Slightly smaller addressable free tier (2 marinas not unlimited). Acceptable — St. Lucia is the origin and the strongest demo.

**Decision: Stripe Checkout (hosted) not custom payment UI**
- Why: PCI compliance, Apple Pay/Google Pay support, handles SCA for EU customers, mobile-optimized. Sailor audience uses phones. One weekend to implement vs weeks for custom form.
- Trade-offs: Stripe branding visible on checkout page. Stripe fee: 2.9% + $0.30/transaction. Acceptable.

**Decision: No Clerk — keep existing custom auth**
- Why: Custom JWT auth is fully built and working. Replacing it with Clerk would require migrating all 13 Netlify functions, the auth library, and user data. Weeks of work for zero user-visible improvement.
- Trade-offs: Custom auth has less polish (no magic links, no social login). Acceptable at this stage — sailors are fine with email/password.

---

## Section 5: Revenue & Business Model

### Revenue Model
- **Stream 1 (primary):** Sailor subscriptions — $9/month or $69/year
- **Stream 2 (Phase 2):** Marina partner listings — $149/month per marina
- **Stream 3 (Phase 2):** Passage briefings — $12 one-time per route

### Pricing Rationale
- $9/month: "Less than a bottle of rum a month" — impulse-buy territory, under the $10 psychological barrier
- $69/year: ~36% saving vs monthly ($108/yr); framing: "less than one marina berth for a full year of coverage"
- Both prices are well below existing sailing tools (Navionics $29.99/year, PredictWind $12/month for routing-only)

### Path to $1,000 MRR
| Timeline | Subscribers (monthly) | Subscribers (annual) | MRR |
|----------|-----------------------|----------------------|-----|
| Week 2   | 3                     | 0                    | $27 |
| Month 1  | 10                    | 2                    | $103 |
| Month 2  | 25                    | 8                    | $281 |
| Month 3  | 60                    | 18                   | $665 |
| Month 4  | 100                   | 30                   | $1,108 |
| Month 5  | 130                   | 40                   | $1,443 |

*Annual subscriptions counted at $5.75/month equivalent in MRR ($69/12)*

### Unit Economics
- CAC (organic): ~$0 (community seeding)
- LTV (monthly, 9-month sailing season): $81
- LTV (annual, 2 renewal cycles): $158
- Gross margin: ~94% (Netlify free tier, Supabase free tier, Stripe 2.9% + $0.30/transaction)

---

## Section 6: Go-To-Market Strategy

### The Unfair Advantage

You are not marketing to sailors. You ARE a sailor. You live on a boat in the same anchorages, listen to the same morning nets, and solve the same problems your customers have. No VC-backed startup can fake this. No marketing agency can buy it. Use it aggressively.

A sailor who learned about BayStats from another sailor in the anchorage will convert at 10x the rate of someone who clicked an ad. Your primary marketing channel is your own authentic presence in the cruising community.

---

### Channel Map (Research-Validated)

| Channel | Audience | Engagement | Promotion Rules | Cost | Priority |
|---|---|---|---|---|---|
| **VHF Radio Nets** | 50–150 boats/session | High (active cruisers) | Business announcements allowed | $0 | **Week 1** |
| **Cruisers Forum** | 127K+ Caribbean posts | High (threaded discussion) | Vendor program exists | $0 | **Week 1** |
| **Facebook Groups** | Varies (1K–10K+/group) | High (daily active) | Community-first, soft promo OK | $0 | **Week 1** |
| **Noonsite.com** | 30K active / 60K monthly | Exceptional (50–60% email open) | Has advertising section | $Low | **Month 2** |
| **Caribbean Compass** | Thousands of high-income cruisers | High (30+ yr publication) | Advertising-funded, open to sponsors | $Medium | **Month 3** |
| **SSCA** | 8,000 cruisers, 2K boats | High (membership-based) | SSCA Partners sponsorship program | $Medium | **Month 3** |
| **Marina cold email** | Marina managers (17 targets) | Unknown | N/A | $0 | **Month 1** |
| **YouTube (mid-tier)** | 50K–187K per channel | High (loyal audience) | Sponsorship-receptive at mid-tier | $Medium | **Month 4+** |

---

### The 1-Hour/Day Weekly Schedule

This schedule is designed around realistic boat life — morning nets, intermittent connectivity, and anchoring in different spots weekly.

```
MONDAY — 15 min: Community listening
  - Check Cruisers Forum > Atlantic & the Caribbean subforum for new threads
  - Check Facebook: Eastern Caribbean Cruisers' Discussions
  - Read only — understand what people are asking about weather, marinas, passages
  - Note: any question BayStats could answer = future content or reply opportunity

TUESDAY — 15 min: One useful reply
  - Find one thread where someone asked about St. Lucia, Martinique, or Grenada
  - Reply with genuinely useful info — mention BayStats only if it directly answers their question
  - Signature: "s/v [boatname] — baystats.com for real-time Caribbean marina briefings"
  - Do NOT post "Hey everyone, check out my app." That gets ignored. Answer the question first.

WEDNESDAY — 15 min: Marina manager outreach (1 email/week)
  - Pick one marina from the list below
  - Send the templated email (personalized — 2 minutes of research per marina)
  - Log it in a spreadsheet: marina name, date sent, replied Y/N

THURSDAY — 10 min: Metrics check
  - Supabase: SELECT COUNT(*) FROM users WHERE tier='pro' — track weekly delta
  - Netlify logs: which location params are hitting 402 most → demand signal for next region
  - Stripe dashboard: MRR, new subscribers, churn

FRIDAY — 5 min: One authentic social post (optional)
  - Share a real cruising moment + mention you built BayStats for situations like this
  - Example: "Anchored in Marigot Bay. Checked BayStats before the squall — cloud cover, 12kt gusts predicted, port tack. Used it. Didn't drag."
  - This is not marketing copy. It's a logbook entry that happens to mention the product.

WEEKEND — once per month: Content asset (45 min)
  - Write one genuinely useful piece of content sailors will share
  - See "Content Assets" section below
  - Post everywhere on Monday
```

---

### VHF Radio Nets — Most Authentic Channel

You can announce BayStats on the morning net yourself. No middleman. No ad spend. 50–150 active cruisers in the anchorage listening. They will tell their friends.

**The nets (confirmed schedules):**

| Net | Schedule | Channel | Coverage |
|---|---|---|---|
| **St. Lucia Cruisers Net** | Mon/Wed/Fri at 08:30 AST | VHF 8 | Rodney Bay, Marigot Bay, island-wide |
| **Martinique Cruisers Net** | Mon/Wed/Fri at 08:30 AST | VHF 8 | Le Marin, St. Anne, Fort-de-France |
| **Grenada Cruiser's Net** | Mon–Sat at 07:30 AST | VHF 66 (backup: 69) | All of Grenada + Carriacou, via mountaintop repeater |
| **Bequia Net** | Mon–Sat at 08:00 AST | VHF 68 | Bequia, St. Vincent & Grenadines |

**What to say when the net opens for announcements (30 seconds):**
> "This is [callsign] aboard s/v [boatname]. Quick one for cruisers planning passages — there's a free marina briefing tool at baystats.com. Real-time weather, tides, clearance info for marinas here in St. Lucia, Martinique, and Grenada. Rodney Bay and Marigot Bay are completely free, no sign-up. Marigot Bay over."

Say it once per island. Move on. Don't repeat it weekly or you become the person who advertises on the net.

---

### Cruisers Forum — Community Presence, Not Spam

Cruisers Forum has 127,000+ posts in the Caribbean subforum. It also has a formal **Vendor Spotlight** section with a vendor registration program. Do both:

**Community presence (ongoing):**
- Create an account with your boat name and a simple signature: `s/v [boat] • baystats.com`
- Answer questions about St. Lucia, Martinique, and Grenada from your own experience
- Never post "check out my app" cold — always lead with useful information
- Over time, your username becomes associated with Caribbean expertise

**Vendor Spotlight (one-time setup):**
- Register as a vendor at cruisersforum.com/forums/vendor/register/
- Post one honest "what BayStats is and why I built it" thread in the Vendor Spotlight section
- This is the right place for a product announcement — the community expects it there

---

### Facebook Groups — Authentic Sharing Only

These groups don't respond well to "I built a thing, check it out" posts. They do respond to "I was in this situation and here's what worked."

**Target groups (prioritized):**
1. Eastern Caribbean Cruisers' Discussions (primary regional group)
2. Grenada Cruisers Information
3. Women Who Sail (200K members — approach: authentic, not salesy)
4. Liveaboard Life

**What to post (authentic, not promotional):**
- "Pulling into Le Marin next week — BayStats showed the clearance office is open 08:00–16:00 M–F. Anyone confirm this is current?" → This generates replies AND awareness
- Share the monthly content asset (marina cost report, passage planning guide) — useful content gets shared without you asking
- Answer questions with your real experience + "I ended up building a tool for this — baystats.com — happy to help if useful"

**What not to do:**
- "Hey everyone, my app is live! Check it out at baystats.com 🎉" → will be ignored or removed
- Posting the same thing in 5 groups the same week → looks like spam

---

### Marina Manager Email Campaign

**Why marina managers matter:** They are both the B2B lead (future partner listing at $149/month) and word-of-mouth amplifiers. A marina manager who likes BayStats will tell every arriving sailor "oh check out baystats.com, it has our clearance hours and amenities."

**17 target marinas (from `locations.ts`):**
- 12 Martinique marinas (contact: harbormaster or office email — find via Google Maps "marina [name] contact")
- 7 Grenada marinas (same approach)

**Target pace:** 1 email per Wednesday = 17 emails over 17 weeks. Not a blast — a drip.

**Email template (under 100 words — this is critical for response rate):**

```
Subject: BayStats has a page for [Marina Name] — wanted you to see it

Hi [Name or "Marina Team"],

I'm a liveaboard sailor and I built BayStats (baystats.com) — a real-time briefing
tool that sailors check before arriving at a marina. Your marina is already in it.

Here's what sailors see when they look up [Marina Name]: [SCREENSHOT]

No action needed — just wanted you to know. If you ever want to update the info or
add anything (wifi, fuel, rates), reply and I'll sort it.

Fair winds,
[Your name] | s/v [boat name] | baystats.com
```

**Why this works:**
- It's not asking for money (yet)
- It shows them something they didn't know exists (their own page)
- The screenshot makes it real and credible
- The offer to update info creates a reason to reply
- It's from a fellow sailor, not a marketing agency

**Second email (4 weeks later, only to non-replies):**

```
Subject: Re: BayStats — [Marina Name]

Quick follow-up — 47 sailors have viewed your marina on BayStats in the past month.
We're opening a Partner Listing soon (prominent placement, event listings, direct
booking link) at $149/month. Want to be first when we launch?

[Your name]
```

---

### Noonsite.com — Highest Engagement Channel

Noonsite has **50–60% email newsletter open rates** — exceptional by any standard. This is a highly motivated audience actively planning passages. Their advertising section accepts sponsors.

**Contact:** advertising@noonsite.com (infer from site structure)
**Approach:**
- Month 2: Contact their advertising team, ask about newsletter sponsorship pricing
- Offer: "BayStats is a tool Noonsite users will genuinely find useful — here's the free version they can try today"
- If pricing is reasonable (<$200/month), test one newsletter sponsorship
- Track: how many clicks to baystats.com from Noonsite referral → if conversion > 0.5%, continue

**Note:** Do not pay for Noonsite advertising until you have at least 20 paying subscribers. Validate free channels first.

---

### Monthly Content Asset (The "Useful Thing Sailors Will Share")

Once a month, spend 45 minutes creating something sailors will share without being asked. This content does the marketing while you sleep.

**Content ideas (use BayStats data as the source):**

1. **"2026 Eastern Caribbean Marina Cost Report"** (Month 1)
   - Pull real clearance hours, berth costs, fuel availability from BayStats data
   - Format: simple PDF or Google Doc (not gated — free to share)
   - Post to: Cruisers Forum, all Facebook groups, your email list (even if tiny)
   - Tagline: "Data pulled from baystats.com — always current at the source"

2. **"St. Lucia to Martinique: A Sailor's Passage Brief"** (Month 2)
   - Use BayStats weather + tides + clearance data for the passage
   - Write it as a real passage log, not marketing copy
   - Shows the product in action without selling it

3. **"Which Caribbean Marinas Are Open on Sundays for Clearance?"** (Month 3)
   - Simple, searchable, useful answer for a common question
   - BayStats is the most up-to-date source — own this data niche

4. **"Grenada vs. Martinique for Haul-Out: A Liveaboard's Comparison"** (Month 4)
   - Use BayStats marina data + your own on-the-water knowledge
   - This positions you as an expert, not a vendor

---

### The Organic Viral Loop (The Real Engine)

The most powerful acquisition channel is dock talk. It requires zero time beyond using the product yourself.

```
You check BayStats before an approach → another sailor asks "what's that?"
→ You show them on your phone → they use it in St. Lucia (free, no login)
→ They head to Martinique → hit the paywall → remember it works → subscribe
→ They mention it on the morning net
```

This loop runs on its own once it starts. The job of all the other marketing is to seed it.

**Accelerator: be visibly helpful with BayStats data.** When someone on the radio asks "does anyone know if the fuel dock in Le Marin is open today?", answer it. Mention where you got the info. That one exchange is worth 10 Facebook posts.

---

### YouTube Channels — Phase 2 (Month 4+)

Don't pursue YouTube sponsorships until MRR > $500. These relationships take time and cost money. But when ready:

**Priority targets (mid-tier, accessible, Caribbean-focused):**
1. **Sailing Nandji** (187K subscribers) — Learning-to-sail journey, worldwide cruising
2. **MJ Sailing** (175K subscribers) — Technical, Caribbean-focused, attainable for sponsorship
3. **Sailing Jibsea** (61K subscribers) — Young couple, lifestyle-change demographic, highly engaged

**Approach:** Direct email via channel "About" page. Offer: free BayStats Pro subscription + $150–300/video for a genuine mention (not a forced read). Your product is actually useful for sailors → natural integration.

---

### SSCA — Month 3+

Seven Seas Cruising Association: 8,000 cruisers, 2,000 boats, monthly Commodores Bulletin, formal SSCA Partners sponsorship program. Serious audience with high purchase intent (they paid a membership fee).

**Contact:** office@ssca.org | (754) 702-5068
**Approach Month 3:** Inquire about SSCA Partners sponsorship — what tiers are available, what's included (bulletin listing, webinar access, member discount offering)

**Offer:** SSCA member discount (e.g., 20% off annual plan) — creates urgency + member benefit alignment

---

### What NOT to Do (Common Solo Founder Mistakes)

- **Don't run Google/Meta ads.** CPM for sailing audience is high, conversion is unknown, and $100 spent on ads is $100 not spent on Noonsite sponsorship with a proven audience.
- **Don't automate community outreach.** If your posts read like templates, sailors will clock it immediately. One authentic reply per week > 20 automated posts.
- **Don't build a mailing list tool yet.** You don't have enough subscribers to make email marketing worth the tool cost. Manual email (one reply at a time) is fine for first 50 subscribers.
- **Don't spend more than 1 hour/day.** Marketing is a background task. Product quality (fixing the location bug, shipping Stripe) is what actually drives word of mouth.

---

## Section 7: Success Metrics

- **MRR:** Target $1,000 by Month 4 (tracked: Stripe Dashboard)
- **Subscriber count:** Target 50 by Month 3 (tracked: Supabase `users` WHERE `tier='pro'`)
- **Free-to-paid conversion rate:** Target >8% of users who hit the paywall subscribe within 7 days (tracked: count 402 responses vs new subscriptions per week)
- **Churn rate:** Target <5%/month (sailors have 6-9 month seasons — natural annual turnover)
- **Location page views:** Which marinas are being viewed most → informs next data expansion priority (tracked: Netlify function invocation logs by location param)

---

## Section 8: Phases & Roadmap

### Phase 1 — Bug Fix + Gating (Days 1-3)
- F001: Fix location switching bug
- F002: Implement location-based gating (frontend + 5 API functions)
- F002: Build `RegionalPaywallBanner`
- Deploy. Test with real locations. Confirm free tier works without login.

### Phase 2 — Revenue Activation (Days 4-8)
- F003: Create Stripe products (manual, 10 minutes)
- F003: Build `subscription-checkout.ts` Netlify function
- F003: Build `subscription-webhook.ts` Netlify function
- F003: Build `/subscribe` and `/subscribe/success` pages
- F003: Wire "Subscribe" button in `RegionalPaywallBanner` to checkout function
- F003: Test end-to-end with Stripe test mode
- Deploy. First paying customer possible.

### Phase 3 — Self-Serve Account (Days 9-12)
- F004: Build `subscription-portal.ts` Netlify function
- F004: Build `/account` page
- F004: Extend `session-check.ts` to return subscription fields
- Deploy. Full self-serve billing complete.

### Phase 4 — UI/UX Redesign (After First Revenue Confirmed)
- F005: Dark maritime theme (Tailwind token overhaul)
- F005: Instrument-panel briefing cards (wind gauge, tide sparkline, swell animation)
- F005: Location selector upgrade (map/pill scroll)
- F005: Blurred paywall preview on `RegionalPaywallBanner`
- F005: Micro-animations and smooth location transitions
- This is the "dock demo" moment — sailors will show this to other sailors

### Post-Revenue Phase (Month 2+)
After first 20 paying subscribers, add in order:
1. **More marina regions** — BVI, Antigua, St. Vincent, Bequia (data work, no code changes)
2. **Marina Partner portal** — B2B self-service at $149/month
3. **Passage Briefing** — Claude API synthesis at $12/route
4. **Annual report content** — "Caribbean Marina Cost Report 2026" as acquisition content

---

## Section 9: Build Dependency Graph

**Phase 1 — Foundation (build first, no hard dependencies between F001 and F002):**
1. F001: Location switching bug fix (no dependencies — fix the core product first)
2. F002: Location-based access gating (depends on: F001 working correctly)

**Phase 2 — Revenue (depends on Phase 1):**
3. F003: Stripe subscription checkout + webhooks (depends on: F002 gating in place)

**Phase 3 — Self-Serve Polish (depends on Phase 2):**
4. F004: Account & billing page (depends on: F003 subscriptions working)

**Phase 4 — UI/UX Redesign (depends on Phase 3, triggered by first revenue):**
5. F005: PredictWind-inspired visual overhaul (depends on: all revenue features stable and confirmed working)

**Can build in parallel:**
- F001 + Stripe product setup in Dashboard (F001 is code, Stripe setup is manual — do both simultaneously)
- F003 checkout function + F003 webhook function (independent Netlify functions)
- F003 Subscribe page + F004 Account page (different routes, no shared code)
- F005 card redesigns can be done one card at a time, shipped incrementally

**Cannot build in parallel:**
- F002 must pass before F003 (paywall must exist before wiring the subscribe button)
- F003 must complete before F004 (account page requires real subscription data)
- F005 must not start until F001–F004 are all stable (redesign on top of broken infra = wasted effort)

---

## Section 10: Risks & Mitigation

**Risk 1: Stripe webhook not receiving events in Netlify Functions**
- Likelihood: Low (Netlify Functions receive webhooks reliably)
- Impact: High (subscriptions don't activate without webhook)
- Mitigation: Test with Stripe CLI (`stripe listen --forward-to`) locally. Verify with `stripe trigger checkout.session.completed`. Add Netlify function URL to Stripe webhook dashboard immediately after deploy.

**Risk 2: Existing free-tier users confused by new gating model**
- Likelihood: Medium (session-based users exist — unclear how many)
- Impact: Low (these are non-paying users; confusion is acceptable cost of improving the model)
- Mitigation: Any existing user with an account and `tier='free'` hits the new `RegionalPaywallBanner` for non-St. Lucia locations. Their account still works for St. Lucia. No data loss. Message on `RegionalPaywallBanner`: "Upgrade to unlock all Caribbean marinas."

**Risk 3: Location switching bug harder to fix than expected**
- Likelihood: Low-Medium (CLAUDE_HANDOFF.md documents the issue well — likely stale hook dependency)
- Impact: High if unsolved (breaks trust, can't demo product)
- Mitigation: Try `key={selectedLocation}` on root dashboard div first — forces full remount and bypasses any caching. If that works, refine the hook dependencies afterward. Nuclear option always available.

**Risk 4: Stripe 2.9% + $0.30 fee erodes margin at low price point**
- Likelihood: Certain (this is always true with Stripe)
- Impact: Low — $9/month nets ~$8.44 after Stripe fees. $69/year nets ~$66.41. Margin is still ~94% after other costs.
- Mitigation: Accept the fee. At scale, Stripe offers volume discounts. Not worth optimizing now.

---

## Section 11: Open Questions

1. **Pricing confirmation:** ~~RESOLVED~~ — $9/month · $69/year. Zero existing users, clean slate. Create Stripe products at these prices.

2. **Existing session-based users:** ~~RESOLVED~~ — Zero users confirmed. No migration email needed. Switch to location-based gating immediately.

3. **`/upgrade` route:** ~~RESOLVED~~ — Canonical route is `/subscribe`. The existing `PaywallModal` hardcodes `/upgrade` — patching this broken link is added to F002 acceptance criteria: `[ ] Any existing links to /upgrade redirect or are updated to /subscribe`.

4. **Annual plan positioning:** ~~RESOLVED~~ — Annual plan is the default selected option on `/subscribe` page, with "Most Popular" badge. Monthly is the alternative. This anchors users to higher LTV without hiding the monthly option.

---

## Section 12: Constraint Validation

- [x] **Revenue target ($1,000+/month)** achievable: 100 monthly + 30 annual subscribers = $1,108 MRR. Month 4 target. Realistic for sailing community at $9/month viral price point.
- [x] **Budget (<$100/month)** respected: Netlify free tier (125k function invocations/month — sufficient), Supabase free tier (500MB), Stripe fees only on revenue (not fixed cost), no new paid services added.
- [x] **Timeline (2 weeks to first customer)** realistic: 4 features, 3 are small. F001 (1-2 days) → F002 (1-2 days) → F003 (3-4 days) → F004 (1-2 days). First paying customer possible after F003 complete (~Day 8).
- [x] **Tech stack** consistent: React 19 + Vite + Netlify Functions + Supabase + Stripe throughout. No new services added except Stripe webhooks (Stripe already installed).
- [x] **Exclusions honored:**
  - No video/calls: all support via self-serve Stripe Portal + help docs
  - No partner portal in this PRD: out of scope, Phase 2
  - No passage briefings: out of scope, Phase 2
  - No new hosting: Netlify preserved

---

## CODEX Applied

- Anti-patterns flagged: none (first project, no CODEX.md)
- Patterns referenced: none (first project)
- Estimation baseline: none (first project)

**After shipping:** Run `/shawn-6-harvest` to capture:
- Netlify Function + Supabase auth pattern
- Stripe subscription webhook pattern for Netlify
- Location-gated freemium model pattern
- These will compound into future projects.

---

## Status & Next Steps

**Status:** [LOCKED — v1.0] Validated 17/19. All open questions resolved.

**Immediate next steps:**
1. ~~Confirm pricing~~ — DONE. $9/month · $69/year.
2. ~~Existing user count~~ — DONE. Zero users, clean slate.
3. ~~`/shawn-3-prd-review`~~ — DONE. PASS 17/19.
4. Run `/shawn-4-packet-gen` → `/shawn-5-packet-exe`

**First revenue possible: ~8 days from now.**
