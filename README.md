# BayStats

*My client work stays confidential, so I build personal projects like this to share how I think and work.*

*I built this app while living aboard an [Oceanis 473](https://www.beneteau.com/oceanis-1995-2008/oceanis-clipper-473) wondering why there wasn't a free, simple to use tool that told me all the important stuff needed to plan the sail for day and didn't have a UI that looked so 1999.*

**Live Build:** [baystats.com](https://baystats.com)

This repository is the real source behind the live product, published as a case study and licensed
under MIT (see [License](#license)). It is fully installable with your own accounts and API keys for
Supabase, Gemini and Resend.

**CONTENTS**

- [WHAT IS THIS?](#what-is-this)
- [DESIGN PRINCIPLES & BUSINESS VALUE](#design-principles--business-value)
- [TECHNICAL OVERVIEW](#technical-overview)
  - [ARCHITECTURE](#architecture)
  - [KEY DECISIONS](#key-decisions)
  - [SECURITY](#security)
  - [MODELED FIGURES](#modeled-figures)
  - [HOW IT WAS PLANNED AND TESTED](#how-it-was-planned-and-tested)
  - [PROJECT STRUCTURE](#project-structure)
  - [STACK](#stack)
- [RUN IT YOURSELF](#run-it-yourself)
- [LICENSE](#license)

## WHAT IS THIS?

BayStats is a live conditions dashboard for sailors at Caribbean marinas. It brings together wind,
weather and storm information with facility details for each marina, such as contact info, VHF
channel, slips and moorings, and services, on one screen that works on a phone.

Facility details come from free-text listings in a public port directory (MarineLink), each written
by a different contributor in its own layout. An AI model reads each listing and fills in the same
fixed set of fields, so one pipeline handles every layout, and a person approves each record before
it appears on the dashboard. Weather, wind and sea state come from Open-Meteo, storm information from
the National Hurricane Center, and sun and moon times from sunrise-sunset.org; server code fetches,
caches and computes them directly. Estimated figures are labeled as estimates, and a figure whose
feed is down is hidden until fresh data arrives.

| | | |
|---|---|---|
| ![Dashboard, light](docs/screenshots/dashboard-light.png) | ![Dashboard, dark](docs/screenshots/dashboard-dark.png) | ![Wind on the Water](docs/screenshots/wind-card.png) |
| Rodney Bay, light | The same, dark | The wind field card |

---

## DESIGN PRINCIPLES & BUSINESS VALUE

- **AI extraction into a fixed form, with a human review queue.** Supplier and vendor directories,
  real-estate or rental listings, healthcare provider directories, contract and compliance document
  intake. Any case where the information exists as free text across many sources and must end up in
  a consistent database.
- **Trusted and untrusted data kept on separate paths.** Any product that mixes AI-generated content
  with authoritative numbers, such as financial dashboards or operations reporting.
- **Cached upstream feeds with a last-good fallback.** Field-operations dashboards for construction,
  logistics, agriculture or events that depend on weather or third-party data and must stay up and
  inside the provider's rate limits when those feeds fail.
- **Estimates labeled as estimates, and a database locked down to what the application actually
  needs.** Any dashboard that shows a modeled figure next to measured ones, and any product where a
  security review has to be able to say, in one sentence, who can read and write what.

---

## TECHNICAL OVERVIEW

### ARCHITECTURE

Two pipelines, separated by how far their output can be trusted. Facility data is extracted by a
model and approved by a person. Conditions data is fetched and computed by fixed server code.

**Pipeline 1: facility extraction (admin-triggered, human-approved)**

```
[ Free-text marina listing, MarineLink ]
            |
            v
[ Gemini, schema-enforced output ]   schema-valid output moves on
            |
            v
[ Server-side field validation ]     each bad field is set to a safe default
            |
            v
[ Review queue ]                     an admin approves each record
            |
            v
[ Supabase, row-level security ]     public queries read approved records
            |
            v
[ Public dashboard ]
```

**Pipeline 2: conditions (fixed server code)**

```
[ 8 sample points, one request ] -> [ Open-Meteo ] -> [ shape check ]
            |
            v
[ 10-minute server cache + last-good value ]
            |
            v
[ Shelter model ] -> [ SVG map, estimate labeled ]
```

Every figure on the dashboard comes from a data feed or is labeled as an estimate. The earlier tide
and current cards presented a modeled estimate as a reading, so they were removed.

### KEY DECISIONS

- **AI runs on admin request.** Extraction runs when an admin submits a page, which keeps AI cost
  tied to admin work and independent of site traffic. (`netlify/functions/marina-scrape.ts`,
  `verifyAdminFromCookie`)
- **Extraction is checked twice.** Gemini is constrained to the 22-field schema
  (`responseMimeType` plus `responseJsonSchema`), which guarantees valid JSON. `sanitizeMarinaData`
  then checks each value and sets any bad field to a safe default. A scrape is saved when it has at
  least a name and a location.
- **A re-scrape of a published marina is stored beside it.** The new extraction goes into
  `scraped_data` for comparison, and the published record and admin edits stay as they are.
- **The scraper fetches one approved source.** It requires HTTPS and one exact hostname, and stops
  at any redirect. (`scrapeMarinaPage`)
- **One weather request per location, cached at the server.** All 8 sample points come back in one
  Open-Meteo call, cached for 10 minutes, with the last good value served if a fetch fails. This
  holds upstream calls at a fixed rate regardless of site traffic. (`netlify/functions/wind-field.ts`,
  `CACHE_MS`)
- **Estimates are bounded and labeled.** See [Modeled figures](#modeled-figures).
- **Plain React and SVG.** The wind field is inline SVG over committed coastline geometry, motion is
  CSS keyframes, and state is component state plus a few hooks.

### SECURITY

- **Database.** `supabase/schema.sql` is dumped from the live database. Row-level security is on for
  all 11 tables (8 policies). Every function has a pinned `search_path` and performs one specific
  operation; an earlier general-purpose SQL function was removed
  (`supabase/migrations_history/031_security_lockdown.sql`).
- **Admin functions.** The schema limits the two functions that manage admin status to the server,
  overriding Supabase's default grants to anonymous and signed-in users. (`supabase/schema.sql`, end
  of file)
- **Sign-in.** An emailed one-time link. Sign-in and session tokens are stored as SHA-256 hashes.
  (`src/lib/auth.ts`)
- **Public data.** Public endpoints return a fixed list of public columns.
  (`netlify/functions/admin-marinas.ts`, `PUBLIC_MARINA_COLUMNS`)
- **Errors.** A malformed request gets a short JSON error message.
- **Feed failures.** When the hurricane feed fails or cannot be read, Storm Watch shows
  `unavailable` (`netlify/functions/tropical.ts`). The wind card serves its last good value, or hides
  the map.

### MODELED FIGURES

Open-Meteo samples 8 points spanning 2 to 5 km, depending on the bay, and returns the same value at
all 8, because its grids are 2 to 25 km wide. The sheltering effect the wind card exists to show is
finer than the feed resolves, so the anchorage figure is modeled:

- **Bounded.** It comes from wind direction against the bay's mouth bearing, clamped to a factor of
  0.40 to 1.00, so it scales a wind speed down by up to 60 percent.
- **Labeled.** The interface says beneath the number: *anchorage figure is estimated from wind
  direction against the mouth of the bay, not measured*.
- **Hidden on failure.** With the feed down and the cache empty, the map is hidden until fresh data
  arrives. (`src/components/windfield/WindFieldCard.tsx`)

### HOW IT WAS PLANNED AND TESTED

- **Design.** The wind card's handoff sets its states, acceptance criteria and the rule that flow
  arrows point downwind (`design_handoff_wind_field_card/README.md`). It took two design rounds; the
  first had the arrows pointing the wrong way.
- **Build plan.** The packet dependency graph, scope limits and per-packet gates are in
  `docs/BUILD_RECORD.md` (the pre-execution specification, labeled as such).
- **Risks.** Risks, mitigations and open questions are in `docs/PRD.md`, sections 10 and 11. The
  "What changed since this plan" note near the top of that file covers what shipped differently.
- **Tests.** 20 unit tests (`unit/`: extraction validation, shelter-factor math, storm outlook
  parsing, wind readings, token hashing) and 17 browser tests (`tests/`, against a stubbed backend).
  Both run offline.

### PROJECT STRUCTURE

```
.
|-- server/index.ts                    Express entry, mounts every handler
|-- netlify/functions/                 Request handlers (historical folder name; served by Express)
|   |-- marina-scrape.ts               Gemini extraction pipeline and its guardrails
|   |-- wind-field.ts                  Batched conditions fetch, cache, shelter model
|   |-- weather.ts, tropical.ts, ...   Remaining conditions endpoints
|   `-- auth-*.ts                      Emailed-link sign-in, hashed tokens
|-- src/
|   |-- pages/                         Dashboard, account, admin screens
|   |-- components/windfield/          The wind card
|   |-- config/windField.ts            Per-location basemaps and sample coordinates
|   |-- config/locations.ts            The 16-location registry (2 live: Rodney Bay, Marigot Bay)
|   |-- hooks/                         Data fetching, one hook per feed
|   `-- lib/                           Auth (hashed tokens), Supabase client, access rules
|-- supabase/schema.sql                Full schema, dumped from the live database
|-- supabase/seed.sql                  The five approved marinas
|-- supabase/migrations_history/       The migrations that built it, kept as a record
|-- scripts/create-admin.ts            Grants admin to an email address
|-- scripts/dump-schema.sh             Regenerates supabase/schema.sql from a live database
|-- tests/, unit/                      Playwright (stubbed backend) and Node unit tests
|-- deploy/                            nginx template, certificate bootstrap, PM2 config
`-- docs/                              Specification, packets, build record
```

### STACK

| Layer | Choice | Notes |
|---|---|---|
| **Frontend** | React 19, TypeScript, Vite 7 | Dashboard styled from an inline theme object; Tailwind for the admin screens |
| **Routing** | React Router 7 | Single-page app, served as static files |
| **Backend** | Express 5 on Node, TypeScript | Handlers live in `netlify/functions/` (historical name) and are mounted by `server/index.ts` |
| **Database** | Supabase, PostgreSQL | Row-level security on all 11 tables; review status also enforced in application code |
| **Auth** | Session tokens in an httpOnly cookie, stored hashed | Sign-in by emailed link |
| **AI** | Google Gemini | Schema-enforced extraction, admin-triggered |
| **Email** | Resend | Sign-in links |
| **Weather data** | Open-Meteo | One batched request per location, cached 10 minutes |
| **Storm data** | National Hurricane Center | Atlantic feed and tropical outlook |
| **Sun and moon** | sunrise-sunset.org, Open-Meteo | Daily times per location |
| **Map geometry** | OpenStreetMap coastline, ODbL | Projected, simplified, committed as SVG paths |
| **Testing** | Node test runner, Playwright | Run offline |
| **Web server** | nginx | Serves built files from the origin server |
| **Process supervision** | PM2 | Keeps the API running |
| **TLS** | Let's Encrypt | Issued and renewed by certbot |

---

## RUN IT YOURSELF

**What you need**

- Node 20 or later
- A Supabase project (the database)
- A Gemini API key from Google AI Studio (the AI extraction)
- A Resend account with a verified sending domain (sign-in emails)

**1. Get the code**

```
git clone https://github.com/kgsubs/baystats_public.git
cd baystats_public
npm ci
```

**2. Check it works (runs offline)**

```
npm run test:unit
npx playwright install chromium
npm test
```

The second line is needed the first time only.

**3. Add your settings**

```
cp .env.example .env
```

Then fill in these lines in `.env`:

| Setting | What goes there |
|---|---|
| `VITE_SUPABASE_URL` | Supabase: Project Settings, API Keys, the project URL |
| `SUPABASE_SERVICE_KEY` | Same page: the secret key |
| `SUPABASE_DB_URL` | Supabase: Connect, Session pooler string, with your database password in it |
| `GEMINI_API_KEY` | Google AI Studio: Get API key |
| `RESEND_API_KEY` | Resend: API Keys |
| `EMAIL_FROM` | `Your Name <you@your-verified-domain>` |
| `SITE_URL` | `http://localhost:5173` |
| `ADMIN_EMAIL` | The email address you will sign in with |

**4. Set up the database**

Run both files against your database. Replace `<SUPABASE_DB_URL>` with the same string you put in
`.env`:

```
psql "<SUPABASE_DB_URL>" -v ON_ERROR_STOP=1 -f supabase/schema.sql
psql "<SUPABASE_DB_URL>" -v ON_ERROR_STOP=1 -f supabase/seed.sql
```

Or paste each file into the Supabase SQL editor, schema first. The seed adds the five approved
marinas.

**5. Start it**

```
npm run dev
```

Open http://localhost:5173.

**6. Make yourself an admin**

```
npx tsx scripts/create-admin.ts
```

Sign in at http://localhost:5173/admin/login with your `ADMIN_EMAIL`, then extract your first marina
from its MarineLink page.

**Deploying to a server:** `deploy/` has the nginx template, the certificate bootstrap
(`golive.sh`) and the PM2 config (`ecosystem.config.cjs`).

---

## LICENSE

MIT. See [LICENSE](LICENSE).

---

Weather and marine data from [Open-Meteo](https://open-meteo.com). Storm data from the
[National Hurricane Center](https://www.nhc.noaa.gov). Coastline geometry (c)
[OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, ODbL.
