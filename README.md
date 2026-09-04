# BayStats

A live marina conditions board for sailors in St. Lucia. One screen answers the questions a cruiser asks before moving the boat: what is the weather doing, when is the tide, where is the shelter, and can I get a berth tonight.

**Live at [baystats.com](https://baystats.com)**. No account, nothing gated, works on a phone in a cockpit.

| | | |
|---|---|---|
| ![Dashboard, light](docs/screenshots/dashboard-light.png) | ![Dashboard, dark](docs/screenshots/dashboard-dark.png) | ![Wind on the Water](docs/screenshots/wind-card.png) |
| Rodney Bay, light | The same, dark | The wind field card |

---

## Why it exists

Cruisers arriving in the Eastern Caribbean piece together their picture of a bay from four or five places: a weather app that knows nothing about marinas, a tide table, a cruising guide two seasons out of date, and a WhatsApp group. Marina phone numbers and VHF channels are the hardest part to find and the most urgent when you need them.

BayStats puts the whole picture on one screen, per marina, and keeps the operational details (phone, VHF channel, slips, moorings, fuel, water, power) beside the conditions rather than three sites away.

## What it does

- **Conditions at a glance**: wind, sky, humidity, and a plain verdict on whether it is fair sailing
- **Wind on the Water**: a small map of the bay showing where the shelter is, with the wind outside the bay and inside the anchorage side by side
- **Local forecast**: three days, no hourly noise
- **Current and tide**: speed, direction, height, next high and low
- **Storm watch**: active systems and the seven-day tropical outlook for two basins
- **Sun and moon**: sunrise, sunset, moon phase, framed as whether there is light to anchor by
- **Marina services**: berths, moorings, fuel, water, power, chandlery, laundry, with the ones a boat actually needs listed first
- **Contact**: phone, email and VHF channel, one tap each

Two marinas are live. The other twenty-two show as coming soon and collect an email for launch, because shipping two bays with real data beats twenty-four with guesses.

## How it was built

One person, February to September 2026, with AI as the primary build medium rather than an autocomplete. The specification was generated and reviewed by AI, decomposed into build packets, and executed by AI agents working in parallel against those packets. `docs/` contains the specification, the execution plan and the build record, unedited.

That approach produced roughly 13,000 lines across 22 API endpoints and 37 database migrations. It also produced a lot of debris (dead components, a superseded dashboard, a test suite written against a screen that no longer existed), which is the honest cost of moving that fast and is worth saying out loud.

The human work was not typing. It was framing the problem, deciding what to cut, and catching the places where the machine was confidently wrong. The next section is the clearest example.

## The wind card: a worked example of judgment

`design_handoff_wind_field_card/` holds a design brief for a card that turns a single wind reading into a map of where the shelter is. Building it surfaced three problems that no amount of implementation skill would have solved.

**The brief contradicted itself.** It specified an arrow angle of `direction - 90`, then worked the example as ENE giving 157.5 degrees, which requires `+ 90`. Following the stated formula would have pointed every arrow into the wind instead of downwind. On a sailing page that is the one error the brief itself called "actively harmful". The worked example was right and the formula was wrong. Verified against the rendered output before shipping.

**The data source could not support the claim.** The card's whole purpose is to show that the anchorage is calmer than the open sea. The specified feed samples eight points across roughly two kilometres, and every available model returns the identical value at all eight, because their grids are 2 to 25 km wide. The shelter effect is finer than anything the feed can resolve.

**So the number is labelled, not faked.** Rather than print the same figure twice, or silently invent a difference, the anchorage figure comes from a documented terrain model, wind direction against the mouth of the bay, and the card says so on its own line: "anchorage figure is estimated from wind direction against the mouth of the bay, not measured". It can only ever reduce a wind speed, never raise one. When the feed fails entirely and there is nothing cached, the map is **removed** rather than drawn from stale or interpolated data.

That is the guardrail pattern this project takes seriously: a probabilistic or modelled output is fine, as long as the person reading it can tell it apart from a measurement.

## Limitations, stated plainly

- The anchorage wind is a model, not an observation. Fixing it properly needs a sensor in the bay.
- Two marinas have real data. The rest are placeholders behind a coming-soon screen.
- Tide and current are computed from harmonic parameters per location, not from a gauge.
- Forecast data is a public model with no marine-specific correction for these islands.
- There is no user testing behind the layout yet. The card order is my judgment, not evidence.

## Product decisions, including the ones reversed

- **The paywall was removed entirely.** It had been built: checkout, webhooks, tiers, a locked-region banner. Two marinas of real data does not justify charging, and a demo that asks for a credit card gets no feedback. Every trace was cut rather than disabled.
- **Locations were narrowed from twenty-four to two.** The rest became a coming-soon screen that captures an email. Fewer bays, honestly served, plus a signal of which bay to build next.
- **Sign-in was hidden.** Nothing on the page needs an account, so the entry point is gone rather than sitting there implying a wall.
- **The clearance card was cut from the public view.** Customs and immigration hours change without notice and being wrong about them is worse than being silent.
- **Rejected: inventing shelter data.** The easy version of the wind card interpolates a plausible anchorage number and looks better. It would also be a lie told to someone deciding where to spend the night.

## What I would do next

1. **Put a sensor in Rodney Bay.** It converts the wind card's estimate into a measurement, which is the difference between a nice graphic and a reason to open the app daily.
2. **Instrument the coming-soon signups.** They are already the only real demand signal in the product; the next bay to build should be whichever one people ask for most.
3. **Sell to marinas, not sailors.** The berth availability and services data is worth more to a marina wanting to be found than to a cruiser wanting to look. A listing product has a buyer; a weather app mostly has users.

## How it works

A React single-page app served as static files by nginx, talking to a small Express API kept alive by PM2 on the same box, with Supabase for storage. Upstream weather calls are cached server-side so a page view never triggers an outbound request. The wind map is inline SVG generated from data plus a committed coastline path: no map tiles, no charting library, no animation library, no new dependencies.

React 19 / TypeScript / Vite / Express / Supabase / Playwright / nginx / PM2

## Repository map

| Path | What is in it |
|---|---|
| `docs/PRD.md` | The product specification |
| `docs/packets/` | Build packets the specification was decomposed into |
| `docs/BUILD_RECORD.md` | What was actually built, packet by packet |
| `design_handoff_wind_field_card/` | Design brief and reference designs for the wind card |
| `src/components/windfield/` | The wind card, and the committed coastline geometry |
| `netlify/functions/` | API handlers, including the cached wind field endpoint |
| `tests/` | Playwright suite, backend stubbed so it runs without keys |
| `supabase/migrations/` | Schema, in order |

## Running it

Not installable as published, because the keys are redacted. With your own Supabase project and a `.env` filled from `.env.example`:

```
npm install
npm run dev     # Vite on 5173, API on 3457
npm test        # Playwright, no keys needed, backend stubbed
```

---

Weather and marine data from [Open-Meteo](https://open-meteo.com). Coastline geometry (c) [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, ODbL.
