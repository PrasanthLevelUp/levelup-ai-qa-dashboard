'use client';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

interface StrategyData {
  name: string;
  count: number;
  percentage: number;
}

const STRATEGY_COLORS: Record<string, string> = {
  rule_based: '#10b981',
  pattern_match: '#3b82f6',
  ai: '#f59e0b',
  unknown: '#6b7280',
};

const STRATEGY_LABELS: Record<string, string> = {
  rule_based: 'Rule Engine',
  pattern_match: 'Pattern Engine',
  ai: 'AI Engine',
  unknown: 'Unknown',
};

export function StrategyPieChart({ data }: { data: StrategyData[] }) {
  const safeData = (data ?? []).map((d: any) => ({
    ...d,
    displayName: STRATEGY_LABELS[d?.name] ?? d?.name ?? 'Unknown',
  }));

  if (safeData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm">
        No strategy data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={safeData}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          dataKey="count"
          nameKey="displayName"
          strokeWidth={2}
          stroke="#0f172a"
        >
          {safeData.map((entry: any, index: number) => (
            <Cell key={`cell-${index}`} fill={STRATEGY_COLORS[entry?.name] ?? '#6b7280'} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: 11, color: '#f1f5f9' }}
          formatter={(value: any, name: any) => [`${value} (${safeData?.find?.((d: any) => d?.displayName === name)?.percentage ?? 0}%)`, name]}
        />
        <Legend
          verticalAlign="top"
          wrapperStyle={{ fontSize: 11, color: '#94a3b8' }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
