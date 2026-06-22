import type { Observer } from '@/types';
import CongestionWidget from './CongestionWidget';
import GrowthChart from './GrowthChart';
import ObservabilityScore from './ObservabilityScore';
import { calculateObservability } from '@/lib/observability';

interface Props {
  observer: Observer;
}

export default function Dashboard({ observer }: Props) {
  const observability = calculateObservability(observer);
  const congestion = {
    totalInZenithCone: 28,
    active: 18,
    debris: 5,
    percentChangeSince2019: 260,
  };

  return (
    <div className="space-y-6 rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 shadow-[0_0_60px_rgba(0,212,255,0.06)] backdrop-blur-xl">
      <div className="grid gap-5 lg:grid-cols-2">
        <CongestionWidget {...congestion} />
        <ObservabilityScore result={observability} />
      </div>
      <GrowthChart />
    </div>
  );
}
