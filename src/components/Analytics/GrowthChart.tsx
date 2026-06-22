import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import historicalData from '@/data/satcat-historical.json';

export default function GrowthChart() {
  return (
    <div className="rounded-[2rem] border border-cyan-400/10 bg-black/70 p-6">
      <p className="text-sm uppercase tracking-[0.35em] text-cyan-300/80">Historical trend</p>
      <h2 className="mt-3 text-2xl font-semibold text-white">Zenith object growth</h2>
      <div className="mt-6 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={historicalData} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="#1c2a44" strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', color: '#fff' }} />
            <Line type="monotone" dataKey="total" stroke="#00d4ff" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
