# BayStats | Marina Conditions Intelligence for the Eastern Caribbean

> **Product case study**: cruising sailors reconstruct a bay's conditions from four or five disconnected sources before moving a boat. BayStats consolidates that into one screen per marina, using a language model to convert unstructured marina web pages into reviewed structured records, and a physical model to state what the weather feed cannot measure.

**Live: [baystats.com](https://baystats.com)** | Built solo | 282 commits across 9 working days

| | | |
|---|---|---|
| ![Dashboard, light](docs/screenshots/dashboard-light.png) | ![Dashboard, dark](docs/screenshots/dashboard-dark.png) | ![Wind on the Water](docs/screenshots/wind-card.png) |
| Rodney Bay, light | The same, dark | The wind field card |

---

## Executive Summary and Problem Framing

**The problem.** A cruiser deciding whether to move the boat needs six things at once: wind, tide, current, storm outlook, whether the anchorage is sheltered, and whether the marina has a berth. Today those live in a weather app that knows nothing about marinas, a tide table, a cruising guide two seasons out of date, a marina's own website if it has one, and a WhatsApp group. The operational facts are the hardest to find and the most urgent. Finding a marina's VHF channel at dusk in a rising wind should not require three websites.

**Why this needed an AI-first approach.** The bottleneck was never the interface. It was that marina data does not exist in structured form. Berth counts, mooring availability, fuel and water, customs hours, VHF channels: these sit in prose on inconsistent third-party listing pages, formatted differently on every site. Writing a scraper per marina does not scale past a handful and breaks on every layout change. Extraction with a language model against a fixed schema does scale, and it degrades on new layouts instead of failing outright. That decision is what made twenty-four locations tractable for one person.

**The solution.** One screen per marina carrying conditions and operations together. Behind it: a batched weather pipeline cached server-side, a language-model extraction pipeline that populates marina records under human approval, and a wind field map that shows where the shelter is, with its modelled component labelled as such.

---

## System Architecture and AI Design

Two pipelines, deliberately separated by how much they can be trusted.

**Pipeline 1: marina data extraction (admin only, human-gated)**

```
[ marinelink.com URL ]
        |
        v
[ Fetch page ] --> [ Claude Sonnet extraction ]
                          |  fixed 22-field JSON schema in the prompt
                          v
                   [ Parse and validate ]
                          |  no parsable JSON -> hard error, nothing written
                          v
                   [ Write row: status = pending_review ]
                          |
                          v
                   [ Human review: edit / approve / reject ]
                          |
                          v
                   [ Row-level policy: only 'approved' or 'manual_only' is readable ]
                          |
                          v
                     [ Public UI ]
```

**Pipeline 2: conditions (deterministic, cached)**

```
[ 8 coordinates, one batched request ]
        |
        v
[ Open-Meteo ] --> [ Shape validation ] --> [ 10-minute server cache + last-good store ]
                          |                          |
                          | non-numeric -> throw     | fetch fails -> serve last good, mark stale
                          v                          v
                   [ Shelter model ] ----------> [ SVG map + rows, estimate labelled ]
```

**Technical and product decisions.**

- **Structured extraction, not conversational AI.** The model is given a fixed twenty-two field JSON schema and asked to fill it from page text. There is no chat surface, no open-ended generation, and no model output that reaches a user without passing a human. A chat interface would have been faster to demo and worse to trust.
- **The model never writes to the public surface.** Extracted rows land as `pending_review`. The public read policy is enforced in the database, not in application code, so a bug in the UI cannot expose an unreviewed record.
- **Deterministic where determinism is available.** Weather, tide, current and astronomical data come from numeric feeds and are never touched by a model. The language model is confined to the one problem it is genuinely better at: turning prose into fields.
- **Server-side caching over client freshness.** A ten-minute cache means each location makes at most 144 upstream calls a day regardless of traffic, and the app stays within a free tier while remaining current enough for a conditions board.
- **No runtime dependency for the map.** The wind field is inline SVG generated from data over coastline geometry extracted from OpenStreetMap, projected, simplified with Douglas-Peucker and committed as fixed paths (2,117 source points reduced to 123 for Rodney Bay, 58 for Marigot Bay). No map tiles, no charting library, no animation library.

---

## Probabilistic System Design and Guardrails

Two sources of non-determinism: a language model extracting from prose, and a physical estimate standing in for a measurement that does not exist. Each is contained differently.

**Language model output**

| Risk | Control |
|---|---|
| Fabricated or malformed fields | Fixed twenty-two field JSON schema stated in the prompt; response parsed with a JSON extraction step |
| Unparsable response | Hard error returned to the caller; no partial record is written |
| Plausible but wrong values reaching users | Every extracted row is written as `pending_review` and requires explicit human approval |
| Application bug exposing unreviewed data | Read access gated by a database row-level policy on `status`, independent of application code |
| Endpoint abuse | Extraction is admin-only and not reachable from the public interface |

**Modelled physical output**

The weather service samples eight points across roughly two kilometres and returns an identical value at all eight, because its grids are two to twenty-five kilometres wide. The sheltering effect the card exists to show is finer than the feed can resolve. Rather than print the same number twice or invent a difference:

- The anchorage figure is derived from a stated model, wind direction against the bearing of the bay's mouth, bounded to a factor between 0.40 and 1.00 so it can only ever **reduce** a wind speed, never raise one.
- It is labelled in the interface: *anchorage figure is estimated from wind direction against the mouth of the bay, not measured*.
- Estimation is applied only when the feed genuinely returns identical values inshore and offshore, and the payload carries an explicit `anchorageEstimated` flag.
- A reading older than thirty minutes drops to a stale presentation: map dimmed, all motion stopped, age stated in words.
- If the feed fails with nothing cached, **the map is removed rather than drawn**. Nothing is interpolated or extrapolated.
- A location without its own committed basemap and its own sample coordinates gets no card at all, so no bay is ever shown another bay's data.

**Reliability**

- Every upstream response is shape-checked before use; a non-numeric wind value throws rather than propagating.
- The last good payload is persisted, so a failed refresh degrades to stale rather than to nothing.
- A React error boundary wraps the application, so a feed returning an unexpected shape produces a readable message instead of a blank page. This is covered by a test that reproduces the original crash.

---

## Execution Velocity and Iteration

**Problem framing first.** The specification, its review, and its decomposition into build packets are in `docs/`, unedited. Framing came before any code was written.

**AI as the build medium.** I wrote and reviewed the specification with AI, decomposed it into build packets, and ran AI agents in parallel against those packets. 282 commits between 13 and 26 February 2026 across nine working days, 115 of them in a single day.

**Iteration driven by real failure modes.** The wind field card, added later in a single day, is the clearest record of this. Three problems surfaced only against real data and real rendering:

1. **A contradiction in the design brief.** It stated an arrow formula of `direction - 90`, then worked the example as ENE giving 157.5 degrees, which requires `+ 90`. Implemented as written, every arrow would have pointed into the wind rather than with it. On a page used to choose an anchorage, a reversed arrow is worse than no arrow, and the brief said so itself. I took the worked example over the stated rule and verified it against rendered output.
2. **A data source that could not support the product claim.** Discovered only by querying every model the service offers and comparing all eight sample points. No implementation approach would have resolved it; the response had to be a product decision.
3. **Two crashes found by writing tests, not by reading code.** An error payload without a grid took down the entire page, and the loading state was five pixels shorter than the loaded state. Both fixed; both now covered.

**Verification over assertion.** The seamless-loop requirement was proved by pausing the animation at exact cycle boundaries and hashing frames rather than by inspection: identical at t=0 and t=6s, different mid-cycle, motion monotonic downwind.

---

## Measurable Outcomes

**Delivery and system metrics (measured):**

| Metric | Value |
|---|---|
| Build velocity | 282 commits / 9 working days, one person |
| Codebase | ~10,900 lines TypeScript, 22 backend endpoints, 37 migrations |
| Upstream calls per location | Capped at 144/day by a 10-minute cache, independent of traffic |
| Cached conditions response | 0.15 to 0.35s warm |
| Client bundle | 348 KB, 100 KB gzipped, no map or charting library |
| Test suite | 11 Playwright specs, 2.7s, runs with no keys and no database |
| Extraction throughput | One marina page to a 22-field structured record per call, versus manual transcription |

**Product outcomes (not yet measured).** The product has no user base, so adoption, retention and revenue figures do not exist and are not estimated here. The instrumentation that would produce them is the launch-notification signup on every location not yet live, which is the only genuine demand signal currently in the system and is intended to decide which bay is built next.

**Commercial thesis.** Berth availability and services data is worth more to a marina that wants to be found than to a cruiser who wants to look. A listing product has a buyer; a conditions app has users. That is the direction I would take this if it were being taken further.

---

## Tech Stack and Quickstart

**Application**: React 19, TypeScript, Vite, React Router
**Backend**: Express 5 on Node, Supabase (PostgreSQL with row-level security)
**AI**: Claude Sonnet for schema-constrained extraction, admin-gated
**Data**: Open-Meteo (weather, marine), OpenStreetMap (coastline geometry, ODbL)
**Testing**: Playwright, backend stubbed
**Deployment**: nginx serving static files, PM2 supervising the API, Let's Encrypt

Not installable as published, since credentials are redacted. With your own Supabase project:

```bash
git clone git@github.com:kgsubs/baystats_public.git
cd baystats_public
npm install
cp .env.example .env        # fill in Supabase URL and keys
npm run dev                 # Vite on 5173, API on 3457
npm test                    # Playwright, no keys required
```

---

## Repository Map

| Path | Contents |
|---|---|
| `docs/PRD.md` | The product specification |
| `docs/packets/` | The build packets the specification was decomposed into |
| `docs/BUILD_RECORD.md` | What each packet produced |
| `design_handoff_wind_field_card/` | Design brief and reference designs for the wind card |
| `netlify/functions/marina-scrape.ts` | The extraction pipeline and its guardrails |
| `netlify/functions/wind-field.ts` | Batched conditions fetch, cache, and shelter model |
| `src/components/windfield/` | The wind card and its committed coastline geometry |
| `src/config/windField.ts` | Per-location basemaps and sample coordinates |
| `tests/` | Playwright suite |
| `supabase/migrations/` | Schema in order, including row-level policies |

---

Weather and marine data from [Open-Meteo](https://open-meteo.com). Coastline geometry (c) [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, ODbL.
