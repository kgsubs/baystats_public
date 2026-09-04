# PACKET_3_2: F003 Subscribe Pages

## CRITICAL ARCHITECTURE NOTE
- Working dir: /home/dev/_prod/baystats.com, branch: feat/revenue-v2
- PACKET_2_2 is complete: RegionalPaywallBanner links to /subscribe?plan=X&location=Y
- This packet builds the /subscribe and /subscribe/success pages
- Do NOT add backend payment code here -- that's PACKET_3_1's scope (running in parallel)
- Annual plan ($69/year) is DEFAULT SELECTED per confirmed user decision

## FILES TO CREATE/MODIFY
- src/pages/Subscribe.tsx (CREATE)
- src/pages/SubscribeSuccess.tsx (CREATE)
- src/App.tsx (MODIFY -- add /subscribe and /subscribe/success routes)

## DESIGN SPECIFICATION

### 1. src/pages/Subscribe.tsx

URL params read with useSearchParams:
- ?plan=annual|monthly (pre-select plan, default to 'annual')
- ?location=le-marin (store for passing to checkout, return after)

State: `selectedPlan` defaults to URL param or 'annual'.

Two plan cards side by side (or stacked on mobile):
- Annual card: "$69 / year" + "Save 36%" badge + "Most Popular" badge -- default selected
- Monthly card: "$9 / month"

Selected card shows highlighted border (e.g. ring-2 ring-blue-500 or match existing accent color).

Continue button:
1. POST to /api/subscription/checkout with { plan: selectedPlan, return_location: locationParam }
2. On success: window.location.href = checkout_url (redirect to LemonSqueezy)
3. On error: show inline error "Payment service unavailable. Please try again."
4. Show loading state on button while request in flight

Footer elements:
- "Already subscribed? Sign in →" -> /login
- Fine print: "Cancel anytime. No contracts. Secure payment via LemonSqueezy."

### 2. src/pages/SubscribeSuccess.tsx

URL params: ?location=le-marin (where to return after upgrade confirmed)

Immediate display: "You're in! Welcome to BayStats Pro."
Show a loading spinner / "Activating your access..." message.

Poll GET /api/session/check (or /api/session-check -- check what the existing route is called) every 3 seconds, max 10 attempts (30 seconds):
- If response includes tier === 'pro': navigate to `/?location={returnLocation}`
- After 10 attempts without pro tier: show "Your access is being activated. It may take a moment." with "Go to Dashboard →" button that links to /

Use setInterval or a useEffect with setTimeout chain. Clear interval on component unmount.

### 3. src/App.tsx

Read the current App.tsx. Add these routes in the appropriate place:
```tsx
<Route path="/subscribe" element={<Subscribe />} />
<Route path="/subscribe/success" element={<SubscribeSuccess />} />
```

Import Subscribe and SubscribeSuccess at top of file.

## ACCEPTANCE CRITERIA
- [ ] /subscribe shows Annual ($69) selected by default
- [ ] /subscribe shows Monthly ($9) as alternate option  
- [ ] Selecting Monthly plan deselects Annual (and vice versa)
- [ ] Continue button calls /api/subscription/checkout and redirects to LemonSqueezy URL
- [ ] /subscribe/success polls for tier='pro' and redirects to dashboard on success
- [ ] Timeout (30s): "activating" message + manual dashboard button shown
- [ ] npm run build passes with zero TypeScript errors
