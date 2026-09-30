# Handoff: Wind Field Card (“Wind on the Water”)

## Overview
A new card for the BayStats marina page that turns the existing single wind reading
(`WINDS 9 KT ENE`) into a small map of **where the shelter is**. It shows animated wind
arrows over the bay, the marina pin, and three rows: a sheltered/exposed verdict, wind
outside the bay, and wind in the anchorage.

It ships with **light and dark themes** matched to the current site, and four data states
(default, blowing hard, stale, unavailable) plus a loading skeleton.

Placement: directly **below the conditions block** (`WINDS … / CLEAR SKY … / HUMIDITY`) and
above the phone row, inside the first card group. It replaces nothing.

## About the Design Files
`Wind Field Card.dc.html` and `Map Card Ideas.dc.html` in this bundle are **design
references authored in HTML** — prototypes that show intended look, geometry and motion.
They are not production code to copy in wholesale. The task is to **recreate this card in
the BayStats codebase using its existing patterns** (its component model, its theme
mechanism, its data-fetch layer). Where this README and the HTML disagree, this README wins.

`Map Card Ideas.dc.html` is context only — the five explored concepts. Only concept **1a**
(this card) is being built.

## Fidelity
**High-fidelity.** Colors, type, spacing, radii, timings and copy below are final and should
be matched. The one deliberately approximate part is the **coastline geometry**: the SVG
paths in the mock are a schematic of Rodney Bay drawn by hand. See *Basemap* below for how to
replace them with real geometry before shipping.

## Screens / Views

### Card: Wind on the Water
- **Purpose:** at a glance, answer “is the anchorage sheltered right now, and how much worse
  is it outside?”
- **Layout:** full-width card in the existing card stack.
  - Card: `border-radius: 12px`, no border, no shadow in dark; light theme matches sibling cards.
  - Section label: `padding: 15px 16px 10px`, `12px / 600 / letter-spacing .09em`, uppercase, muted color. Text: `WIND ON THE WATER`.
  - Map: `margin: 0 12px`, `border-radius: 9px`, `overflow: hidden`, aspect ratio **366 × 200** (1.83:1), responsive width, height derived.
  - Rows: vertical flex, `gap: 8px`, `padding: 12px`, each row `border-radius: 8px`, `padding: 13px 14px`, `13px / 700 / letter-spacing .04em`, uppercase. Label left, value right (`justify-content: space-between`).

#### Map contents (viewBox `0 0 366 200`)
| Element | Spec |
| --- | --- |
| Sea | full-bleed rect, `sea` token |
| Land (St. Lucia, right side) | filled path, `land` token; coastline stroke `coast`, `1.5` |
| Pigeon Island | small filled path top-right, land token one step lighter (`#d6d6d6` / `#242424`) |
| `PIGEON I.` label | `9.5px / 700 / .6` tracking, muted |
| Lee band | coastline offset path, `#111` @ 5% (light) / `#fff` @ 5% (dark) — only when sheltered |
| Wind arrows | 8 plain arrows (shaft + head only), see below |
| Marina pin | `r=5` filled accent + `r=5` stroked accent ring animating `r: 5→15, opacity .9→0`, `2.6s ease-out infinite` |
| Caption | bottom-left, `x=16 y=190`, `10px / 700 / .8` tracking, `caption` token. Text: `9 KT ENE · GUSTS 13` |

#### Arrow (barb) encoding
Plain arrows only — **a straight shaft and an open V head, nothing else**. No meteorological barbs,
flags, pennants, tails, dots or outlines. Speed is encoded by **shaft length**, direction by rotation.

One `<symbol>` per speed band, referenced by `<use>`; color inherits via `currentColor`.
Symbol viewBox `0 0 34 16`, stroke `currentColor` at `1.6`, `fill: none`, `stroke-linecap: round`.
Head is always `M26 8 l-6 -4 M26 8 l-6 4`; only the shaft start changes:

| Symbol | Shaft | Length | Band |
| --- | --- | --- | --- |
| `wf-arrow-light` | `M9 8 H26` | 17 | **< 8 kt** |
| `wf-arrow-mod` | `M4 8 H26` | 22 | **8–15 kt** |
| `wf-arrow-fresh` | `M2 8 H26` | 24 | **> 15 kt** |

Placement: each arrow is a `<g transform="translate(cx,cy) rotate(θ)">` wrapping
`<use x="-17" y="-8" width="34" height="16">`.

- **θ = wind_direction_10m − 90.** `wind_direction_10m` is the direction the wind comes
  *from*; SVG 0° points +x (screen right). ENE (67.5°) → **θ = 157.5°**, arrow points
  WSW/left-and-down, i.e. offshore, away from the land on the right. Verify this on every
  change — a reversed arrow is the one bug that makes the card actively harmful.
- Grid: 8 points — 6 offshore in two columns (`x ≈ 60` and `x ≈ 132`, `y ≈ 36 / 100 / 164`)
  and 2 inshore (`≈196,72` and `≈190,134`). Inshore arrows render at **45% opacity**.
- **Motion — one-way conveyor, never `alternate`.** The arrow field is rendered twice, the second
  copy offset one *pitch* upstream along the wind vector (`x="+70" y="-29"` in viewBox units), and
  the container translates exactly that pitch per cycle:

  ```css
  @keyframes wfblow { from { transform: translate(0,0) } to { transform: translate(-70px, 29px) } }
  ```
  `animation: wfblow 6s linear infinite` (default) / `2.6s` (blowing hard).
  Because the offset copy lands exactly where the original started, the last frame is identical to
  the first — the loop is invisible and the arrows only ever move downwind. Do **not** use
  `animation-direction: alternate`, a back-and-forth, an ease, or a yoyo: reversing motion reads as
  the wind reversing, which is a factual error on a sailing page.

  The pitch vector must stay parallel to the arrow heading: `(-70, 29)` ≈ 76 units at 157.5°,
  matching ENE. If the wind direction changes the field's rotation, recompute the pitch as
  `(cos θ, sin θ) × 76` so flow direction and arrow heading never disagree.

  Implementation: one `<g id="wf-field">` holding the 8 positioned arrows, referenced twice with
  `<use>`; the SVG viewBox clips arrows as they exit. Group opacity `.8` light, `.85` dark.

  Alternatives that are also acceptable if the codebase prefers them — both are single-direction:
  per-arrow advection (each arrow travels the vector once with an opacity fade in/out and a
  staggered delay), or `stroke-dashoffset` marching along streamline paths. Never a reversing tween.

#### Rows (exact copy)
| Row | Light | Dark |
| --- | --- | --- |
| `✓ LEE SIDE IS SHELTERED` | bg `#e7f7ec`, text `#17a34a` | bg `#0d2a19`, text `#2fbf6a` |
| `OUTSIDE THE BAY` / `14 KT` | bg `#f4f4f4`, text `#111` | bg `#1c1c1c`, text `#fff` |
| `IN THE ANCHORAGE` / `6 KT` | bg `#f4f4f4`, text `#111` | bg `#1c1c1c`, text `#fff` |

Use the existing `✓` glyph and check-row treatment already used by `FAIR SAILING CONDITIONS`.

## Interactions & Behavior
- **Not interactive.** No tap target, no navigation, no tooltip. It is a read-only graphic,
  consistent with the rest of the page.
- **Animation:** arrow drift + pin pulse only. Both must respect
  `@media (prefers-reduced-motion: reduce)` → drop `animation` entirely (static arrows,
  static pin). No layout shift when motion is off.
- **Theme:** follows the site's existing light/dark switch (the sun/moon control in the
  header). No independent toggle.
- **Refresh:** repaints on the page's existing refresh cycle; no polling of its own.

### States
1. **Loading** — skeleton: map area becomes a `#151515` (dark) / `#eaeaea` (light) block at the
   same aspect ratio, plus two 44px row blocks, `opacity .45 → .9 → .45`, `1.4s ease-in-out
   infinite`, second row delayed `.2s`. **The card must not change height** between skeleton
   and loaded.
2. **Default (sheltered)** — as specified above. Condition: anchorage wind ≤ 20 kt.
3. **Blowing hard** — anchorage wind > 20 kt:
   - green chip withheld; becomes a neutral row reading `⚠ GUSTS REACH THE ANCHORAGE`
   - arrows: all `wf-arrow-fresh`, `width 40 / height 19`, color `#fff` (dark) / `#111` (light) at
     100% opacity, flow cycle `2.6s`
   - lee band removed; pin fill goes neutral (`#fff` / `#111`) instead of accent
   - caption shows real numbers, e.g. `27 KT ENE · GUSTS 34`
   - **No amber or red is introduced.** Urgency is value + speed only.
4. **Stale** (> 30 min since observation) — map wrapper `opacity: .34`, all animation stopped,
   rows replaced by one muted row: `LAST GOOD READING` / `41 MIN AGO`.
5. **Unavailable** (fetch failed, no cache) — **the map is removed**, not faked. Card keeps its
   label and shows a single muted row: `WIND FIELD UNAVAILABLE`. Never interpolate or invent arrows.

## State Management
```
windField: {
  status: 'loading' | 'ok' | 'stale' | 'error',
  observedAt: ISO8601,
  offshore:  { speedKt, gustKt, directionDeg },   // outside the bay
  anchorage: { speedKt, gustKt, directionDeg },   // inside the bay
  grid: Array<{ x, y, speedKt, directionDeg }>    // 8 entries, x/y in viewBox units
}
```
Derived, not stored: `sheltered = anchorage.speedKt <= 20`, `stale = now - observedAt > 30min`,
`band(speedKt) → 'light' | 'mod' | 'fresh'`.

Suggested component signature (adapt to the codebase's conventions):
```
WindFieldCard({ data, theme })   // theme: 'light' | 'dark'
```

## Data — Open-Meteo (live, keyless)
Single request, batched lat/lon lists:

```
https://api.open-meteo.com/v1/forecast
  ?latitude=14.098,14.083,14.070,14.098,14.083,14.070,14.083,14.075
  &longitude=-61.00,-61.00,-61.00,-60.985,-60.985,-60.985,-60.968,-60.962
  &current=wind_speed_10m,wind_direction_10m,wind_gusts_10m
  &wind_speed_unit=kn
  &timezone=UTC
```
- Returns an array of results, one per coordinate pair, in request order → map index → grid slot.
- The **first three** coords are the offshore column (used for `OUTSIDE THE BAY`, take the max);
  the **last two** are inside the bay (used for `IN THE ANCHORAGE`, take the max).
- Licence: Open-Meteo free tier, non-commercial, attribution appreciated —
  add `OPEN-METEO` to the existing source/attribution line rather than inside the card.
- **Cache server-side for 10 minutes** and serve the card from that cache; do not call the API
  per page view. Persist the last good payload so the stale state has something to show.
- No API key, no CORS proxy needed, but proxying through the existing backend is preferred so
  the cache and the failure state are centralized.

### Basemap (pre-generated, do once)
Replace the hand-drawn coastline before shipping:
1. Pull the Rodney Bay coastline from OpenStreetMap (`natural=coastline`) or Natural Earth
   1:10m coastline, bbox roughly `-61.01, 14.06 → -60.93, 14.12`.
2. Project to the `366 × 200` viewBox, simplify (Douglas–Peucker, ~2px tolerance).
3. Export as a static SVG path string, commit it as a constant. It never changes at runtime.
4. Derive the lee band by offsetting that path ~30 viewBox units to windward and clipping.

## Design Tokens
```
                     LIGHT      DARK
page                 #eeeeee    #000000
card                 #ffffff    #0d0d0d
row                  #f4f4f4    #1c1c1c
row-good             #e7f7ec    #0d2a19
accent               #17a34a    #2fbf6a
text                 #111111    #ffffff
text-muted           #9a9a9a    #8f8f8f
caption              #6d6d6d    #8f8f8f
map-sea              #f6f7f8    #111111
map-land             #e4e4e4    #1c1c1c
map-land-alt         #d6d6d6    #242424
map-coast            #bdbdbd    #3d3d3d
map-arrow            #111111    #e6e6e6
map-lee              #111 @ 5%  #fff @ 5%
skeleton             #eaeaea    #151515

radius       card 12 · row 8 · map 9
spacing      card side 12 · row 13/14 · stack gap 8 · label 15/16/10
type         label   12px / 600 / .09em / uppercase
             row     13px / 700 / .04em / uppercase
             caption 10px / 700 / .8px tracking
             map txt 9.5px / 700 / .6px tracking
motion       flow  translate(0,0)→(-70px,29px) · 6s (2.6s hard) linear infinite · ONE-WAY
             pin   2.6s ease-out infinite
             skeleton 1.4s ease-in-out infinite
```
Font family follows the site's existing stack — the mock uses
`-apple-system, "Helvetica Neue", Arial, sans-serif`; use whatever the page already loads.

## Assets
None. Everything is inline SVG generated from data plus one committed coastline path
constant. No icon files, no map tiles, no external images, no fonts added.

## Accessibility
- Map `<svg>` gets `role="img"` and an `aria-label` restating the numbers in words, e.g.
  “Wind arrows over Rodney Bay: 14 knots east-north-east outside the bay, 6 knots in the anchorage.”
- Decorative SVGs in the stale state: `aria-hidden="true"`.
- The three rows are real text — no numbers exist only inside the graphic.
- `prefers-reduced-motion` honored (see above).
- Row contrast: `#fff` on `#1c1c1c` ≈ 15:1; `#2fbf6a` on `#0d2a19` ≈ 7.4:1; captions on sea
  pass at 4.5:1 — do not lighten caption tokens further.

## Acceptance Criteria
1. Arrows point **downwind** (θ = direction_from − 90). ENE wind → arrows point WSW.
1b. Arrow motion is single-direction and downwind, parallel to the arrow heading, with a seamless
   loop. No `alternate`, no reversal, no visible jump at the loop boundary.
2. Inshore arrows render lighter and shorter than offshore arrows whenever `sheltered`.
2b. Arrows carry no adornment beyond shaft and head — no barbs, flags, tails or dots at any speed.
3. Green chip appears only when anchorage wind ≤ 20 kt; above that the neutral warning row
   shows and no green appears anywhere in the card.
4. Card height is identical in loading and loaded states — no layout shift.
5. Stale > 30 min: map at 34%, animation stopped, age stated in a row.
6. Fetch failure with no cache: no map rendered, single muted row.
7. `prefers-reduced-motion: reduce`: no animation, no jump.
8. Both themes render from tokens only — no hard-coded hex in the component beyond the token map.
9. One network call per 10-minute cache window, not per page view.
10. Both themes verified at 320px, 390px and 430px viewport widths.

## Files
- `Wind Field Card.dc.html` — the card: light default, dark default, blowing hard, loading,
  stale, unavailable, plus the token/geometry panel. **Primary reference.**
- `Map Card Ideas.dc.html` — the five original concepts (context; only 1a is in scope).
- `mobile-current-light.png`, `mobile-current-dark.png` — the live site as reviewed, for
  matching surrounding cards.
