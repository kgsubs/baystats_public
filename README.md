# BayStats | Marina Conditions for the Eastern Caribbean

> **Product case study.** Marina data exists only as prose on inconsistent third-party pages. BayStats extracts it with a language model under a fixed schema and a human approval gate, pairs it with cached conditions data, and labels every figure that is modelled rather than measured.

**Live: [baystats.com](https://baystats.com)** | Solo build | 282 commits, 9 working days

| | | |
|---|---|---|
| ![Dashboard, light](docs/screenshots/dashboard-light.png) | ![Dashboard, dark](docs/screenshots/dashboard-dark.png) | ![Wind on the Water](docs/screenshots/wind-card.png) |
| Rodney Bay, light | The same, dark | The wind field card |

---

## Problem and Framing

**User pain.** A cruiser deciding whether to move the boat needs wind, tide, current, storm outlook, shelter and berth availability at once. Those sit across five sources, none of which talk to each other. The operational facts are the hardest to find and the most urgent: locating a marina's VHF channel at dusk in a rising wind currently takes three websites.

**Why AI was required.** Marina records are unstructured prose, formatted differently on every listing site. Per-site scrapers stop scaling after a handful and break on every layout change. Schema-constrained extraction handles all of them and degrades to partial data rather than failure. That is what made 24 locations tractable for one person.

**Solution.** One screen per marina. Conditions and operational detail together, extraction gated behind human review, modelled figures labelled as modelled.

---

## Architecture

```
Unstructured web prose
        |
        v
LLM extraction (22-field JSON schema)     <- admin-triggered only
        |
        v
Parse + validate                          <- unparsable response: hard error, zero writes
        |
        v
Pending review queue (status = pending_review)
        |
        v
Supabase, row-level security enforced     <- policy exposes 'approved' / 'manual_only' only
        |
        v
Public UI
```

Conditions run on a separate, fully deterministic path:

```
8 coordinates, one batched request -> Open-Meteo -> shape validation
    -> 10-minute server cache + last-good store -> shelter model -> SVG map
```

**Design decisions.**

- **Schema-constrained, not conversational.** Fixed 22-field JSON structure. A chat surface would still have required the same human review, and would have been harder to validate.
- **Model output never reaches a reader unreviewed.** Rows land as `pending_review`. The read gate is a database policy, so an interface bug cannot leak an unapproved record.
- **The model touches prose only.** Weather, tide, current and astronomical figures come from numeric feeds and never pass through it.
- **Zero runtime dependencies for the map.** Inline SVG over coastline geometry pulled from OpenStreetMap, projected, simplified with Douglas-Peucker, committed as fixed paths: 2,117 source points reduced to 123 for Rodney Bay, 58 for Marigot Bay. No map tiles, no charting library, no animation library.

---

## Safety and Guardrails

Two non-deterministic surfaces, contained separately.

### Language model extraction

| Risk | Control |
|---|---|
| **Schema constraint** | Fixed 22-field JSON schema in the prompt; an unparsable response fails hard with zero writes and no partial record |
| **Unreviewed data reaching users** | Every extracted row is written `pending_review` and requires explicit human approval |
| **Application or UI bug leaking data** | Row-level security policy on `status` gates all reads, enforced by the database independently of application code |
| **Endpoint abuse** | Extraction requires an authenticated admin and is unreachable from the public interface |
| **API cost** | Extraction is admin-triggered per marina page, never on a user request path |

### Modelled wind figures

**Constraint.** Open-Meteo samples 8 points across ~2 km and returns an identical value at all 8, because its grids are 2 to 25 km wide. The sheltering effect the card exists to show is finer than the feed resolves.

**Response.** Model it, bound it, label it.

- **Bounded.** Wind direction against the bay's mouth bearing, factor clamped to 0.40-1.00, so it can only reduce a wind speed.
- **Labelled.** Stated in the interface beneath the number: *anchorage figure is estimated from wind direction against the mouth of the bay, not measured*.
- **Flagged.** Applied only when the feed genuinely returns identical inshore and offshore values; the payload carries an explicit `anchorageEstimated` flag.
- **Aged out.** A reading over 30 minutes old dims the map, stops all motion, and states its age in words.
- **Removed on failure.** Feed down with no cache: the map is removed, not drawn. Nothing is interpolated or extrapolated.
- **Never borrowed.** A location without its own committed basemap and sample coordinates gets no card, so one bay is never shown another's data.

**Cost ceiling.** The 10-minute server cache caps each location at **144 upstream calls per day**, independent of traffic volume.

**Failure handling.** Every upstream response is shape-checked; a non-numeric wind value throws rather than propagating. The last-good payload persists, so a failed refresh degrades to stale instead of empty. A React error boundary wraps the application, with a test reproducing the original crash it was built to catch.

---

## Execution and Iteration

**Framing first.** Specification, review and decomposition into build packets are in `docs/`, unedited.

**AI as the build medium.** Specification written and reviewed with AI, decomposed into packets, executed by AI agents running in parallel. 282 commits between 13 and 26 February 2026 across 9 working days, 115 in a single day.

**Three failure modes found only against real data:**

1. **The design brief contradicted itself.** It stated `direction - 90`, then worked its example as ENE giving 157.5 degrees, which requires `+ 90`. Built as written, every arrow points into the wind, telling sailors to anchor on the exposed side. I took the worked example and verified against rendered output.
2. **The data source could not support the product claim.** Found by querying every model the service offers and comparing all 8 sample points. No implementation fixes this, so the answer had to be a product decision.
3. **Two crashes surfaced while writing tests.** An error payload with no grid took down the whole page; the loading state stood 5px shorter than the loaded state. Both fixed, both covered.

**Verification, not inspection.** The seamless animation loop was proved by pausing at exact cycle boundaries and hashing frames: identical at t=0 and t=6s, different mid-cycle, motion consistently downwind.

---

## Delivery and Performance

- **Build velocity:** 282 commits, 9 working days, one person
- **Codebase:** ~10,900 lines TypeScript, 22 backend endpoints, 37 migrations
- **Warm response:** 0.15s to 0.35s, cached conditions endpoint
- **Client bundle:** 348 KB, 100 KB gzipped, no map or charting library
- **Test suite:** 11 Playwright specs in 2.7s, no keys and no database required
- **Upstream ceiling:** 144 calls per location per day, traffic-independent
- **Extraction:** one marina page to a 22-field structured record per call

Product adoption metrics await user onboarding; the launch-notification signup on every location not yet live is the instrumentation that will produce them.

**Where the revenue is.** Marinas have a direct commercial interest in being found and described accurately, and will pay for a listing. Cruisers want the same records and will not. The berth availability and services data is the asset; the marina is the buyer.

---

## Stack and Quickstart

**Application:** React 19, TypeScript, Vite, React Router
**Backend:** Express 5 on Node, Supabase (PostgreSQL, row-level security)
**AI:** Claude Sonnet, schema-constrained extraction, admin-gated
**Data:** Open-Meteo (weather, marine), OpenStreetMap (coastline, ODbL)
**Testing:** Playwright against a stubbed backend
**Deployment:** nginx static, PM2 supervising the API, Let's Encrypt

Credentials are redacted, so the published repository is not installable as-is. With your own Supabase project:

```bash
git clone git@github.com:kgsubs/baystats_public.git
cd baystats_public
npm install
cp .env.example .env        # Supabase URL and keys
npm run dev                 # Vite on 5173, API on 3457
npm test                    # Playwright, no keys required
```

---

## Repository Map

| Path | Contents |
|---|---|
| `docs/PRD.md` | Product specification |
| `docs/packets/` | Build packets the specification was decomposed into |
| `docs/BUILD_RECORD.md` | What each packet produced |
| `design_handoff_wind_field_card/` | Design brief and reference designs for the wind card |
| `netlify/functions/marina-scrape.ts` | Extraction pipeline and its guardrails |
| `netlify/functions/wind-field.ts` | Batched conditions fetch, cache, shelter model |
| `src/components/windfield/` | Wind card and committed coastline geometry |
| `src/config/windField.ts` | Per-location basemaps and sample coordinates |
| `tests/` | Playwright suite |
| `supabase/migrations/` | Schema in order, including row-level policies |

---

Weather and marine data from [Open-Meteo](https://open-meteo.com). Coastline geometry (c) [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, ODbL.
