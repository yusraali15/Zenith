# Project Zenith — Team Workflow & Task Split (3 Members)

> The repo setup in Section 1 must happen
> before any feature code is written, or you will lose a full day to merge conflicts
> on day 6.

---

## 1. Repo Setup — Do This First, Today, Before Splitting Up

**One person (call them the Integrator — ideally whoever read the PRD most closely) does this:**

```bash
npx create-next-app@14 zenith --typescript --tailwind --app --src-dir
cd zenith
git init
git add .
git commit -m "Initial Next.js scaffold"
```

Create a GitHub repo (private, team members invited as collaborators), then:

```bash
git remote add origin https://github.com/YOUR_ORG/zenith.git
git branch -M main
git push -u origin main
```

**Immediately after, in the same session, the Integrator adds the locked contract files**
(provided below: `next.config.mjs`, `types/index.ts`, `coordinates.ts`, `satellite.worker.ts`)
and pushes them to `main` in a single commit:

```bash
git add next.config.mjs src/lib/coordinates.ts src/workers/satellite.worker.ts src/types/index.ts
git commit -m "Lock shared contract files — do not regenerate via Antigravity"
git push
```

**Branch protection (GitHub → Settings → Branches → Add rule on `main`):**
- Require pull request before merging
- Do NOT require approvals if you're under time pressure (slows you down) — but DO require the build to not be broken before merge

**All three members now run:**
```bash
git clone https://github.com/YOUR_ORG/zenith.git
cd zenith
npm install
git checkout -b feat/your-module-name
```

---

## 2. Module Ownership — The Actual Split

Each person works almost entirely inside their own folder boundary. Cross-module
communication happens ONLY through the contract in `src/types/index.ts` and the
`localStorage['zenith_observer']` key. If your IDE wants to modify a file
outside your boundary, stop and ask the owner first.

### Person 1 (Nipun)  — Globe, Routing, Deployment (the Integrator)
**Owns:**
- `src/app/page.tsx` (location selection page)
- `src/components/Globe/CesiumGlobe.tsx`
- `next.config.mjs` (already locked — just owns merge authority over it)
- Vercel project + environment variables
- Daily merge of `feat/skydome` and `feat/analytics` into `main`
- Final integration: wiring `/sky` page to assemble SkyDome + Dashboard + ObservabilityScore together

**PRD sections:** 5, 6, 16

### Person 2 — Sky Dome, Satellites, Planets, Stars
**Owns:**
- `src/components/SkyDome/SkyDome.tsx`
- `src/components/SkyDome/StarLayer.tsx`
- `src/components/SkyDome/SatelliteLayer.tsx`
- `src/components/SkyDome/PlanetLayer.tsx`
- `src/app/api/satellites/route.ts`
- `src/lib/astronomy.ts`
- `src/types/satellite.d.ts`

**PRD sections:** 7, 8, 9

**This is the important module.** It's also
the project's actual USP. If only one module gets extra attention this week, it's this one.

### Person 3 — Analytics Dashboard, Observability Score, Data Prep
**Owns:**
- `src/components/Analytics/Dashboard.tsx`
- `src/components/Analytics/CongestionWidget.tsx`
- `src/components/Analytics/GrowthChart.tsx`
- `src/components/Observability/ObservabilityScore.tsx`
- `src/app/api/weather/route.ts`
- `src/lib/observability.ts`
- `src/data/satcat-historical.json`
- `src/data/falchi-lookup.json`

**PRD sections:** 10, 11

This module has the least 3D-math risk and the most "data wrangling".

---

## 3. The Locked Contract — `src/types/index.ts`

**Every Antigravity instance must be told: "Import types from `@/types/index`. Do not
redefine `Observer` or `SatelliteResult` locally — even if it seems easier."**

This is the single file that prevents the three modules from silently disagreeing
with each other on data shape.

```typescript
// src/types/index.ts
// LOCKED CONTRACT — All three modules import from here. Do not redefine these
// shapes locally in your own components. If you need a new field, add it here
// and notify the team — do not fork the type.

/** The user's selected viewing location. Saved to localStorage under
 *  key 'zenith_observer' by Person 1's location selection page. Read by
 *  Person 2's SkyDome and Person 3's Dashboard/Observability components. */
export interface Observer {
  lat: number;   // degrees, -90 to 90
  lng: number;   // degrees, -180 to 180
  alt: number;   // kilometers above sea level — default 0.05 if unknown
  name: string;  // display name, e.g. "Chennai, India"
}

/** Output of the satellite Web Worker (src/workers/satellite.worker.ts).
 *  Produced by Person 2's SatelliteLayer, consumed by Person 1's integration
 *  page (for the zenith count) and Person 3's CongestionWidget/GrowthChart. */
export interface SatelliteResult {
  name: string;
  azimuth: number;    // degrees, 0=North clockwise
  elevation: number;  // degrees above horizon
  range: number;       // km
  category: 'ISS' | 'starlink' | 'active' | 'debris' | 'rocket';
  period: number;      // orbital period in minutes
}

/** Aggregated counts derived from SatelliteResult[], passed from Person 2's
 *  SkyDome up to Person 1's page, then down into Person 3's Dashboard. */
export interface CongestionSummary {
  totalInZenithCone: number;
  active: number;
  debris: number;
  percentChangeSince2019: number;
}

/** Output of getPlanetPositions() in astronomy.ts. */
export interface PlanetPosition {
  name: string;
  azimuth: number;
  elevation: number;
  magnitude: number;
}

/** Output of calculateObservability() in observability.ts. Person 3 owns
 *  the calculation, Person 1's integration page may display a summary. */
export interface ObservabilityResult {
  score: number;
  rating: 'Excellent' | 'Good' | 'Moderate' | 'Poor';
  cloudCoverPercent: number;
  bortleScale: number;
  bortleLabel: string;
  moonPercent: number;
  bestWindow: string;
}

/** A single year's entry in the historical congestion dataset.
 *  Matches src/data/satcat-historical.json exactly. */
export interface HistoricalDataPoint {
  year: number;
  total: number;
  active: number;
  label: string;
}
```

**Tell each teammate's Antigravity, verbatim, at the start of their session:**

> *"This module imports shared types from `src/types/index.ts`. That file is locked —
> never redefine `Observer`, `SatelliteResult`, `CongestionSummary`, `PlanetPosition`,
> `ObservabilityResult`, or `HistoricalDataPoint` locally. If a type is missing a field
> you need, tell me instead of inventing your own version."*

---

## 4. Daily Workflow (Non-Negotiable for a 1-Week Timeline)

**Every single day, in this order:**

1. **Morning (15 min sync, even async in your group chat):** Each person states what they're building today and which files they'll touch. Catches overlap before it happens.
2. **Work in your branch.**
3. **End of day — push and open a PR into `main`, even if incomplete:**
   ```bash
   git add .
   git commit -m "WIP: satellite layer rendering, zenith count not yet wired"
   git push origin feat/skydome
   ```
4. **Integrator merges all three PRs into `main` before going to sleep.** If a module isn't ready to be visually wired in yet, that's fine — just make sure it builds (`npm run build` succeeds) before merging. A broken `main` blocks everyone the next morning.

**If you skip daily merges and try to combine everything on day 6 or 7, expect to lose
most of your last day to debugging integration issues instead of polishing the demo.**
This is the most common reason 3-person hackathon teams ship something worse than what
one focused person could have built alone — not because the code was bad, but because
nobody saw how the pieces fit together until it was too late to fix it.

---

## 5. What Each Person Tells Antigravity, Word-for-Word

**Person 1:**
> "I'm building the location selection and globe for Project Zenith. Read PRD sections 5 and 6. The file src/types/index.ts is locked — import from it, don't redefine types. next.config.mjs is already in the repo, pre-configured for CesiumJS — don't regenerate it."

**Person 2:**
> "I'm building the sky dome, satellites, and planets for Project Zenith. Read PRD sections 7, 8, and 9. The files src/lib/coordinates.ts and src/workers/satellite.worker.ts are locked — use them exactly as provided, don't regenerate the coordinate math. Import shared types from src/types/index.ts, don't redefine SatelliteResult or PlanetPosition locally."

**Person 3:**
> "I'm building the analytics dashboard and observability score for Project Zenith. Read PRD sections 10 and 11. Import shared types from src/types/index.ts, don't redefine HistoricalDataPoint or ObservabilityResult locally."

---

