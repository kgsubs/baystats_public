# PACKET_4_1: F003+F004 Session Extension + Account Page

## CRITICAL ARCHITECTURE NOTE
- Working dir: /home/dev/_prod/baystats.com, branch: feat/revenue-v2
- Groups 1-3 are complete. This is the final active packet before the revenue gate.
- subscriptions table will exist after migrations 024+025 are run (files are created)
- Do NOT run migrations yourself -- they're SQL files for Supabase SQL editor
- ProtectedRoute.tsx exists -- use it if needed for /account route protection
- Working dir: /home/dev/_prod/baystats.com, branch: feat/revenue-v2

## FILES TO MODIFY/CREATE
- netlify/functions/session-check.ts (MODIFY -- add subscription fields to response)
- src/hooks/useSession.ts (MODIFY -- consume new session-check fields)
- src/pages/Account.tsx (CREATE)
- src/App.tsx (MODIFY -- add /account route)
- src/pages/DashboardV2.tsx (MODIFY -- add Pro badge + Account link to header)

## DESIGN SPECIFICATION

### 1. Extend netlify/functions/session-check.ts

Read the current session-check.ts first. After the existing user lookup, add a subscriptions query:

```typescript
const { data: subscription } = await supabase
  .from('subscriptions')
  .select('status, current_period_end, ls_customer_id, plan_tier')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false })
  .limit(1)
  .single();
```

Add to the existing response body (do not remove any existing fields):
```json
{
  "subscription_status": "active|cancelled|null",
  "current_period_end": "2027-02-18T00:00:00Z|null",
  "ls_customer_id": "123|null",
  "plan_tier": "monthly|annual|null"
}
```

If subscriptions query returns null (no subscription), include these fields as null.

NOTE: session-check.ts may not have Supabase access yet -- read it and check. If it doesn't import createClient, add that import.

### 2. Update src/hooks/useSession.ts

Read the current useSession.ts. Extend the session state type to include the new fields:
- subscription_status: string | null
- current_period_end: string | null
- plan_tier: string | null

Map these from the API response. Follow existing patterns exactly.

### 3. Create src/pages/Account.tsx

Guards at component top:
- If not authenticated (no session / tier is null) -> navigate to /login
- If tier === 'free' -> navigate to /subscribe

Layout: max-width 480px, centered, single column. Match existing page styling.

Content sections:

**Plan Card:**
- Heading: "BayStats Pro"
- Status badge: green "Active" if subscription_status='active', red "Canceled" otherwise
- Plan line: "Annual — $69/year" or "Monthly — $9/month" based on plan_tier
- Renewal: "Renews [date]" formatted as "February 18, 2027" from current_period_end
  (if cancelled, show "Expires [date]" instead)
- "Manage Billing →" button:
  - POST /api/subscription/portal (with credentials: 'include')
  - On success: window.location.href = portal_url
  - On error: show inline error message
  - Loading state on button

**Access Card:**
- Text: "You have access to all 27 marina locations"
- "← Back to Dashboard" link -> /

**Sign Out:**
- "Sign Out" button
- Read Login.tsx or auth hooks to see how sign-out works currently
- Clear auth cookies (match existing logout pattern)
- Redirect to /

### 4. Update src/App.tsx

Add: `<Route path="/account" element={<Account />} />`
Import Account at top.

### 5. Add Pro badge + Account link in DashboardV2.tsx header

Read DashboardV2.tsx. Find the sticky header / nav area.
After session data is available, if tier === 'pro':
- Show a small "Pro" badge (e.g. green dot or "PRO" tag)
- Show "Account" link → /account

Match existing header styling. Keep changes minimal.

## ACCEPTANCE CRITERIA
- [ ] /account shows correct plan name and next billing date for Pro users
- [ ] "Manage Billing" opens LemonSqueezy Customer Portal
- [ ] Free tier users at /account redirected to /subscribe
- [ ] Unauthenticated users at /account redirected to /login
- [ ] Sign out clears cookies and returns user to homepage
- [ ] session-check response includes subscription_status, current_period_end, plan_tier
- [ ] Pro badge visible in dashboard header for Pro users with Account link
- [ ] npm run build passes with zero TypeScript errors
