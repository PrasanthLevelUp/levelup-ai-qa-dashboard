'use client';

/**
 * Metrics Dashboard — investor-grade, observable proof that the platform gets
 * measurably better the more it is used.
 *
 *   • 5 KPI cards with trend deltas
 *   • Line / area charts of improvement over time
 *   • Stable-selector progress bar + trend
 *   • ROI calculator (hours saved × hourly rate)
 *   • Export to PDF (browser print) for investor decks
 *
 * All data is project-scoped (x-project-id) and fail-safe: empty history simply
 * renders zeros and an "accumulating data" hint rather than erroring.
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  RefreshCw, TrendingUp, TrendingDown, Minus, Activity, ShieldCheck,
  Repeat, Gauge, Clock, Download, Target, DollarSign, Sparkles,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip,
  ResponsiveContainer, CartesianGrid, AreaChart, Area,
} from 'recharts';
import { useProjectHeaders } from '@/lib/project-context';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface Metrics {
  heal_rate: number;
  repeat_break_rate: number;
  stable_selector_percentage: number;
  first_run_pass_rate: number;
  manual_hours_saved: number;
  total_tests_run: number;
  total_heals_performed: number;
  total_failures: number;
}

interface ImprovementEntry {
  key: string;
  label: string;
  direction: 'up' | 'down';
  baseline: number;
  latest: number;
  delta: number;
  percentChange: number;
  improved: boolean;
}

const PERIODS = [
  { label: '7 days', value: '7d' },
  { label: '30 days', value: '30d' },
  { label: '90 days', value: '90d' },
];

/* KPI card definitions — key, label, formatter, target, icon, "good" direction. */
const KPI_DEFS: Array<{
  key: keyof Metrics;
  label: string;
  icon: typeof Activity;
  suffix: string;
  target: string;
  goodDir: 'up' | 'down';
  accent: string;
}> = [
  { key: 'heal_rate', label: 'Heal Rate', icon: Activity, suffix: '%', target: 'Target 95%+', goodDir: 'up', accent: '#10b981' },
  { key: 'repeat_break_rate', label: 'Repeat-Break Rate', icon: Repeat, suffix: '%', target: 'Target <5%', goodDir: 'down', accent: '#f59e0b' },
  { key: 'stable_selector_percentage', label: 'Stable Selectors', icon: ShieldCheck, suffix: '%', target: 'Higher is better', goodDir: 'up', accent: '#8b5cf6' },
  { key: 'first_run_pass_rate', label: 'First-Run Pass Rate', icon: Gauge, suffix: '%', target: 'Trending up', goodDir: 'up', accent: '#3b82f6' },
  { key: 'manual_hours_saved', label: 'Manual Hours Saved', icon: Clock, suffix: 'h', target: 'Cumulative', goodDir: 'up', accent: '#ec4899' },
];

const fmt = (n: number | undefined, digits = 1): string => {
  if (n === undefined || n === null || Number.isNaN(n)) return '0';
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: digits });
};

const shortDate = (s: string): string => {
  try {
    const d = new Date(s);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  } catch { return s; }
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function MetricsClient() {
  const projectHeaders = useProjectHeaders();
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState<Metrics | null>(null);
  const [series, setSeries] = useState<any[]>([]);
  const [improvements, setImprovements] = useState<ImprovementEntry[]>([]);
  const [hasTrendData, setHasTrendData] = useState(false);
  const [hourlyRate, setHourlyRate] = useState(75); // ROI calculator: $/hr

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const opts = { headers: projectHeaders };
      const [cRes, tRes, iRes] = await Promise.allSettled([
        fetch('/api/metrics/current', opts),
        fetch(`/api/metrics/trends?period=${period}`, opts),
        fetch(`/api/metrics/improvement?period=${period}`, opts),
      ]);

      if (cRes.status === 'fulfilled') {
        const d = await cRes.value.json();
        if (d?.success) setCurrent(d.data?.current ?? null);
      }
      if (tRes.status === 'fulfilled') {
        const d = await tRes.value.json();
        if (d?.success) {
          setSeries(Array.isArray(d.data?.series) ? d.data.series : []);
        }
      }
      if (iRes.status === 'fulfilled') {
        const d = await iRes.value.json();
        if (d?.success) {
          setImprovements(Array.isArray(d.data?.improvements) ? d.data.improvements : []);
          setHasTrendData(!!d.data?.hasData);
        }
      }
    } catch (e) {
      console.error('Metrics load error', e);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, JSON.stringify(projectHeaders)]);

  useEffect(() => { load(); }, [load]);

  const improvementByKey = useMemo(() => {
    const m: Record<string, ImprovementEntry> = {};
    for (const i of improvements) m[i.key] = i;
    return m;
  }, [improvements]);

  // ROI: hours saved (current cumulative) × hourly rate.
  const hoursSaved = current?.manual_hours_saved ?? 0;
  const roiDollars = hoursSaved * hourlyRate;
  const annualizedRoi = useMemo(() => {
    // Extrapolate to a year from the selected window's hours-saved run-rate.
    const days = parseInt(period.replace('d', ''), 10) || 30;
    const perDay = hoursSaved / days;
    return perDay * 365 * hourlyRate;
  }, [hoursSaved, hourlyRate, period]);

  const handleExportPdf = () => {
    // Browser print → "Save as PDF". No extra dependency; print styles below
    // hide the sidebar/controls so the export is a clean investor one-pager.
    if (typeof window !== 'undefined') window.print();
  };

  return (
    <div className="space-y-6 metrics-print-root">
      {/* Print styles — clean investor one-pager */}
      <style jsx global>{`
        @media print {
          aside, nav, .metrics-no-print { display: none !important; }
          main { margin-left: 0 !important; padding: 0 !important; }
          body, .min-h-screen { background: #ffffff !important; }
          .metrics-print-card { break-inside: avoid; }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-violet-400" />
            Metrics &amp; ROI
          </h1>
          <p className="text-slate-400 mt-1">
            Observable proof the platform improves the more it&apos;s used — investor-ready.
          </p>
        </div>
        <div className="flex items-center gap-2 metrics-no-print">
          <div className="flex rounded-lg border border-slate-700 bg-slate-800/60 p-1">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  period === p.value ? 'bg-violet-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-slate-700 bg-slate-800/60 text-slate-200 hover:bg-slate-700/60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleExportPdf}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-violet-600 hover:bg-violet-500 text-white"
          >
            <Download className="h-4 w-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Empty-state hint */}
      {!loading && !hasTrendData && (
        <div className="rounded-lg border border-violet-700/40 bg-violet-900/20 px-4 py-3 text-sm text-violet-200">
          Trend history is still accumulating. Daily snapshots populate the charts below — current values are computed live.
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {KPI_DEFS.map((def) => {
          const value = current ? Number(current[def.key]) : 0;
          const imp = improvementByKey[def.key];
          const Icon = def.icon;
          return (
            <div
              key={def.key}
              className="metrics-print-card rounded-xl border border-slate-800 bg-slate-900/60 p-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">{def.label}</span>
                <Icon className="h-4 w-4" style={{ color: def.accent }} />
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-white">{fmt(value)}</span>
                <span className="text-sm text-slate-400">{def.suffix}</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs text-slate-500">{def.target}</span>
                <TrendBadge entry={imp} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Stable selector progress bar */}
      <div className="metrics-print-card rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-violet-400" />
            <h2 className="text-white font-semibold">Stable Selector Coverage</h2>
          </div>
          <span className="text-sm text-slate-300">
            {fmt(current?.stable_selector_percentage)}%
          </span>
        </div>
        <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 transition-all"
            style={{ width: `${Math.max(0, Math.min(100, current?.stable_selector_percentage ?? 0))}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Share of tracked selectors scoring as stable. Rises as the healing flywheel demotes fragile selectors.
        </p>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Heal Rate Over Time" hint="Target 95%+" color="#10b981">
          <LineSeries data={series} dataKey="heal_rate" color="#10b981" unit="%" />
        </ChartCard>
        <ChartCard title="Repeat-Break Rate Over Time" hint="Target <5% — lower is better" color="#f59e0b">
          <LineSeries data={series} dataKey="repeat_break_rate" color="#f59e0b" unit="%" />
        </ChartCard>
        <ChartCard title="First-Run Pass Rate Over Time" hint="Should climb as crawl intelligence improves" color="#3b82f6">
          <LineSeries data={series} dataKey="first_run_pass_rate" color="#3b82f6" unit="%" />
        </ChartCard>
        <ChartCard title="Manual Hours Saved" hint="Cumulative engineer time saved" color="#ec4899">
          <AreaSeries data={series} dataKey="manual_hours_saved" color="#ec4899" unit="h" />
        </ChartCard>
      </div>

      {/* ROI calculator */}
      <div className="metrics-print-card rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="h-5 w-5 text-emerald-400" />
          <h2 className="text-white font-semibold">ROI Calculator</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="text-xs text-slate-400">Engineer hourly rate (USD)</label>
            <div className="mt-1 flex items-center rounded-lg border border-slate-700 bg-slate-800/60 px-3 metrics-no-print">
              <span className="text-slate-400">$</span>
              <input
                type="number"
                min={0}
                value={hourlyRate}
                onChange={(e) => setHourlyRate(Math.max(0, Number(e.target.value) || 0))}
                className="w-full bg-transparent px-2 py-2 text-white outline-none"
              />
              <span className="text-slate-400 text-sm">/hr</span>
            </div>
            <div className="hidden print:block text-white text-lg font-semibold mt-1">${fmt(hourlyRate, 0)}/hr</div>
          </div>
          <RoiStat label="Hours saved (this window)" value={`${fmt(hoursSaved)} h`} icon={Clock} />
          <RoiStat label="Value delivered" value={`$${fmt(roiDollars, 0)}`} icon={DollarSign} highlight />
          <RoiStat label="Annualized ROI (run-rate)" value={`$${fmt(annualizedRoi, 0)}`} icon={Target} highlight />
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Value delivered = manual hours saved × hourly rate. Annualized figure extrapolates the current {period} run-rate across a full year.
        </p>
      </div>

      {/* Improvement summary */}
      {improvements.length > 0 && (
        <div className="metrics-print-card rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-violet-400" />
            <h2 className="text-white font-semibold">Improvement Over {period}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
            {improvements.map((i) => (
              <div key={i.key} className="rounded-lg bg-slate-800/50 p-3">
                <div className="text-xs text-slate-400">{i.label}</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-slate-300 text-sm">{fmt(i.baseline)}</span>
                  <span className="text-slate-600">→</span>
                  <span className="text-white font-semibold">{fmt(i.latest)}</span>
                </div>
                <div className="mt-1"><TrendBadge entry={i} /></div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-xs text-slate-600 pt-2">
        Tests run: {fmt(current?.total_tests_run, 0)} · Heals performed: {fmt(current?.total_heals_performed, 0)} · Failures: {fmt(current?.total_failures, 0)}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

function TrendBadge({ entry }: { entry?: ImprovementEntry }) {
  if (!entry || entry.delta === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
        <Minus className="h-3 w-3" /> —
      </span>
    );
  }
  const good = entry.improved;
  const Icon = good ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${good ? 'text-emerald-400' : 'text-rose-400'}`}>
      <Icon className="h-3 w-3" />
      {entry.delta > 0 ? '+' : ''}{fmt(entry.delta)}
    </span>
  );
}

function ChartCard({ title, hint, color, children }: {
  title: string; hint: string; color: string; children: React.ReactNode;
}) {
  return (
    <div className="metrics-print-card rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-medium">{title}</h3>
        <span className="text-xs" style={{ color }}>{hint}</span>
      </div>
      <div className="h-48">{children}</div>
    </div>
  );
}

function LineSeries({ data, dataKey, color, unit }: { data: any[]; dataKey: string; color: string; unit: string }) {
  if (!data || data.length === 0) return <EmptyChart />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="snapshot_date" tickFormatter={shortDate} stroke="#64748b" fontSize={11} />
        <YAxis stroke="#64748b" fontSize={11} />
        <RechartsTooltip
          contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#fff' }}
          labelFormatter={shortDate}
          formatter={(v: any) => [`${fmt(Number(v))}${unit}`, '']}
        />
        <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function AreaSeries({ data, dataKey, color, unit }: { data: any[]; dataKey: string; color: string; unit: string }) {
  if (!data || data.length === 0) return <EmptyChart />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.5} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="snapshot_date" tickFormatter={shortDate} stroke="#64748b" fontSize={11} />
        <YAxis stroke="#64748b" fontSize={11} />
        <RechartsTooltip
          contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#fff' }}
          labelFormatter={shortDate}
          formatter={(v: any) => [`${fmt(Number(v))}${unit}`, '']}
        />
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#grad-${dataKey})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function EmptyChart() {
  return (
    <div className="h-full flex items-center justify-center text-sm text-slate-600">
      Accumulating daily snapshots…
    </div>
  );
}

function RoiStat({ label, value, icon: Icon, highlight }: {
  label: string; value: string; icon: typeof Activity; highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg p-3 ${highlight ? 'bg-emerald-900/20 border border-emerald-700/40' : 'bg-slate-800/50'}`}>
      <div className="flex items-center gap-1.5 text-xs text-slate-400">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className={`mt-1 text-lg font-bold ${highlight ? 'text-emerald-300' : 'text-white'}`}>{value}</div>
    </div>
  );
}
