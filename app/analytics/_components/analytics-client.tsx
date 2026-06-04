'use client';
import { useEffect, useState, useCallback } from 'react';
import { BarChart3, TrendingUp, CalendarClock, RefreshCw } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, AreaChart, Area } from 'recharts';
import { useProject } from '@/lib/project-context';
import { useProjectSprints } from '@/lib/workspace-context';

const PERIOD_OPTIONS = [
  { label: '7d', value: '7d' },
  { label: '14d', value: '14d' },
  { label: '30d', value: '30d' },
  { label: '90d', value: '90d' },
];

export function AnalyticsClient() {
  const { activeProject, loading: projectLoading } = useProject();
  const projectId = activeProject?.id ?? null;

  // Phase 2 (WHEN): the active sprint window scopes healing analytics.
  const { activeSprint } = useProjectSprints();
  const sprintHasWindow = !!(activeSprint?.start_date && activeSprint?.end_date);
  const [mode, setMode] = useState<string>('sprint');
  const effectiveMode = mode === 'sprint' && !sprintHasWindow ? '30d' : mode;
  const useSprint = effectiveMode === 'sprint' && sprintHasWindow;

  const [trend, setTrend] = useState<any[]>([]);
  const [strategies, setStrategies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (projectLoading) return;
    setLoading(true);
    const periodParam = useSprint ? '30d' : effectiveMode;
    const win = useSprint
      ? `&startDate=${encodeURIComponent(activeSprint!.start_date!)}&endDate=${encodeURIComponent(activeSprint!.end_date!)}`
      : '';
    const pid = projectId ? `&projectId=${projectId}` : '';
    try {
      const [tr, st] = await Promise.all([
        fetch(`/api/stats/trend?period=${periodParam}${pid}${win}`).then((r: any) => r?.json?.()),
        fetch(`/api/stats/strategies?period=${periodParam}${pid}${win}`).then((r: any) => r?.json?.()),
      ]);
      setTrend(Array.isArray(tr) ? tr : []);
      setStrategies(Array.isArray(st) ? st : []);
    } catch (err: any) {
      console.error('Analytics error:', err);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveMode, useSprint, activeSprint, projectId, projectLoading]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const windowLabel = useSprint ? (activeSprint?.name ?? 'Sprint') : effectiveMode.replace('d', '-day');

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return `${d?.getMonth?.() + 1}/${d?.getDate?.()}`;
    } catch { return dateStr ?? ''; }
  };

  const STRATEGY_LABELS: Record<string, string> = {
    rule_based: 'Rule Engine',
    pattern_match: 'Pattern Engine',
    ai: 'AI Engine',
  };

  const barData = (strategies ?? []).map((s: any) => ({
    name: STRATEGY_LABELS[s?.name] ?? s?.name ?? 'Unknown',
    count: s?.count ?? 0,
    percentage: s?.percentage ?? 0,
  }));

  const STRATEGY_COLORS: Record<string, string> = {
    'Rule Engine': '#10b981',
    'Pattern Engine': '#3b82f6',
    'AI Engine': '#f59e0b',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-display tracking-tight flex items-center gap-2">
            <BarChart3 size={24} className="text-blue-400" /> Analytics
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Self-healing performance insights
            {useSprint && <> · <span className="text-violet-300">{activeSprint?.name}</span></>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-slate-800/50 p-1 rounded-lg border border-slate-700/50">
            <button
              onClick={() => setMode('sprint')}
              disabled={!sprintHasWindow}
              title={sprintHasWindow ? activeSprint?.name : 'No active sprint with a date range'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                effectiveMode === 'sprint' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CalendarClock size={12} />
              Sprint
            </button>
            {PERIOD_OPTIONS.map(p => (
              <button
                key={p.value}
                onClick={() => setMode(p.value)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                  effectiveMode === p.value ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Runs */}
          <div className="rounded-xl border border-[#1e293b] bg-[#1e293b]/30 p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-400" /> Daily Test Runs
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend ?? []} margin={{ top: 10, right: 20, bottom: 25, left: 10 }}>
                  <defs>
                    <linearGradient id="runsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tickFormatter={formatDate} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={{ stroke: '#1e293b' }} />
                  <YAxis tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={{ stroke: '#1e293b' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: 11, color: '#f1f5f9' }} labelFormatter={formatDate} />
                  <Area type="monotone" dataKey="totalRuns" stroke="#3b82f6" strokeWidth={2} fill="url(#runsGrad)" dot={{ r: 3, fill: '#3b82f6' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Strategy Bar */}
          <div className="rounded-xl border border-[#1e293b] bg-[#1e293b]/30 p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              ⚙️ Strategy Usage ({windowLabel})
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData ?? []} margin={{ top: 10, right: 20, bottom: 25, left: 10 }}>
                  <XAxis dataKey="name" tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={{ stroke: '#1e293b' }} />
                  <YAxis tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={{ stroke: '#1e293b' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: 11, color: '#f1f5f9' }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {(barData ?? []).map((entry: any, index: number) => {
                      const color = STRATEGY_COLORS[entry?.name] ?? '#6b7280';
                      return <rect key={index} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Success Rate Trend */}
          <div className="lg:col-span-2 rounded-xl border border-[#1e293b] bg-[#1e293b]/30 p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              📈 Success Rate Trend ({windowLabel})
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend ?? []} margin={{ top: 10, right: 20, bottom: 25, left: 10 }}>
                  <defs>
                    <linearGradient id="success30Grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tickFormatter={formatDate} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={{ stroke: '#1e293b' }} />
                  <YAxis domain={[0, 100]} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={{ stroke: '#1e293b' }} label={{ value: 'Success %', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 11, fill: '#64748b' } }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: 11, color: '#f1f5f9' }} labelFormatter={formatDate} formatter={(v: any) => [`${Number(v)?.toFixed?.(1) ?? 0}%`, 'Success Rate']} />
                  <Area type="monotone" dataKey="successRate" stroke="#10b981" strokeWidth={2} fill="url(#success30Grad)" dot={{ r: 3, fill: '#10b981' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
