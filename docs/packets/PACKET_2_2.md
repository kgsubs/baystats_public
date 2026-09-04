# PACKET_2_2: F002 Frontend Paywall UI

## CRITICAL ARCHITECTURE NOTE
- Working dir: /home/dev/_prod/baystats.com, branch: feat/revenue-v2
- PACKET_0 is complete: src/lib/access.ts exists with FREE_LOCATION_SLUGS and isFreeLocation()
- PACKET_1_1 is complete: DashboardV2.tsx has key={selectedLocation} on root div
- You are modifying DashboardV2.tsx again -- read it fresh before editing
- Do NOT add LemonSqueezy payment code here -- that's PACKET_3_1's scope

## FILES TO MODIFY
- src/components/session/RegionalPaywallBanner.tsx (CREATE)
- src/pages/DashboardV2.tsx (MODIFY -- add location gating logic)
- src/components/session/PaywallModal.tsx (MODIFY -- patch /upgrade -> /subscribe IF file exists)
- src/components/session/UpgradeBanner.tsx (MODIFY -- patch /upgrade -> /subscribe IF file exists)

## DESIGN SPECIFICATION

### 1. Create src/components/session/RegionalPaywallBanner.tsx

Props:
```typescript
interface RegionalPaywallBannerProps {
  locationName: string;    // e.g., "Le Marin"
  locationRegion: string;  // e.g., "Martinique"
  isAuthenticated: boolean;
}
```

Layout: Full-width card replacing data cards. Single column, centered, max-width 640px.

Content:
- Heading: "Unlock [locationName], [locationRegion]"
- Subheading: "Get real-time conditions for [locationName] and all other Caribbean marinas"
- Primary button (large): "Subscribe — $9/month" -> navigate to `/subscribe?plan=monthly&location=[slug]`
  (NOTE: slug not available in props -- pass it via an additional `locationSlug` prop OR use React Router's useSearchParams to get current location from URL. Use whatever approach fits cleanest.)
- Secondary button (outlined): "Save 36% — $69/year" -> navigate to `/subscribe?plan=annual&location=[slug]`
- Fine print: "Cancel anytime. No contracts."
- Divider
- If NOT authenticated: "Already subscribed? Sign in →" -> /login
- If authenticated (logged in but free tier): "Upgrade your plan →" -> /subscribe

Styling: Use existing Tailwind classes. Match existing dashboard card aesthetic. No new design libraries.

### 2. Update DashboardV2.tsx

**IMPORTANT: Read the CURRENT state of DashboardV2.tsx first** (PACKET_1_1 already modified it).

Add imports:
```tsx
import { isFreeLocation } from '../lib/access';
import { RegionalPaywallBanner } from '../components/session/RegionalPaywallBanner';
```

Find existing useSession usage (it should already be imported -- check). Get session tier:
```tsx
const session = useSession(); // or however it's currently used -- match existing pattern
const isPro = session?.tier === 'pro' || session?.user?.tier === 'pro'; // adapt to actual shape
const isGated = !isFreeLocation(selectedLocation) && !isPro;
```

Find where the location config is fetched (look for getLocationOrDefault or similar). Get the location name and region.

In JSX, BEFORE rendering data cards, add gating check:
```tsx
if (isGated) {
  return (
    <div key={selectedLocation} className="...existing wrapper styles...">
      {/* Keep location selector visible so user can switch back */}
      <RegionalPaywallBanner
        locationName={locationConfig.name}
        locationRegion={locationConfig.region || locationConfig.country || ''}
        locationSlug={selectedLocation}
        isAuthenticated={!!session}
      />
    </div>
  );
}
```

Keep the `key={selectedLocation}` from PACKET_1_1 on both the gated and non-gated return paths.

### 3. Patch /upgrade links

Search PaywallModal.tsx and UpgradeBanner.tsx for `/upgrade` strings. Replace with `/subscribe`.
Only if these files exist -- check first.

## ACCEPTANCE CRITERIA
- [ ] Rodney Bay and Marigot Bay load fully without login
- [ ] Selecting Martinique or Grenada location shows RegionalPaywallBanner for unauthenticated users
- [ ] Banner shows correct location name from locationConfig
- [ ] Banner has both $9/month and $69/year options
- [ ] Location selector remains visible on paywall screen (user can switch back)
- [ ] npm run build passes with zero TypeScript errors
