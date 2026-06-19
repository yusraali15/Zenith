// src/lib/coordinates.ts
// PRE-WRITTEN — Do not modify the sign or order of X, Y, Z components.
// These functions define the exact mapping between astronomical coordinates
// and Three.js positions inside the sky dome sphere.
//
// ── Coordinate system conventions ────────────────────────────────────────────
//
// Astronomical Horizontal Coordinates:
//   Azimuth:   0° = North, 90° = East, 180° = South, 270° = West (clockwise from North)
//   Elevation: 0° = horizon, 90° = zenith (straight up)
//
// Three.js scene orientation (as used in SkyDome.tsx):
//   Y+ = up (zenith)
//   X+ = East
//   Z- = North  (negative Z is "into screen" = toward North)
//
// Verified mapping (use to manually spot-check):
//   az=0°,   el=0°  → Vector3(0,   0,   -R)  ← due North on horizon
//   az=90°,  el=0°  → Vector3(R,   0,    0)  ← due East on horizon
//   az=180°, el=0°  → Vector3(0,   0,    R)  ← due South on horizon
//   az=270°, el=0°  → Vector3(-R,  0,    0)  ← due West on horizon
//   any az,  el=90° → Vector3(0,   R,    0)  ← zenith (straight up)

import * as THREE from 'three';

/**
 * Convert azimuth + elevation (astronomical horizontal coordinates) to a
 * Three.js Vector3 position on a sphere of the given radius.
 *
 * This is the primary function used to place every object in the sky dome:
 * satellites, planets, stars, ISS.
 *
 * @param azimuthDeg   Azimuth in degrees [0, 360)
 * @param elevationDeg Elevation in degrees (-90, 90]
 * @param radius       Placement radius — use slightly less than dome radius
 *                     (dome = 500, so use 480–495 depending on object size)
 */
export function azElToVector3(
  azimuthDeg: number,
  elevationDeg: number,
  radius: number = 490
): THREE.Vector3 {
  const az = (azimuthDeg * Math.PI) / 180;
  const el = (elevationDeg * Math.PI) / 180;

  const cosEl = Math.cos(el);
  const x = radius * cosEl * Math.sin(az);  // East component  (+X = East)
  const y = radius * Math.sin(el);           // Up component    (+Y = zenith)
  const z = -radius * cosEl * Math.cos(az); // North component (-Z = North)

  return new THREE.Vector3(x, y, z);
}

/**
 * Convert Right Ascension + Declination (equatorial coordinates, as found in
 * the HYG star catalog) to azimuth + elevation for a specific observer and time.
 *
 * Use this to place stars from the HYG catalog in the sky dome.
 * For planets, use astronomy-engine's Horizon() function directly instead.
 *
 * @param raDeg   Right Ascension in degrees [0, 360)  — HYG field: ra * 15
 * @param decDeg  Declination in degrees (-90, 90]     — HYG field: dec
 * @param latDeg  Observer latitude in degrees
 * @param lngDeg  Observer longitude in degrees
 * @param date    Observation date/time (typically new Date() for live view)
 *
 * @returns { azimuth: degrees, elevation: degrees }
 */
export function raDecToAzEl(
  raDeg: number,
  decDeg: number,
  latDeg: number,
  lngDeg: number,
  date: Date
): { azimuth: number; elevation: number } {
  const lstRad = localSiderealTime(lngDeg, date);
  const raRad  = (raDeg  * Math.PI) / 180;
  const decRad = (decDeg * Math.PI) / 180;
  const latRad = (latDeg * Math.PI) / 180;

  // Hour angle (how far the star has drifted from the meridian)
  const ha = lstRad - raRad;

  // Altitude (elevation above horizon)
  const sinAlt =
    Math.sin(decRad) * Math.sin(latRad) +
    Math.cos(decRad) * Math.cos(latRad) * Math.cos(ha);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));

  // Azimuth (compass direction)
  const cosAz =
    (Math.sin(decRad) - Math.sin(alt) * Math.sin(latRad)) /
    (Math.cos(alt) * Math.cos(latRad));
  let az = Math.acos(Math.max(-1, Math.min(1, cosAz)));
  if (Math.sin(ha) > 0) az = 2 * Math.PI - az; // Correct quadrant

  return {
    azimuth:   (az  * 180) / Math.PI,
    elevation: (alt * 180) / Math.PI,
  };
}

/**
 * Local Sidereal Time in radians.
 * Used internally by raDecToAzEl.
 */
function localSiderealTime(lngDeg: number, date: Date): number {
  const J2000 = 2451545.0;
  const jd    = date.getTime() / 86400000 + 2440587.5; // Julian date
  const T     = (jd - J2000) / 36525.0;                // Julian centuries from J2000

  // Greenwich Mean Sidereal Time (degrees)
  const gmst  = 280.46061837 + 360.98564736629 * (jd - J2000) + T * T * 0.000387933;

  // Local Sidereal Time (degrees), adjusted for observer longitude
  const lst   = ((gmst + lngDeg) % 360 + 360) % 360;

  return (lst * Math.PI) / 180;
}

/**
 * Haversine distance between two lat/lon points, in kilometers.
 *
 * Use this to find the nearest Falchi light pollution entry for a given
 * observer location (see observability.ts).
 *
 * @param lat1, lon1  First point in degrees
 * @param lat2, lon2  Second point in degrees
 * @returns Distance in kilometers
 */
export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R    = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Classify a satellite into LEO / MEO / GEO by its orbital period.
 * Period is derived from mean motion (TLE line 2).
 *
 * @param periodMinutes  Orbital period in minutes (= 1440 / meanMotion)
 */
export function classifyOrbit(periodMinutes: number): 'LEO' | 'MEO' | 'GEO' | 'HEO' {
  if (periodMinutes < 128)  return 'LEO'; // altitude < ~2000 km
  if (periodMinutes < 760)  return 'MEO'; // ~2000–35,000 km
  if (periodMinutes < 1500) return 'GEO'; // ~35,786 km (geosynchronous band)
  return 'HEO';                           // highly elliptical
}
