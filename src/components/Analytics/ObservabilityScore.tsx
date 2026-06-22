import type { ObservabilityResult } from '@/types';

interface Props {
  result: ObservabilityResult;
}

export default function ObservabilityScore({ result }: Props) {
  return (
    <div className="rounded-[2rem] border border-cyan-400/10 bg-black/70 p-6 shadow-inner shadow-cyan-500/5">
      <p className="text-sm uppercase tracking-[0.35em] text-cyan-300/80">Observability</p>
      <div className="mt-4 flex items-end gap-4">
        <div className="rounded-3xl bg-slate-950/80 p-4 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Score</p>
          <p className="mt-2 text-5xl font-semibold text-white">{result.score}</p>
        </div>
        <div>
          <p className="text-2xl font-semibold text-white">{result.rating}</p>
          <p className="mt-2 text-sm text-slate-400">Clouds {result.cloudCoverPercent}% · Moon {result.moonPercent}%</p>
          <p className="mt-2 text-sm text-slate-400">Bortle {result.bortleScale} — {result.bortleLabel}</p>
          <p className="mt-3 rounded-3xl bg-slate-900/80 px-4 py-3 text-sm text-slate-200">
            Best window: {result.bestWindow}
          </p>
        </div>
      </div>
    </div>
  );
}
