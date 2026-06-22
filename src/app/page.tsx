'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Observer } from '@/types';

const CesiumGlobe = dynamic(() => import('@/components/Globe/CesiumGlobe'), {
  ssr: false,
});

const QUICK_LOCATIONS: { name: string; lat: number; lng: number }[] = [
  { name: 'Mumbai', lat: 19.07, lng: 72.87 },
  { name: 'Chennai', lat: 13.08, lng: 80.27 },
  { name: 'Delhi', lat: 28.7, lng: 77.1 },
  { name: 'New York', lat: 40.71, lng: -74.0 },
  { name: 'London', lat: 51.5, lng: -0.12 },
  { name: 'Tokyo', lat: 35.68, lng: 139.69 },
];

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Observer>({
    lat: 19.07,
    lng: 72.87,
    alt: 0.05,
    name: 'Mumbai, India',
  });
  const [status, setStatus] = useState<string | null>(null);

  const locationCaption = useMemo(
    () => `${selected.name} · ${selected.lat.toFixed(2)}°, ${selected.lng.toFixed(2)}°`,
    [selected]
  );

  const saveLocation = (observer: Observer) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('zenith_observer', JSON.stringify(observer));
    router.push('/sky');
  };

  const quickSelect = (lat: number, lng: number, name: string) => {
    setSelected({ lat, lng, alt: 0.05, name });
  };

  const searchLocation = async () => {
    if (!query.trim()) return;
    setStatus('Searching...');

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`
      );
      const results = await response.json();
      if (!Array.isArray(results) || results.length === 0) {
        setStatus('No results found.');
        return;
      }

      const place = results[0];
      setSelected({
        lat: parseFloat(place.lat),
        lng: parseFloat(place.lon),
        alt: 0.05,
        name: place.display_name,
      });
      setStatus(null);
    } catch (error) {
      setStatus('Search failed. Try again.');
    }
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#05060e] text-slate-100">
      <div className="absolute inset-0">
        <CesiumGlobe selected={selected} onLocationSelect={(location) => setSelected({ ...location, alt: 0.05 })} />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col justify-between p-6 lg:p-12">
        <section className="max-w-3xl rounded-3xl border border-cyan-400/10 bg-black/60 p-6 backdrop-blur-xl shadow-[0_0_80px_rgba(0,212,255,0.08)]">
          <div className="mb-6 flex flex-col gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-cyan-300/80">Zenith</p>
              <h1 className="mt-3 text-4xl font-semibold text-white sm:text-5xl">
                Pick a location. See what is above you.
              </h1>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
                <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">Search location</label>
                <div className="flex gap-2">
                  <input
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/95 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400"
                    placeholder="Try Mumbai, Tokyo, New York"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                  <button
                    type="button"
                    className="rounded-xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                    onClick={searchLocation}
                  >
                    Search
                  </button>
                </div>
              </div>

              <button
                type="button"
                className="rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                onClick={() => saveLocation(selected)}
              >
                Confirm Location →
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {QUICK_LOCATIONS.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => quickSelect(item.lat, item.lng, `${item.name}`)}
                  className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-left text-sm text-slate-200 transition hover:border-cyan-400/50 hover:bg-slate-900"
                >
                  <p className="font-semibold text-white">{item.name}</p>
                  <p className="mt-1 text-xs text-slate-400">{item.lat.toFixed(2)}, {item.lng.toFixed(2)}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-cyan-400/10 bg-cyan-400/5 p-5 text-sm text-cyan-100">
            <p className="font-medium">Selected observer</p>
            <p className="mt-2 font-mono text-base text-white">{locationCaption}</p>
            <p className="mt-2 text-slate-400">{status ?? 'Use the globe or search to update the coordinates.'}</p>
          </div>
        </section>
      </div>
    </main>
  );
}
