import { NextResponse } from 'next/server';

let tleCache: { data: Array<{ name: string; line1: string; line2: string }>; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 15 * 60 * 1000;

export async function GET() {
  const now = Date.now();
  if (tleCache && now - tleCache.fetchedAt < CACHE_TTL_MS) {
    return NextResponse.json(tleCache.data);
  }

  const catalogUrl = 'https://celestrak.org/pub/TLE/active.txt';

  const response = await fetch(catalogUrl, {
    headers: { 'User-Agent': 'ProjectZenith/1.0' },
  });

  if (!response.ok) {
    if (tleCache) return NextResponse.json(tleCache.data);
    return NextResponse.json([], { status: 503 });
  }

  const text = await response.text();
  const lines = text.trim().split('\n').map((line) => line.trim()).filter(Boolean);

  const tles: Array<{ name: string; line1: string; line2: string }> = [];
  for (let i = 0; i + 2 < lines.length; i += 3) {
    tles.push({ name: lines[i], line1: lines[i + 1], line2: lines[i + 2] });
  }

  tleCache = { data: tles, fetchedAt: now };
  return NextResponse.json(tles);
}
