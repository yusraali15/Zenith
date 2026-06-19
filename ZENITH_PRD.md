# Project Zenith: The Celestial Eye — Master Build Specification

> **How to use this document:** Feed this entire file to Antigravity as your project brief.
> Tell it: *"Read this entire PRD first. Start with Phase 0. Do not skip phases.
> For next.config.mjs, satellite.worker.ts, and coordinates.ts — use the pre-written
> files I provide exactly as-is. Do not regenerate them. Confirm each validation
> checkpoint before proceeding to the next phase."*

---

## 1. What This Product Does

Project Zenith lets a user select any point on Earth and see what is directly above them
in real time. The USP is the **Orbital Congestion Layer**: a live count of catalogued
space objects crossing a 90° zenith cone above the selected location, compared against
the pre-Starlink 2019 baseline.

**Core user journey (5 steps):**
1. Pick a location on a 3D CesiumJS globe
2. A Three.js sky dome loads, showing satellites, planets, and stars in real-time positions
3. An Orbital Analytics Dashboard surfaces congestion metrics
4. A Sky Observability Score combines cloud cover, light pollution, and moon phase
5. (Optional) Mobile Immersion Mode maps device orientation to sky dome camera

---

## 2. Tech Stack — Install These Exactly

```bash
npx create-next-app@14 zenith --typescript --tailwind --app --src-dir
cd zenith

# Core visualization
npm install cesium
npm install three @types/three
npm install satellite.js
npm install astronomy-engine

# Data + charting
npm install papaparse @types/papaparse
npm install recharts
npm install html2canvas

# Config
npm install copy-webpack-plugin --save-dev

# Backend
npm install mongoose
npm install axios
```

> **Important:** `satellite.js` does NOT have `@types/satellite.js` on npm.
> Declare types manually in `src/types/satellite.d.ts` if TypeScript complains.

---

## 3. Required API Keys — Get These Before Writing Code

| Service | Where | Free Tier |
|---------|-------|-----------|
| Cesium Ion | https://ion.cesium.com | Yes — register instantly |
| OpenWeather | https://openweathermap.org/api | Yes — register instantly |
| N2YO | https://www.n2yo.com/api/ | Yes — may need manual approval, skip if waiting |

Create `.env.local` in the project root:
```
NEXT_PUBLIC_CESIUM_ION_TOKEN=your_cesium_ion_token_here
OPENWEATHER_API_KEY=your_openweather_key_here
N2YO_API_KEY=your_n2yo_key_here
```

---

## 4. Complete Directory Structure

```
zenith/
├── .env.local
├── next.config.mjs                         ← PRE-WRITTEN. Use exactly as provided.
├── public/
│   └── cesium/                             ← Auto-populated by webpack. Do not create manually.
└── src/
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx                        ← Step 1: Location selection (CesiumJS)
    │   ├── sky/
    │   │   └── page.tsx                   ← Steps 2–5: Sky dome + analytics
    │   └── api/
    │       ├── satellites/
    │       │   └── route.ts               ← Cached CelesTrak TLE proxy
    │       └── weather/
    │           └── route.ts               ← OpenWeather proxy (hides API key)
    ├── components/
    │   ├── Globe/
    │   │   └── CesiumGlobe.tsx            ← CesiumJS globe (client-only component)
    │   ├── SkyDome/
    │   │   ├── SkyDome.tsx                ← Three.js scene root
    │   │   ├── StarLayer.tsx              ← HYG catalog stars
    │   │   ├── SatelliteLayer.tsx         ← Live satellite dots
    │   │   └── PlanetLayer.tsx            ← Planet positions
    │   ├── Analytics/
    │   │   ├── Dashboard.tsx              ← Analytics panel wrapper
    │   │   ├── CongestionWidget.tsx       ← Main orbital count display
    │   │   └── GrowthChart.tsx            ← Recharts 2019–2026 line chart
    │   └── Observability/
    │       └── ObservabilityScore.tsx     ← Sky score with breakdown
    ├── workers/
    │   └── satellite.worker.ts            ← PRE-WRITTEN. Use exactly as provided.
    ├── lib/
    │   ├── coordinates.ts                 ← PRE-WRITTEN. Use exactly as provided.
    │   ├── celestrak.ts                   ← CelesTrak API client
    │   ├── astronomy.ts                   ← Astronomy Engine wrapper
    │   └── observability.ts               ← Score calculator
    ├── data/
    │   ├── satcat-historical.json         ← See Section 10. Create this file.
    │   └── falchi-lookup.json             ← See Section 11. Create this file.
    ├── hooks/
    │   ├── useSatellites.ts
    │   └── useObserver.ts
    └── types/
        └── index.ts
```

---

## 5. PHASE 0 — Critical Configuration (Do This First, Verify Before Anything Else)

**This phase must be completed and verified before writing any component code.**
If CesiumJS is not working in Next.js first, everything else will fail.

### 5.1 Apply next.config.mjs

Replace the auto-generated `next.config.mjs` with the pre-written file provided.
It handles CesiumJS static asset copying and webpack configuration.

### 5.2 Create CesiumGlobe.tsx — The Only Correct Pattern

CesiumJS accesses `window` and `document` on module load. Next.js SSR does not
have these. The following pattern is **mandatory**:

```tsx
// src/components/Globe/CesiumGlobe.tsx
'use client';

import { useEffect, useRef } from 'react';

// CRITICAL: Must set CESIUM_BASE_URL before any Cesium import
if (typeof window !== 'undefined') {
  (window as any).CESIUM_BASE_URL = '/cesium';
}

interface Props {
  onLocationSelect: (coords: { lat: number; lng: number }) => void;
}

export default function CesiumGlobe({ onLocationSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    (async () => {
      // Dynamic import is MANDATORY — never use top-level import for CesiumJS
      const Cesium = (await import('cesium')).default;
      await import('cesium/Build/Cesium/Widgets/widgets.css');

      Cesium.Ion.defaultAccessToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN!;

      const viewer = new Cesium.Viewer(containerRef.current!, {
        terrainProvider: new Cesium.EllipsoidTerrainProvider(),
        animation: false,
        timeline: false,
        vrButton: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        baseLayerPicker: false,
        fullscreenButton: false,
      });

      viewerRef.current = viewer;

      // Click handler
      const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
      handler.setInputAction((click: any) => {
        const cartesian = viewer.camera.pickEllipsoid(
          click.position,
          viewer.scene.globe.ellipsoid
        );
        if (cartesian) {
          const carto = Cesium.Cartographic.fromCartesian(cartesian);
          onLocationSelect({
            lat: Cesium.Math.toDegrees(carto.latitude),
            lng: Cesium.Math.toDegrees(carto.longitude),
          });
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    })();

    return () => {
      viewerRef.current?.destroy();
    };
  }, []);

  return <div ref={containerRef} style={{ width: '100%', height: '100vh' }} />;
}
```

**In any page that uses CesiumGlobe, import it like this — no exceptions:**

```tsx
import dynamic from 'next/dynamic';
const CesiumGlobe = dynamic(
  () => import('@/components/Globe/CesiumGlobe'),
  { ssr: false }
);
```

### 5.3 Verification Checkpoint — Phase 0

Run `npm run dev`. Navigate to `/`.
- ✅ Terminal shows no `window is not defined` errors
- ✅ Globe renders in browser
- ✅ Clicking the globe logs lat/lon to console

**Do not proceed to Phase 1 until all three pass.**

---

## 6. PHASE 1 — Location Selection Page

**File:** `src/app/page.tsx`

Build the location selection UI using CesiumGlobe. Requirements:
- Full-screen CesiumJS globe as background
- Search bar (use Nominatim geocoding: `https://nominatim.openstreetmap.org/search?q={query}&format=json&limit=1`)
- Quick-select buttons: Mumbai (19.07, 72.87), Chennai (13.08, 80.27), Delhi (28.70, 77.10), New York (40.71, -74.00), London (51.50, -0.12), Tokyo (35.68, 139.69)
- Selected location name + coordinates displayed in corner panel
- "Confirm Location →" button
- On confirm: save `{ lat, lng, name }` to `localStorage` under key `zenith_observer`, then route to `/sky`

**UI style:** Dark space theme. Black background (#0a0a0f). Cyan/teal accent (#00d4ff). Monospace font for coordinates. Reference the wireframe screenshots in the submitted PDF.

---

## 7. PHASE 2 — Three.js Sky Dome

**File:** `src/components/SkyDome/SkyDome.tsx`

Build a Three.js scene that renders a sky sphere viewed from inside.

### 7.1 Scene Setup

```typescript
// Sky dome setup — the sphere is viewed from INSIDE
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
camera.position.set(0, 0, 0.001); // Tiny offset from center

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(width, height);
renderer.setClearColor(0x000000, 1);

// Invisible containing sphere (for raycasting, not rendered)
const skyGeom = new THREE.SphereGeometry(500, 64, 64);
const skyMat = new THREE.MeshBasicMaterial({
  color: 0x000011,
  side: THREE.BackSide,
  transparent: true,
  opacity: 0.0,
});
scene.add(new THREE.Mesh(skyGeom, skyMat));
```

### 7.2 Camera Controls (Inside-Sphere Rotation)

```typescript
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.minDistance = 0.001;
controls.maxDistance = 0.001;
controls.rotateSpeed = -0.3;  // Negative = natural inside-sphere feel
controls.enableZoom = false;
controls.enablePan = false;
```

### 7.3 Star Rendering

Fetch the HYG star catalog:
```typescript
// URL for the HYG v3 CSV (fetch once, cache in sessionStorage)
const HYG_URL = 'https://raw.githubusercontent.com/astronexus/HYG-Database/master/hyg/v3/hyg.csv';
```

Parse with PapaParse. For each star:
- Filter: `mag < 6.5` (naked-eye visible — reduces to ~9000 stars)
- Convert RA/Dec to AZ/EL using `raDecToAzEl()` from `coordinates.ts`
- Filter: elevation > -5° (keep stars near horizon)
- Convert AZ/EL to Three.js Vector3 using `azElToVector3()` from `coordinates.ts`
- Render all as `THREE.Points` with `THREE.PointsMaterial`
- Size: `size = Math.max(0.5, (6.5 - star.mag) * 0.8)` — brighter stars = bigger dots
- Color: white with slight blue tint (`#c8d8ff`) for realistic appearance

### 7.4 Reading Observer Location

```typescript
// At the top of SkyDome.tsx
const observer = JSON.parse(localStorage.getItem('zenith_observer') || '{}');
const { lat, lng } = observer;
```

### Verification Checkpoint — Phase 2
- ✅ Sky dome renders black with stars
- ✅ Dragging rotates the view naturally (like turning your head)
- ✅ Stars are denser toward certain parts of the sky (Milky Way band visible)

---

## 8. PHASE 3 — Live Satellite Tracking

**This is the core USP. The Web Worker architecture is mandatory for performance.**

### 8.1 Backend: TLE Cache Route

**File:** `src/app/api/satellites/route.ts`

```typescript
import { NextResponse } from 'next/server';

let tleCache: { data: any[]; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export async function GET() {
  const now = Date.now();

  if (tleCache && now - tleCache.fetchedAt < CACHE_TTL_MS) {
    return NextResponse.json(tleCache.data);
  }

  // Fetch active satellites from CelesTrak (3le format = name + 2 TLE lines)
  const url = 'https://celestrak.org/SOCRATES/query.php?SESSION=default&CATNR=25544&DAYS=3&MAX=10&FORMAT=TLE';
  
  // Use the general catalog for all active satellites
  const catalogUrl = 'https://celestrak.org/pub/TLE/active.txt';
  
  const response = await fetch(catalogUrl, {
    headers: { 'User-Agent': 'ProjectZenith/1.0' },
  });

  if (!response.ok) {
    // Return cached data if available, even if stale
    if (tleCache) return NextResponse.json(tleCache.data);
    return NextResponse.json([], { status: 503 });
  }

  const text = await response.text();
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);

  const tles: { name: string; line1: string; line2: string }[] = [];
  for (let i = 0; i + 2 < lines.length; i += 3) {
    tles.push({ name: lines[i], line1: lines[i + 1], line2: lines[i + 2] });
  }

  tleCache = { data: tles, fetchedAt: now };
  return NextResponse.json(tles);
}
```

### 8.2 Satellite Layer Component

**File:** `src/components/SkyDome/SatelliteLayer.tsx`

```typescript
'use client';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { azElToVector3 } from '@/lib/coordinates';

interface SatelliteResult {
  name: string;
  azimuth: number;
  elevation: number;
  range: number;
  category: 'ISS' | 'starlink' | 'active' | 'debris' | 'rocket';
}

interface Props {
  scene: THREE.Scene;
  observer: { lat: number; lng: number; alt: number };
  onCountUpdate: (count: number, breakdown: { active: number; debris: number }) => void;
}

const CATEGORY_COLORS = {
  ISS: 0xffffff,
  starlink: 0x00d4ff,
  active: 0x00ff88,
  debris: 0xff4444,
  rocket: 0xff8800,
};

export default function SatelliteLayer({ scene, observer, onCountUpdate }: Props) {
  const workerRef = useRef<Worker | null>(null);
  const pointsRef = useRef<Map<string, THREE.Mesh>>(new Map());

  useEffect(() => {
    // Initialize worker
    workerRef.current = new Worker(
      new URL('../../workers/satellite.worker.ts', import.meta.url)
    );

    workerRef.current.onmessage = (e: MessageEvent<SatelliteResult[]>) => {
      const satellites = e.data;

      // Remove satellites no longer visible
      pointsRef.current.forEach((mesh, name) => {
        if (!satellites.find(s => s.name === name)) {
          scene.remove(mesh);
          pointsRef.current.delete(name);
        }
      });

      // Add or update visible satellites
      satellites.forEach(sat => {
        const position = azElToVector3(sat.azimuth, sat.elevation, 480);
        const color = CATEGORY_COLORS[sat.category] ?? 0x00ff88;

        if (pointsRef.current.has(sat.name)) {
          pointsRef.current.get(sat.name)!.position.copy(position);
        } else {
          const size = sat.category === 'ISS' ? 3 : sat.category === 'debris' ? 1 : 2;
          const geom = new THREE.SphereGeometry(size, 8, 8);
          const mat = new THREE.MeshBasicMaterial({ color });
          const mesh = new THREE.Mesh(geom, mat);
          mesh.position.copy(position);
          mesh.userData = sat;
          scene.add(mesh);
          pointsRef.current.set(sat.name, mesh);
        }
      });

      const active = satellites.filter(s => s.category !== 'debris' && s.category !== 'rocket').length;
      const debris = satellites.filter(s => s.category === 'debris').length;
      onCountUpdate(satellites.length, { active, debris });
    };

    // Fetch TLEs and start propagation loop
    async function start() {
      const response = await fetch('/api/satellites');
      const tles = await response.json();

      const sendUpdate = () => {
        if (workerRef.current) {
          workerRef.current.postMessage({ tles, observer });
        }
      };

      sendUpdate();
      const interval = setInterval(sendUpdate, 10000); // Refresh every 10s
      return () => clearInterval(interval);
    }

    const cleanup = start();
    return () => {
      cleanup.then(fn => fn?.());
      workerRef.current?.terminate();
      pointsRef.current.forEach(mesh => scene.remove(mesh));
    };
  }, [observer.lat, observer.lng]);

  return null; // This component adds directly to the Three.js scene
}
```

### Verification Checkpoint — Phase 3
- ✅ Satellites appear as colored dots on the dome
- ✅ Browser does NOT lag or freeze (Web Worker is working)
- ✅ ISS position roughly matches https://heavens-above.com (within 10°)
- ✅ Zenith count is a plausible number (5–40 for most populated locations)

---

## 9. PHASE 4 — Planets

**File:** `src/lib/astronomy.ts`

```typescript
import * as Astronomy from 'astronomy-engine';

export interface PlanetPosition {
  name: string;
  azimuth: number;   // degrees
  elevation: number; // degrees
  magnitude: number;
}

export function getPlanetPositions(
  lat: number,
  lng: number,
  date: Date = new Date()
): PlanetPosition[] {
  const observer = new Astronomy.Observer(lat, lng, 0);
  const bodies: Astronomy.Body[] = [
    'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune',
  ] as Astronomy.Body[];

  return bodies
    .map(body => {
      const equ = Astronomy.Equator(body, date, observer, true, true);
      const hor = Astronomy.Horizon(date, observer, equ.ra, equ.dec, 'normal');
      const illum = Astronomy.Illumination(body, date);
      return {
        name: String(body),
        azimuth: hor.azimuth,
        elevation: hor.altitude,
        magnitude: illum.mag,
      };
    })
    .filter(p => p.elevation > -2); // Include planets just below horizon for completeness
}
```

**File:** `src/components/SkyDome/PlanetLayer.tsx`

Render each planet as a labeled dot. Size inversely proportional to magnitude (brighter = larger).
Planet colors: Venus = #ffffc0, Mars = #ff6644, Jupiter = #ffd4aa, Saturn = #ffe4a0 (add ring using `THREE.RingGeometry`).

---

## 10. PHASE 5 — Orbital Analytics Dashboard

**File:** `src/data/satcat-historical.json`

Create this file with the following content:

```json
[
  { "year": 2019, "total": 19372, "active": 2218, "label": "Pre-Starlink Baseline" },
  { "year": 2020, "total": 21901, "active": 3372, "label": "" },
  { "year": 2021, "total": 23089, "active": 4852, "label": "" },
  { "year": 2022, "total": 24984, "active": 5465, "label": "" },
  { "year": 2023, "total": 27691, "active": 7560, "label": "" },
  { "year": 2024, "total": 31200, "active": 10020, "label": "" },
  { "year": 2025, "total": 36800, "active": 12500, "label": "" },
  { "year": 2026, "total": 41200, "active": 15200, "label": "Current" }
]
```

### 10.1 CongestionWidget

Display:
- Large number: current `zenithCount` (passed as prop from SatelliteLayer)
- Percentage change since 2019: `((zenithCount / baseline2019ZenithCount - 1) * 100).toFixed(0) + '%'`
  - Use `baseline2019ZenithCount = 5` as a reasonable pre-Starlink estimate for most mid-latitude locations
- "Active: N / Debris: N" breakdown
- Data source label: "CelesTrak · updates every 3 min"

### 10.2 GrowthChart (Recharts)

```tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import historicalData from '@/data/satcat-historical.json';

// Show total tracked objects over time
// Highlight 2019 as baseline with a reference line
// X-axis: year, Y-axis: total object count
// Color: cyan (#00d4ff) line on dark background
```

### 10.3 Orbit Shell Breakdown

For each satellite from the Web Worker, classify by period:
```typescript
// Get mean motion from TLE line 2 (field at columns 52-63)
const meanMotion = parseFloat(line2.substring(52, 63)); // revolutions/day
const periodMinutes = 1440 / meanMotion;

if (periodMinutes < 128) category = 'LEO';
else if (periodMinutes < 760) category = 'MEO';
else category = 'GEO';
```

### 10.4 India Orbital Footprint

CelesTrak's active.txt includes NORAD catalog entries. For SATCAT ownership,
fetch: `https://celestrak.org/pub/satcat.csv` — parse the `OWNER` field, filter for `'IND'`.
Count how many India-owned objects are currently in the zenith cone.

### 10.5 Entered Orbit This Month

From `satcat.csv`, filter `LAUNCH_DATE` field for the current year-month. Count and display
satellites, debris, and rocket bodies launched this calendar month.

---

## 11. PHASE 6 — Sky Observability Score

**File:** `src/data/falchi-lookup.json`

Create this file:

```json
[
  { "lat": 13.08, "lon": 80.27, "bortle": 7, "label": "Rural/suburban transition" },
  { "lat": 19.07, "lon": 72.87, "bortle": 8, "label": "City sky" },
  { "lat": 28.70, "lon": 77.10, "bortle": 8, "label": "City sky" },
  { "lat": 12.97, "lon": 77.59, "bortle": 7, "label": "Rural/suburban transition" },
  { "lat": 40.71, "lon": -74.00, "bortle": 9, "label": "Inner-city sky" },
  { "lat": 51.50, "lon": -0.12, "bortle": 9, "label": "Inner-city sky" },
  { "lat": 35.68, "lon": 139.69, "bortle": 9, "label": "Inner-city sky" },
  { "lat": 48.85, "lon": 2.35,  "bortle": 9, "label": "Inner-city sky" },
  { "lat": 22.57, "lon": 88.36, "bortle": 8, "label": "City sky" },
  { "lat": 26.91, "lon": 75.78, "bortle": 6, "label": "Suburban sky" },
  { "lat": 23.02, "lon": 72.57, "bortle": 7, "label": "Rural/suburban transition" },
  { "lat": 17.38, "lon": 78.47, "bortle": 7, "label": "Rural/suburban transition" }
]
```

**File:** `src/app/api/weather/route.ts`

```typescript
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`;

  const res = await fetch(url);
  const data = await res.json();

  return NextResponse.json({
    cloudCoverPercent: data.clouds?.all ?? 0,
    description: data.weather?.[0]?.description ?? 'unknown',
    temp: data.main?.temp,
  });
}
```

**File:** `src/lib/observability.ts`

```typescript
import * as Astronomy from 'astronomy-engine';
import falchiData from '@/data/falchi-lookup.json';
import { haversineDistance } from '@/lib/coordinates';

export interface ObservabilityResult {
  score: number;         // 0–100
  rating: string;        // Excellent / Good / Moderate / Poor
  cloudCoverPercent: number;
  bortleScale: number;
  bortleLabel: string;
  moonPercent: number;
  bestWindow: string;
}

export function getBortleForLocation(lat: number, lng: number): { bortle: number; label: string } {
  let nearest = falchiData[0];
  let minDist = Infinity;

  for (const entry of falchiData) {
    const dist = haversineDistance(lat, lng, entry.lat, entry.lon);
    if (dist < minDist) {
      minDist = dist;
      nearest = entry;
    }
  }

  return { bortle: nearest.bortle, label: nearest.label };
}

export async function calculateObservability(
  lat: number,
  lng: number
): Promise<ObservabilityResult> {
  // 1. Cloud cover
  const weatherRes = await fetch(`/api/weather?lat=${lat}&lng=${lng}`);
  const weather = await weatherRes.json();
  const cloudCover = (weather.cloudCoverPercent ?? 50) / 100; // 0–1

  // 2. Light pollution
  const { bortle, label } = getBortleForLocation(lat, lng);
  const lightInv = 1 - bortle / 9; // Higher = darker sky

  // 3. Moon brightness
  const observer = new Astronomy.Observer(lat, lng, 0);
  const illum = Astronomy.Illumination('Moon', new Date());
  const moonPercent = illum.phase_fraction * 100;
  const moonDark = 1 - illum.phase_fraction; // 0 = full moon (worst), 1 = new moon (best)

  // Score formula (matches wireframe)
  const score = Math.round(
    (1 - cloudCover) * 50 +
    lightInv * 30 +
    moonDark * 20
  );

  const rating =
    score >= 75 ? 'Excellent' :
    score >= 55 ? 'Good' :
    score >= 35 ? 'Moderate' : 'Poor';

  return {
    score,
    rating,
    cloudCoverPercent: weather.cloudCoverPercent,
    bortleScale: bortle,
    bortleLabel: label,
    moonPercent: Math.round(moonPercent),
    bestWindow: score >= 55 ? 'Tonight' : 'Check again tomorrow',
  };
}
```

---

## 12. UI Design Specification

**Color palette:**
- Background: `#080810`
- Surface/card: `#0f0f1a`
- Border: `#1a1a2e`
- Primary accent: `#00d4ff` (cyan)
- Success/active satellites: `#00ff88`
- Debris: `#ff4444`
- Text primary: `#e0e8ff`
- Text secondary: `#6080a0`

**Typography:**
- Display numbers (congestion count, score): `font-mono text-5xl font-bold text-cyan-400`
- Labels: `text-xs uppercase tracking-widest text-slate-400`
- Body: `text-sm text-slate-300`

**Layout:** Two-panel on desktop. Sky dome left (70%). Analytics right (30%). Stack vertically on mobile.

---

## 13. Cut List — If Running Out of Time

Execute in priority order. Cut from the bottom first.

| Priority | Feature | Status |
|----------|---------|--------|
| 1 | CesiumJS Globe | MUST HAVE |
| 2 | Three.js sky dome + stars | MUST HAVE |
| 3 | Live satellite tracking + zenith count | MUST HAVE (USP) |
| 4 | Orbital Congestion Growth Chart | MUST HAVE |
| 5 | Sky Observability Score | STRONG |
| 6 | Planet positions | GOOD |
| 7 | India Orbital Footprint | IF TIME |
| 8 | Entered Orbit This Month | IF TIME |
| 9 | Shareable Sky Card (html2canvas) | STRETCH |
| 10 | Mobile Immersion Mode | STRETCH |
| 11 | Starlink Train Predictor | SKIP — N2YO approval too slow |

---

## 14. Validation Checkpoints (Run Before Each New Phase)

| Phase | What to Check | Pass Condition |
|-------|--------------|----------------|
| 0 | `npm run dev` | No SSR errors in terminal |
| 0 | Globe renders | Interactive 3D globe in browser |
| 1 | Location confirm | Coordinates saved to localStorage, routed to /sky |
| 2 | Sky dome loads | >1000 star points visible, drag rotates naturally |
| 3 | Satellites appear | Colored dots visible, browser does not freeze |
| 3 | ISS validation | ISS position within 10° of heavens-above.com |
| 4 | Planets | At least 1–2 planets visible at night |
| 5 | Growth chart | Line chart renders 2019–2026 data |
| 5 | Zenith count | Plausible number (5–40), updates every 10s |
| 6 | Observability score | Score 0–100, cloud component reflects live weather |

---

## 15. Known Failure Points — Read Before You Get Stuck

**1. CesiumJS `window is not defined` on build:**
You missed the `dynamic(() => import(...), { ssr: false })` wrapper. Every page that imports CesiumGlobe must use this pattern. Never use static imports for CesiumJS at the page level.

**2. Browser freezes when satellites load:**
The Web Worker is not being used. The satellite propagation is running on the main thread. Verify the worker file is being instantiated with `new Worker(new URL(...))` syntax — not imported directly.

**3. Satellites appear in wrong hemisphere:**
The azimuth→Three.js coordinate mapping is inverted. Use the pre-written `coordinates.ts` exactly. Do not modify the sign of X, Y, or Z components.

**4. CelesTrak returns 403 or empty:**
CelesTrak rate limits by IP. During development, cache aggressively. Add a local file fallback: save the TLE text to `public/tle-fallback.txt` on first successful fetch and read from it if the API fails.

**5. `satellite.js` TypeScript errors:**
If TS complains about missing types, create `src/types/satellite.d.ts`:
```typescript
declare module 'satellite.js' {
  export function twoline2satrec(line1: string, line2: string): any;
  export function propagate(satrec: any, date: Date): any;
  export function gstime(date: Date): number;
  export function eciToEcf(eci: any, gmst: number): any;
  export function ecfToLookAngles(observer: any, ecf: any): any;
  export function degreesToRadians(deg: number): number;
  export function radiansToDegrees(rad: number): number;
  export interface GeodeticLocation { longitude: number; latitude: number; height: number; }
}
```

**6. `new Worker(new URL(...))` fails in Next.js:**
Add to `next.config.mjs`:
```js
config.module.rules.push({
  test: /\.worker\.ts$/,
  use: { loader: 'worker-loader' },
});
```
Or use the `@ducanh2912/next-pwa` approach. If still failing, move the propagation logic into a simple `setInterval` with a 5-second debounce as a temporary fallback (will be slow for large catalogs but works for demo).

---

## 16. Deployment Checklist

**Vercel (Frontend):**
1. Push to GitHub
2. Import to Vercel
3. Set environment variables: `NEXT_PUBLIC_CESIUM_ION_TOKEN`, `OPENWEATHER_API_KEY`
4. Set Build Command: `npm run build`
5. Set Output Directory: `.next`

**Note:** The Next.js API routes handle backend caching, so no separate Render deployment is needed for a demo. Skip Express.js/MongoDB for now — the in-memory cache in the API route is sufficient for demo purposes.

---

*End of PRD. Total estimated implementation time with Antigravity: 5–6 days at focused pace.*
*Start with Phase 0. Do not skip ahead. The CesiumJS configuration is the single biggest risk.*
