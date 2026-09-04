# BayStats | Marina Conditions for the Eastern Caribbean

> **Product case study.** Cruising sailors assemble a picture of a bay from four or five disconnected sources before deciding whether to move the boat. BayStats consolidates that onto one screen per marina, uses a language model to turn unstructured marina web pages into reviewed structured records, and states plainly where its wind figures are modelled rather than measured.

**Live: [baystats.com](https://baystats.com)** | Built solo | 282 commits across 9 working days

| | | |
|---|---|---|
| ![Dashboard, light](docs/screenshots/dashboard-light.png) | ![Dashboard, dark](docs/screenshots/dashboard-dark.png) | ![Wind on the Water](docs/screenshots/wind-card.png) |
| Rodney Bay, light | The same, dark | The wind field card |

---

## Executive Summary and Problem Framing

**The problem.** A cruiser deciding whether to move needs six things at once: wind, tide, current, the storm outlook, whether the anchorage is sheltered, and whether the marina has space. Those facts are scattered across a weather app that knows nothing about marinas, a tide table, a cruising guide two seasons out of date, the marina's own website if it has one, and a WhatsApp group. The operational details are both the hardest to find and the most urgent. Locating a marina's VHF channel at dusk in a rising wind currently takes three websites.

**Why an AI-first approach was necessary.** Marina data does not exist in structured form anywhere. Berth counts, mooring availability, fuel and water, customs hours and VHF channels sit in prose on third-party listing sites, laid out differently on every page. A hand-written scraper per marina stops being viable after a handful and breaks whenever a site changes its layout. A language model extracting against a fixed schema handles all of them, and when it meets an unfamiliar page it returns partial data rather than nothing. That is what made twenty-four locations tractable for one person working alone.

**The solution.** One screen per marina carrying conditions and operational detail together, backed by a batched weather pipeline cached on the server, an extraction pipeline that fills marina records subject to human approval, and a wind field map that shows where the shelter is with its modelled component labelled.

---

## System Architecture and AI Design

There are two pipelines, separated according to how far their output can be trusted.

**Pipeline 1: marina data extraction, admin only, human-gated**

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

**Pipeline 2: conditions, deterministic and cached**

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

- **The extraction is schema-constrained rather than conversational.** The model receives a fixed twenty-two field JSON structure and fills it from the page text. I considered a chat interface and rejected it, since anything it produced would still have needed the same human review before entering the database, and it would have been considerably harder to validate.
- **Model output cannot reach a reader unreviewed.** Extracted rows are written with a status of `pending_review`, and the public read policy lives in the database rather than the application, so a mistake in the interface cannot expose an unapproved record.
- **The model touches only the prose problem.** Weather, tide, current and astronomical figures come from numeric feeds and are never passed through it. Turning inconsistent prose into fields is the one job here where a language model genuinely outperforms the alternatives.
- **Weather calls are cached on the server for ten minutes.** Each location therefore makes at most 144 upstream requests a day regardless of how much traffic the site sees, which keeps the app inside a free tier while staying current enough for a conditions board.
- **The map carries no runtime dependency.** The wind field is inline SVG drawn from the data over coastline geometry I pulled from OpenStreetMap, projected into the viewBox, simplified with Douglas-Peucker and committed as fixed paths: 2,117 source points reduced to 123 for Rodney Bay and 58 for Marigot Bay. It uses no map tiles and no charting or animation library.

---

## Probabilistic System Design and Guardrails

The system has two non-deterministic surfaces. One is a language model reading prose. The other is a physical estimate filling in for a measurement that does not exist. They are contained in different ways.

**Language model output**

| Risk | Control |
|---|---|
| Fabricated or malformed fields | Fixed 22-field JSON schema stated in the prompt, response run through a JSON extraction step |
| Unparsable response | Hard error returned to the caller, with no partial record written |
| Plausible but incorrect values reaching readers | Every extracted row is written as `pending_review` and needs explicit human approval |
| An application bug exposing unreviewed data | Read access is gated by a database row-level policy on `status`, independent of application code |
| Endpoint abuse | Extraction requires an authenticated admin and is unreachable from the public interface |

**Modelled physical output**

The weather service samples eight points spread across roughly two kilometres and returns an identical value at every one of them, because its grids are between two and twenty-five kilometres wide. The sheltering effect the card exists to show is finer than the feed can resolve. Printing the same number in both rows would have made the card pointless, and inventing a difference would have been dishonest, so the anchorage figure is modelled and marked:

- It derives from a stated model, the wind direction measured against the bearing of the bay's mouth, bounded to a factor between 0.40 and 1.00 so that it can only ever reduce a wind speed.
- The interface says so directly beneath the number: *anchorage figure is estimated from wind direction against the mouth of the bay, not measured*.
- The model is applied only when the feed actually returns identical values inshore and offshore, and the response carries an explicit `anchorageEstimated` flag.
- A reading more than thirty minutes old switches to a stale presentation, with the map dimmed, all motion stopped and the age stated in words.
- When the feed fails and nothing is cached, the map is removed rather than drawn. No value is interpolated or extrapolated to fill the gap.
- A location without its own committed basemap and its own sample coordinates gets no card, so one bay is never shown another bay's data.

**Reliability**

Every upstream response is shape-checked before use, and a non-numeric wind value throws rather than propagating into the interface. The last good payload is persisted, so a failed refresh degrades to a stale reading instead of to nothing. A React error boundary wraps the application, so a feed returning an unexpected shape produces a readable message rather than a blank page, and a test reproduces the original crash to prove it.

---

## Execution Velocity and Iteration

Framing came before code. The specification, its review, and its decomposition into build packets are all in `docs/`, unedited.

I then wrote and reviewed that specification with AI, broke it into build packets, and ran AI agents in parallel against them: 282 commits between 13 and 26 February 2026 across nine working days, 115 of them on a single day.

The wind field card, added later in one day, records how the iteration actually went. Three problems surfaced only when the thing met real data and rendered on a real screen.

1. **The design brief contradicted itself.** It gave an arrow formula of `direction - 90`, then worked an example as ENE producing 157.5 degrees, which requires `+ 90`. Built as written, every arrow would have pointed into the wind, telling sailors to anchor on the exposed side of the bay. I took the worked example over the stated rule and checked it against the rendered output.
2. **The data source could not support the claim the card was making.** I found this by querying every model the service offers and comparing the values it returned at all eight sample points. No implementation approach would have fixed it, so the answer had to be a product decision.
3. **Two crashes turned up while writing tests.** An error payload with no grid took down the whole page, and the loading state stood five pixels shorter than the loaded state. Both are fixed and both are now covered.

Where a requirement was hard to eyeball, I measured it. The seamless animation loop was confirmed by pausing the animation at exact cycle boundaries and hashing the frames: identical at t=0 and t=6s, different mid-cycle, and moving consistently downwind.

---

## Measurable Outcomes

Delivery and system figures, all measured:

| Metric | Value |
|---|---|
| Build velocity | 282 commits over 9 working days, one person |
| Codebase | ~10,900 lines of TypeScript, 22 backend endpoints, 37 migrations |
| Upstream calls per location | Capped at 144 a day by the cache, independent of traffic |
| Cached conditions response | 0.15 to 0.35 seconds warm |
| Client bundle | 348 KB, 100 KB gzipped, with no map or charting library |
| Test suite | 11 Playwright specs in 2.7 seconds, requiring no keys and no database |
| Extraction throughput | One marina page to a 22-field structured record per call |

Product outcomes do not exist yet. The site has no user base, so there are no adoption, retention or revenue figures, and I have not estimated any. The instrumentation that would eventually produce them is the launch-notification signup attached to every location not yet live, which is currently the only genuine demand signal in the system and is meant to determine which bay gets built next.

On where the commercial value sits: marinas have a direct interest in being found and described accurately, and would pay for a listing. Cruisers want the same data and would not pay for it. If this were taken further, the marina side is where I would take it.

---

## Tech Stack and Quickstart

**Application**: React 19, TypeScript, Vite, React Router
**Backend**: Express 5 on Node, Supabase (PostgreSQL with row-level security)
**AI**: Claude Sonnet for schema-constrained extraction, admin-gated
**Data**: Open-Meteo for weather and marine, OpenStreetMap for coastline geometry
**Testing**: Playwright against a stubbed backend
**Deployment**: nginx serving static files, PM2 supervising the API, Let's Encrypt

The published repository is not installable, since credentials are redacted. With your own Supabase project:

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
| `netlify/functions/wind-field.ts` | Batched conditions fetch, cache and shelter model |
| `src/components/windfield/` | The wind card and its committed coastline geometry |
| `src/config/windField.ts` | Per-location basemaps and sample coordinates |
| `tests/` | Playwright suite |
| `supabase/migrations/` | Schema in order, including row-level policies |

---

Weather and marine data from [Open-Meteo](https://open-meteo.com). Coastline geometry (c) [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, ODbL.
