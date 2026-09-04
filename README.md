# BayStats

BayStats is a conditions board and extraction pipeline for bay and marina data. It automates the collection of unstructured marina facility prose, parses it into a fixed schema using an LLM pipeline, pairs it with cached marine weather data, and presents verified condition reports through a lightweight web interface.

This repository is a hands-on case study in framing a real data friction problem, building an AI extraction pipeline to solve it, and enforcing strict security and cost guardrails at the database and application levels.

**Live: [baystats.com](https://baystats.com)**

| | | |
|---|---|---|
| ![Dashboard, light](docs/screenshots/dashboard-light.png) | ![Dashboard, dark](docs/screenshots/dashboard-dark.png) | ![Wind on the Water](docs/screenshots/wind-card.png) |
| Rodney Bay, light | The same, dark | The wind field card |

---

## Problem Framing

Marina facility details are scattered across dozens of individual, unstandardized third-party websites. The data exists almost entirely as unstructured prose.

Building and maintaining traditional CSS/DOM scrapers for dozens of independent sites is unscalable, since minor layout changes break scrapers constantly. Large Language Models, by contrast, extract structured data reliably from variable natural language.

BayStats uses an LLM-driven ingestion pipeline to normalize inconsistent prose into a single, predictable format without writing or maintaining per-site scraping scripts.

---

## System Architecture

Two pipelines, separated by how far their output can be trusted. Facility data passes through a model and a human. Weather data does neither.

**Pipeline 1: facility extraction, admin-triggered, human-gated**

```
[ Unstructured prose, third-party marina page ]
                 |
                 v
[ LLM extraction and validation ]  ---> unparsable schema fails hard, zero writes
                 |
                 v
[ Pending review queue ]           ---> admin-authenticated verification
                 |
                 v
[ Supabase with RLS ]              ---> database policy isolates unverified records
                 |
                 v
[ Public UI ]
```

**Pipeline 2: conditions, fully deterministic**

```
[ 8 coordinates, one batched request ]
                 |
                 v
[ Open-Meteo ] -> [ shape validation ] -> [ 10-minute origin cache + last-good store ]
                 |
                 v
[ Shelter model ] -> [ SVG map, estimate labelled ]
```

Weather, tide, current and astronomical figures never pass through a model.

### Ingestion and Extraction Pipeline

- **LLM parsing.** Extracted prose is constrained to a fixed 22-field JSON schema stated in the prompt, using Anthropic models. If a response cannot be parsed against that schema, the extraction fails hard and nothing is written to the database.
- **Isolated cost surface.** LLM extraction is admin-authenticated (`netlify/functions/marina-scrape.ts`) and triggered manually per page. It is strictly off the public user request path, so public traffic cannot drive up API token costs.

### Security and Data Validation

- **Human-in-the-loop review.** Every record the extraction pipeline produces lands in a pending review queue before public display.
- **Database-level isolation.** Access control is enforced by Supabase Row Level Security policies. Unreviewed records cannot be read by public queries, so a frontend or application bug cannot leak unverified data.

### Serving Layer and Rate Discipline

- **Origin-side caching.** Upstream weather data from Open-Meteo is cached server-side in a PostgreSQL `wind_field_cache` table with a 10-minute TTL (`CACHE_MS = 10 * 60 * 1000`).
- **Hard request ceiling.** That cache limits upstream calls to 144 requests per location per day, regardless of public traffic volume.
- **Origin delivery.** Static assets are served directly from origin by nginx. There is no CDN or edge layer.

### Modelled Figures

Open-Meteo samples 8 points across roughly 2 km and returns an identical value at all 8, because its grids are 2 to 25 km wide. The sheltering effect the wind card exists to show is finer than the feed resolves.

- **Bounded.** The anchorage figure derives from wind direction against the bay's mouth bearing, clamped to a factor of 0.40 to 1.00, so it can only reduce a wind speed.
- **Labelled.** Stated in the interface beneath the number: *anchorage figure is estimated from wind direction against the mouth of the bay, not measured*.
- **Removed on failure.** Feed down with no cache: the map is removed, not drawn. No value is interpolated or extrapolated.

---

### Project structure

```
.
|-- server/index.ts                    Express entry, mounts every handler
|-- netlify/functions/                 Request handlers (historical folder name)
|   |-- marina-scrape.ts               LLM extraction pipeline and its guardrails
|   |-- wind-field.ts                  Batched conditions fetch, cache, shelter model
|   |-- weather.ts, tides.ts, ...      Remaining conditions endpoints
|   `-- auth-*.ts                      Emailed-link sign-in
|-- src/
|   |-- pages/                         Dashboard, account, admin screens
|   |-- components/windfield/          The wind card
|   |-- components/session/            Coming-soon modal, session badge
|   |-- config/windField.ts            Per-location basemaps and sample coordinates
|   |-- config/locations.ts            The 24-location registry
|   |-- hooks/                         Data fetching, one hook per feed
|   `-- lib/                           Auth, Supabase client, access rules
|-- supabase/migrations/               Schema in order, including row-level policies
|-- tests/                             Playwright, backend stubbed
|-- deploy/golive.sh                   nginx vhost and certificate bootstrap
`-- docs/                              Specification, packets, build record
```

---

## Technical Performance and Operational Telemetry

Built for low latency, a small resource footprint, and reliable local execution.

| Metric | Measured Value | Implementation Context |
| :--- | :--- | :--- |
| **Warm response latency** | `0.15s - 0.35s` | Origin response times measured against the live site |
| **Frontend bundle size** | `348 KB` (`100 KB` gzipped) | Compact client distribution footprint (`dist/`) |
| **Test suite velocity** | `2.7s` | Complete 11-test suite, no keys or database required |
| **Upstream request limit** | `144 calls/loc/day` | Enforced by the 10-minute server-side Postgres cache |
| **Build velocity** | `282 commits / 9 days` | Single contributor, AI-orchestrated build packets |

---

## Stack

| Layer | Choice | Notes |
|---|---|---|
| **Frontend** | React 19, TypeScript, Vite 7 | The public dashboard styles from an inline theme token object; Tailwind covers the admin screens only |
| **Routing** | React Router 7 | Single-page app, served as static files |
| **Backend** | Express 5 on Node, TypeScript | Handlers sit in `netlify/functions/` for historical reasons and are mounted by an adapter in `server/index.ts`. There is no Netlify deployment |
| **Database** | Supabase, PostgreSQL | Row Level Security policies gate every public read |
| **Auth** | Custom JWT in an httpOnly cookie | Sign-in by emailed link, so no password is ever stored |
| **AI** | Claude Sonnet | Schema-constrained extraction, admin-triggered, off the user request path |
| **Weather data** | Open-Meteo | One batched 8-coordinate request, cached server-side for 10 minutes |
| **Map geometry** | OpenStreetMap coastline, ODbL | Projected, simplified and committed as static SVG paths |
| **Testing** | Playwright | The backend is stubbed, so the suite needs no keys and no database |
| **Web server** | nginx | Serves built files from origin; no CDN or edge layer |
| **Process supervision** | PM2 | Keeps the API alive on the same host |
| **TLS** | Let's Encrypt | Issued and renewed by certbot |

### Deliberate omissions

- **No map or charting library.** The wind field is inline SVG generated from the data over committed coastline geometry.
- **No animation library.** Motion is CSS keyframes, generated per render so the flow vector always matches the current wind direction.
- **No CDN.** A single origin, with caching done server-side where the request ceiling can actually be enforced.
- **No state management library.** Component state and a handful of hooks cover the whole dashboard.

---

## Planning Docs

Everything written before and around the code. Kept unedited.

| Path | Contents |
|---|---|
| `docs/PRD.md` | Product specification |
| `docs/packets/` | The build packets the specification was decomposed into |
| `docs/BUILD_RECORD.md` | What each packet produced |
| `docs/EXECUTION_PLAN.md` | How the packets were dispatched |
| `design_handoff_wind_field_card/` | Design brief and reference designs for the wind card |

---

Weather and marine data from [Open-Meteo](https://open-meteo.com). Coastline geometry (c) [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, ODbL.
