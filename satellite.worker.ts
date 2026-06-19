// src/workers/satellite.worker.ts
// PRE-WRITTEN — Do not modify the propagation logic or coordinate chain.
// This file runs in a Web Worker: no DOM, no React, no Next.js context.
//
// USAGE FROM COMPONENT:
//   const worker = new Worker(new URL('./satellite.worker.ts', import.meta.url));
//   worker.postMessage({ tles, observer });
//   worker.onmessage = (e) => { const satellites = e.data; ... }
//
// INPUT:  { tles: TLEInput[], observer: ObserverInput }
// OUTPUT: SatelliteResult[] — only satellites with elevation > 0° (above horizon)

import * as satellite from 'satellite.js';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TLEInput {
  name: string;
  line1: string;
  line2: string;
}

interface ObserverInput {
  lat: number; // degrees
  lng: number; // degrees
  alt: number; // kilometers above sea level (use 0.05 for sea level locations)
}

export interface SatelliteResult {
  name: string;
  azimuth: number;   // degrees, 0=North clockwise (standard astronomical convention)
  elevation: number; // degrees above horizon (0=horizon, 90=zenith)
  range: number;     // km from observer to satellite
  category: 'ISS' | 'starlink' | 'active' | 'debris' | 'rocket';
  period: number;    // orbital period in minutes (used for LEO/MEO/GEO classification)
}

// ── Message handler ───────────────────────────────────────────────────────────

self.onmessage = (e: MessageEvent<{ tles: TLEInput[]; observer: ObserverInput }>) => {
  const { tles, observer } = e.data;

  if (!tles || !observer) return;

  const now = new Date();
  const gmst = satellite.gstime(now);

  // satellite.js requires radians for the observer geodetic position
  const observerGd = {
    longitude: satellite.degreesToRadians(observer.lng),
    latitude: satellite.degreesToRadians(observer.lat),
    height: observer.alt ?? 0.05, // km
  };

  const results: SatelliteResult[] = [];

  for (const tle of tles) {
    // Skip clearly malformed entries
    if (
      !tle.line1 ||
      !tle.line2 ||
      tle.line1.length < 69 ||
      tle.line2.length < 69
    ) {
      continue;
    }

    try {
      const satrec = satellite.twoline2satrec(tle.line1, tle.line2);

      // propagate() returns { position: EciVec3 | false, velocity: EciVec3 | false }
      const posVel = satellite.propagate(satrec, now);

      if (
        !posVel.position ||
        typeof posVel.position === 'boolean'
      ) {
        continue; // Satellite has decayed or TLE is invalid
      }

      const posEci = posVel.position as { x: number; y: number; z: number };

      // Validate the propagated position (NaN = decayed satellite)
      if (isNaN(posEci.x) || isNaN(posEci.y) || isNaN(posEci.z)) continue;

      // ECI → ECF (Earth-Centered Fixed, rotates with Earth)
      const posEcf = satellite.eciToEcf(posEci, gmst);

      // ECF → Look angles (azimuth, elevation, range) relative to observer
      const lookAngles = satellite.ecfToLookAngles(observerGd, posEcf);

      const elevationDeg = satellite.radiansToDegrees(lookAngles.elevation);

      // Only include satellites above the horizon
      if (elevationDeg <= 0) continue;

      const azimuthDeg = satellite.radiansToDegrees(lookAngles.azimuth);
      const name = tle.name.trim().toUpperCase();

      // ── Orbital period from mean motion (TLE line 2, columns 52–63) ──────
      // Mean motion is in revolutions/day. Period = 1440 / meanMotion (minutes).
      const meanMotion = parseFloat(tle.line2.substring(52, 63));
      const periodMin = meanMotion > 0 ? 1440 / meanMotion : 0;

      // ── Category classification ────────────────────────────────────────────
      let category: SatelliteResult['category'] = 'active';
      if (name.includes('ISS') || name.includes('ZARYA')) {
        category = 'ISS';
      } else if (name.includes('STARLINK')) {
        category = 'starlink';
      } else if (
        name.includes(' DEB') ||
        name.endsWith('DEB') ||
        tle.line1[7] === '3' // SATCAT object type 3 = debris
      ) {
        category = 'debris';
      } else if (
        name.includes('R/B') ||
        name.includes('ROCKET') ||
        tle.line1[7] === '4' // SATCAT object type 4 = rocket body
      ) {
        category = 'rocket';
      }

      results.push({
        name,
        azimuth: azimuthDeg,
        elevation: elevationDeg,
        range: lookAngles.rangeSat,
        category,
        period: periodMin,
      });
    } catch {
      // Skip silently — malformed TLEs or propagation errors are expected
      // for satellites that have decayed or have poor element sets
    }
  }

  self.postMessage(results);
};
