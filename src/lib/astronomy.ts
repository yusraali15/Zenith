import type { Observer, PlanetPosition } from '@/types';

const DEFAULT_PLANETS: PlanetPosition[] = [
  { name: 'Venus', azimuth: 42, elevation: 28, magnitude: -4.7 },
  { name: 'Mars', azimuth: 110, elevation: 19, magnitude: 1.8 },
  { name: 'Jupiter', azimuth: 190, elevation: 32, magnitude: -1.9 },
  { name: 'Saturn', azimuth: 240, elevation: 15, magnitude: 0.8 },
  { name: 'Moon', azimuth: 315, elevation: 45, magnitude: -12.7 },
];

export function getPlanetPositions(observer: Observer, date: Date = new Date()): PlanetPosition[] {
  const offset = ((observer.lng % 360) + 360) % 360;
  return DEFAULT_PLANETS.map((planet) => ({
    ...planet,
    azimuth: (planet.azimuth + offset * 0.12) % 360,
    elevation: Math.max(5, Math.min(75, planet.elevation + (observer.lat - 20) * 0.18)),
  }));
}
