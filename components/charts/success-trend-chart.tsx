'use client';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Area, AreaChart } from 'recharts';

interface TrendData {
  date: string;
  successRate: number;
  totalRuns: number;
}

export function SuccessTrendChart({ data }: { data: TrendData[] }) {
  const safeData = data ?? [];

  if (safeData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm">
        No trend data available for this period
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return `${d?.getMonth?.() + 1}/${d?.getDate?.()}`;
    } catch { return dateStr ?? ''; }
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={safeData} margin={{ top: 10, right: 20, bottom: 25, left: 10 }}>
        <defs>
          <linearGradient id="successGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tickLine={false}
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          axisLine={{ stroke: '#1e293b' }}
          label={{ value: 'Date', position: 'insideBottom', offset: -15, style: { textAnchor: 'middle', fontSize: 11, fill: '#64748b' } }}
        />
        <YAxis
          domain={[0, 100]}
          tickLine={false}
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          axisLine={{ stroke: '#1e293b' }}
          label={{ value: 'Success %', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 11, fill: '#64748b' } }}
        />
        <Tooltip
          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: 11, color: '#f1f5f9' }}
          labelFormatter={formatDate}
          formatter={(value: any) => [`${Number(value)?.toFixed?.(1) ?? 0}%`, 'Success Rate']}
        />
        <Area type="monotone" dataKey="successRate" stroke="#10b981" strokeWidth={2} fill="url(#successGradient)" dot={{ r: 4, fill: '#10b981', stroke: '#0f172a', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#10b981' }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
