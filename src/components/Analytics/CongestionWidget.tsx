interface Props {
  totalInZenithCone: number;
  active: number;
  debris: number;
  percentChangeSince2019: number;
}

export default function CongestionWidget({ totalInZenithCone, active, debris, percentChangeSince2019 }: Props) {
  return (
    <div className="rounded-[2rem] border border-cyan-400/10 bg-black/70 p-6 shadow-inner shadow-cyan-500/5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-300/80">Orbital congestion</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Zenith cone count</h2>
        </div>
        <div className="rounded-3xl bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-100">
          +{percentChangeSince2019}% since 2019
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl bg-slate-950/80 p-4">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Total</p>
          <p className="mt-3 text-4xl font-semibold text-white">{totalInZenithCone}</p>
        </div>
        <div className="rounded-3xl bg-slate-950/80 p-4">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Active</p>
          <p className="mt-3 text-3xl font-semibold text-emerald-300">{active}</p>
        </div>
        <div className="rounded-3xl bg-slate-950/80 p-4">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Debris</p>
          <p className="mt-3 text-3xl font-semibold text-rose-300">{debris}</p>
        </div>
      </div>
    </div>
  );
}
