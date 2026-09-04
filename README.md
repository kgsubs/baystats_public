# BayStats

I built a live conditions board for sailors in St. Lucia. One screen answers what a cruiser actually asks before moving the boat: what is the weather doing, when is the tide, where is the shelter, and can I get a berth tonight.

**Live at [baystats.com](https://baystats.com)**. No account, nothing behind a paywall, built to be read on a phone in a cockpit.

| | | |
|---|---|---|
| ![Dashboard, light](docs/screenshots/dashboard-light.png) | ![Dashboard, dark](docs/screenshots/dashboard-dark.png) | ![Wind on the Water](docs/screenshots/wind-card.png) |
| Rodney Bay, light | The same, dark | The wind field card |

---

## The problem I set out to solve

A cruiser arriving in the Eastern Caribbean assembles their picture of a bay from four or five places: a weather app that knows nothing about marinas, a tide table, a cruising guide two seasons out of date, and a WhatsApp group. The operational details are the hardest to find and the most urgent when you need them. Try locating a marina's VHF channel at dusk in a rising wind.

So I put the whole picture on one screen per marina, and kept the practical facts, phone number, VHF channel, slips, moorings, fuel, water, power, next to the conditions instead of three websites away.

## What it does

- **Conditions at a glance** so you get wind, sky and humidity plus a straight verdict on whether it is fair sailing
- **Wind on the Water**, a small map of the bay showing where the shelter is, with the wind outside the bay and inside the anchorage side by side
- **Local forecast** for three days, without hourly noise nobody reads
- **Current and tide**, including speed, direction, height and the next high and low
- **Storm watch**, covering active systems and the seven-day tropical outlook for two basins
- **Sun and moon**, framed around whether there will be light to anchor by
- **Marina services**, with the ones a boat actually needs, fuel, water, power, chandlery, listed before the ones it does not
- **Contact**, so phone, email and VHF are one tap each

Two marinas are live. The other twenty-two show as coming soon and collect an email for launch. I would rather ship two bays with real data than twenty-four with guesses.

## How I built it

I built this alone, using AI as the way the work got done rather than as autocomplete. I wrote and reviewed the specification with AI, broke it into build packets, and ran AI agents in parallel against those packets. Everything is in `docs/`, unedited: the specification, the execution plan, and the record of what each packet actually produced.

The pace shows in the commit history. 282 commits between 13 and 26 February 2026, across nine working days, 115 of them on one day. The wind field card and a cleanup pass came later, in a single day in September.

That got me roughly 13,000 lines of code, 22 backend endpoints and 37 database migrations. It also left debris: components nothing used any more, an old version of the main screen still reachable, and a test suite written against a login form I had since replaced. That is the real cost of working this fast, and I would rather show it than pretend the output was tidy. Cleaning it up is part of the job, and this repository is the cleaned version.

My job here was not typing. It was framing the problem, deciding what to cut, and catching the places where the machine was confidently wrong. The next section is the sharpest example of that.

## Where judgment mattered: the wind card

`design_handoff_wind_field_card/` holds a full design brief for a card that turns a single wind reading into a map of where the shelter is. Building it turned up three problems that no amount of coding skill would have solved.

**The brief contradicted itself.** It gave a formula for which way the arrows point, then worked through an example that only makes sense with the opposite sign. Following the formula as written would have pointed every arrow into the wind instead of with it. On a page a sailor uses to decide where to anchor, an arrow pointing the wrong way is worse than no arrow at all, and the brief itself said so. I trusted the worked example over the stated rule, then checked it against what actually rendered before shipping.

**The data could not support the claim the card was making.** The card exists to show that the anchorage is calmer than the open sea. The specified weather service samples eight points spread over about two kilometres, and every model it offers returns the same number at all eight, because their measurement grids are two to twenty-five kilometres wide. The sheltering effect is finer than anything that service can see. No implementation would have fixed that.

**So I labelled the number instead of faking it.** Printing the same figure in both rows would have made the card pointless. Quietly inventing a difference would have been worse. Instead the anchorage figure comes from a stated model, how the wind direction sits against the mouth of the bay, and the card says so in plain words underneath: *anchorage figure is estimated from wind direction against the mouth of the bay, not measured*. It can only ever lower a wind speed, never raise one. And when the feed fails with nothing stored, the map disappears rather than showing arrows drawn from stale or invented data.

That is the rule I hold to with anything modelled or probabilistic: an estimate is fine, as long as the person reading it can tell it apart from a measurement. Everything else in this project follows from that.

## What this product does not know

- The anchorage wind is a model, not a reading. Doing it properly needs a sensor in the water.
- Two marinas have real data behind them. The rest are placeholders.
- Tide and current are calculated from per-location parameters, not from a tide gauge.
- The forecast is a general public model with no marine correction for these islands.
- No user testing sits behind the layout yet. The order of the cards is my judgment, not evidence.

## Decisions I made, including the ones I reversed

- **I removed the paywall completely.** I had already built it: checkout, payment webhooks, tiers, a locked-region banner. Two marinas of real data does not earn the right to charge, and a demo that asks for a card gets you no feedback. I cut every trace rather than switching it off.
- **I narrowed the live locations from twenty-four to two.** The rest became a coming-soon screen that takes an email. Fewer bays, honestly served, and a signal telling me which bay to build next.
- **I hid sign-in.** Nothing on the page needs an account, so I removed the entry point rather than leaving one there implying a wall.
- **I pulled the customs and clearance card off the public view.** Those hours change without notice, and being wrong about them is worse than saying nothing.
- **I rejected inventing shelter data.** The easier version of the wind card interpolates a believable anchorage number and looks better for it. It would also be a lie told to somebody choosing where to spend the night.

## What I would do next

1. **Put a sensor in Rodney Bay.** That turns the wind card's estimate into a real reading, which is the difference between a nice graphic and a reason to open the app every morning.
2. **Act on the coming-soon signups.** They are the only genuine demand signal in the product right now. The next bay I build should be whichever one people keep asking for.
3. **Sell to marinas, not to sailors.** Berth availability and services data is worth more to a marina that wants to be found than to a cruiser who wants to look. A listing product has a buyer. A weather app mostly has users.

## How it is put together

The front end is a single-page React app served as static files by nginx. It talks to a small Express API kept running by PM2 on the same server, with Supabase behind that for storage. Weather calls are cached on the server, so opening the page never triggers a fresh call to the outside world.

The wind map is drawn as inline SVG from the data itself, over a real Rodney Bay and Marigot Bay coastline I pulled from OpenStreetMap and committed as fixed geometry. No map tiles, no charting library, no animation library, and no dependency added to the project for any of it.

React 19 / TypeScript / Vite / Express / Supabase / Playwright / nginx / PM2

## Where to look

| Path | What is in it |
|---|---|
| `docs/PRD.md` | The product specification |
| `docs/packets/` | The build packets I broke that specification into |
| `docs/BUILD_RECORD.md` | What each packet actually produced |
| `design_handoff_wind_field_card/` | The design brief and reference designs for the wind card |
| `src/components/windfield/` | The wind card and its committed coastline geometry |
| `netlify/functions/` | Backend handlers, including the cached wind field endpoint |
| `tests/` | Playwright suite; the backend is stubbed so it runs without any keys |
| `supabase/migrations/` | The database schema, in order |

## Running it

Not installable as published, since the keys are redacted. With your own Supabase project and a `.env` filled in from `.env.example`:

```
npm install
npm run dev     # Vite on 5173, API on 3457
npm test        # Playwright, no keys needed, backend stubbed
```

---

Weather and marine data from [Open-Meteo](https://open-meteo.com). Coastline geometry (c) [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, ODbL.
