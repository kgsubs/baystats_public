# PACKET_1_1: F001 Location Switching Bug Fix

## CRITICAL ARCHITECTURE NOTE
- This is a frontend-only fix
- Working dir: /home/dev/_prod/baystats.com
- Branch: feat/revenue-v2
- Do NOT add paywall logic here -- scope is strictly the location bug

## DESIGN SPECIFICATION

### 1. Primary fix: Add key prop to DashboardV2 root container
In `src/pages/DashboardV2.tsx`, find the outermost JSX container returned by the component.
Add `key={selectedLocation}`:
```tsx
return (
  <div key={selectedLocation} className="...existing classes...">
    {/* all existing dashboard content unchanged */}
  </div>
);
```
This forces React to fully unmount/remount all children on location change. No stale data possible.

### 2. Secondary fix: Add explicit data reset in hooks
In `src/hooks/useBriefingData.ts`, check each hook (useBriefingWeather, useBriefingClearance, etc.)
If they DON'T already reset state on location change, add:
```typescript
useEffect(() => {
  setData(null);  // match existing state var name
  setError(null);
  setLoading(true);
  // then fetch...
}, [location]);
```
Only add if stale data is possible during loading phase. Check existing code first.

### 3. Verify loading states show skeleton, not stale data
When `loading` is true, cards should show loading skeleton. If any card renders content while loading=true, add guard:
```tsx
if (loading || !data) return <LoadingSkeleton />;
```

## ACCEPTANCE CRITERIA
- [ ] Switch Rodney Bay -> Marigot Bay: phone shows `+1-758-451-4974` (not Rodney Bay number)
- [ ] Switch Rodney Bay -> Marigot Bay: berth count shows 40 (not 234)
- [ ] Switch to any Martinique location: weather coordinates reflect Martinique lat/lon
- [ ] No hard page refresh required -- location change alone updates all cards
- [ ] Loading skeleton shows during fetch -- not previous location's data
- [ ] `npm run build` passes with zero TypeScript errors
