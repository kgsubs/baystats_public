# PACKET_2_1: F002 Backend Location Gating

## CRITICAL ARCHITECTURE NOTE
- Functions in `netlify/functions/*.ts` use `@netlify/functions` Handler type
- `server/index.ts` wraps each with `adapt()` -- you are NOT modifying server/index.ts here
- `src/lib/access.ts` already exists (created by PACKET_0) with FREE_LOCATION_SLUGS
- Working dir: /home/dev/_prod/baystats.com, branch: feat/revenue-v2

## SCOPE
Add location gating to 5 API functions. If location is in FREE_LOCATION_SLUGS -> proceed normally. If not -> verify JWT, check tier='pro', reject with 402 if not.

Do NOT modify: tropical.ts, vessels.ts, admin-marinas.ts, session-check.ts, auth functions.

## FILES TO MODIFY
- netlify/functions/weather.ts
- netlify/functions/clearance.ts
- netlify/functions/tides.ts
- netlify/functions/currents.ts
- netlify/functions/sunmoon.ts

## DESIGN SPECIFICATION

**Step 1: Read src/lib/auth.ts** to confirm exact `verifyJwt` signature and return type before using it.

**Step 2: Add gating snippet to each of the 5 handler functions**

Add these imports at the top of each file (if not already present):
```typescript
import { FREE_LOCATION_SLUGS } from '../../src/lib/access';
import { verifyJwt } from '../../src/lib/auth';
```

Inside each handler, AFTER parsing the location param, add:
```typescript
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

Note: Read each file first to see how location param is already parsed. Adapt placement accordingly -- the gating check should go AFTER location is known but BEFORE any API calls.

**Import path note:** Functions are in `netlify/functions/` and access.ts is in `src/lib/`. Relative path is `../../src/lib/access`. Verify this resolves -- it should since PACKET_0 created it.

## ACCEPTANCE CRITERIA
- [ ] /api/weather?location=rodney-bay -> 200 (no auth needed)
- [ ] /api/weather?location=le-marin -> 402 {"error":"PRO_REQUIRED"} (no auth)
- [ ] Same 402 for clearance, tides, currents, sunmoon with non-free location
- [ ] /api/tropical -> 200 regardless of auth (not gated)
- [ ] npm run build passes with zero TypeScript errors
