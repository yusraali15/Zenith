import { haversineDistance } from '@/lib/coordinates';
import type { Observer, ObservabilityResult } from '@/types';
import falchiLookup from '@/data/falchi-lookup.json';

export function calculateObservability(observer: Observer): ObservabilityResult {
  const cloudCoverPercent = Math.min(90, Math.max(0, 25 + (observer.lat - 20) * 0.35));
  const moonPercent = 60;
  const bortle = findNearestBortle(observer.lat, observer.lng);

  const score = Math.max(
    0,
    Math.round(
      100 - cloudCoverPercent * 0.35 - moonPercent * 0.25 - bortle.scale * 5
    )
  );

  const rating = score >= 80 ? 'Excellent' : score >= 65 ? 'Good' : score >= 45 ? 'Moderate' : 'Poor';

  return {
    score,
    rating,
    cloudCoverPercent,
    bortleScale: bortle.scale,
    bortleLabel: bortle.label,
    moonPercent,
    bestWindow: '00:30–02:15 UTC',
  };
}

function findNearestBortle(lat: number, lng: number) {
  let best = falchiLookup[0];
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const item of falchiLookup) {
    const distance = haversineDistance(lat, lng, item.lat, item.lng);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = item;
    }
  }

  return best;
}
