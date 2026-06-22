'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SkyDome from '@/components/SkyDome/SkyDome';
import Dashboard from '@/components/Analytics/Dashboard';

interface ObserverState {
  lat: number;
  lng: number;
  alt: number;
  name: string;
}

export default function SkyPage() {
  const router = useRouter();
  const [observer, setObserver] = useState<ObserverState | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem('zenith_observer');
    if (!raw) {
      router.replace('/');
      return;
    }

    try {
      const parsed = JSON.parse(raw) as ObserverState;
      setObserver(parsed);
    } catch {
      router.replace('/');
    }
  }, [router]);

  if (!observer) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#05060e] text-slate-100">
        <p className="text-sm text-slate-400">Loading observer location…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#05060e] text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-6 py-10 lg:px-10">
        <section className="grid gap-8 xl:grid-cols-[1.2fr_1fr]">
          <div className="rounded-[2rem] border border-white/10 bg-black/70 p-6 shadow-[0_0_80px_rgba(0,212,255,0.08)] backdrop-blur-xl">
            <div className="mb-6">
              <p className="text-sm uppercase tracking-[0.35em] text-cyan-300/80">Sky Dome</p>
              <h1 className="mt-3 text-3xl font-semibold text-white">Live orbital view for your location</h1>
              <p className="mt-3 text-slate-300">
                The dome renders a live sky map from your selected point on Earth. Satellites and planets above the horizon are plotted in real time using TLE propagation.
              </p>
            </div>

            <SkyDome observer={observer} />
          </div>

          <aside className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-slate-950/60 p-6 shadow-[0_0_60px_rgba(0,212,255,0.06)] backdrop-blur-xl">
              <p className="text-sm uppercase tracking-[0.35em] text-cyan-300/80">Observer</p>
              <p className="mt-4 text-xl font-semibold text-white">{observer.name}</p>
              <p className="mt-2 text-sm text-slate-400">{observer.lat.toFixed(5)}°, {observer.lng.toFixed(5)}°</p>
            </div>
            <Dashboard observer={observer} />
          </aside>
        </section>
      </div>
    </main>
  );
}
