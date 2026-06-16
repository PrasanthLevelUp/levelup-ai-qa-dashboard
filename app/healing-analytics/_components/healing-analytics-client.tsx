'use client';

/**
 * Healing Analytics Dashboard (Priority 1).
 *
 * Read-only view over the self-healing learning loop. Five focused, actionable
 * visualizations backed by the backend HealingAnalyticsService:
 *   1. Healing Success Rate   — overall pass rate with today/week/month/all toggle
 *   2. Top Healed Elements    — most-applied elements + per-element success rate
 *   3. Top Failed Elements    — worst failure rate (needs manual attention)
 *   4. Confidence Distribution — count of elements per learned-confidence band
 *   5. Healing Trend          — daily volume + success rate over 30 days
 *
 * Data is scoped to the active project via useProjectHeaders() (x-project-id),
 * which the Next.js proxy forwards to the company+project-scoped backend route.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Activity, RefreshCw, XCircle, TrendingUp, Wrench, AlertTriangle,
  Gauge, CheckCircle2, ShieldCheck,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Cell, Legend,
} from 'recharts';
import { useProjectHeaders } from '@/lib/project-context';

/* ------------------------------------------------------------------ */
/* Types (mirror backend DashboardData)                                */
/* ------------------------------------------------------------------ */

type TimeRange = 'today' | 'week' | 'month' | 'all';

interface SuccessRate {
  totalHeals: number;
  successfulHeals: number;
  failedHeals: number;
  successRate: number;
}

interface TopHealed {
  elementId: string;
  locatorType: string;
  totalApplications: number;
  successfulApplications: number;
  successRate: number;
  confidenceScore: number;
}

interface TopFailed {
  elementId: string;
  locatorType: string;
  totalApplications: number;
  failedApplications: number;
  failureRate: number;
  confidenceScore: number;
}

interface ConfidenceDistribution {
  low: number;
  medium: number;
  high: number;
  veryHigh: number;
}

interface TrendPoint {
  date: string;
  totalHeals: number;
  successfulHeals: number;
  successRate: number;
}

interface DashboardData {
  successRate: SuccessRate;
  topHealed: TopHealed[];
  topFailed: TopFailed[];
  confidenceDistribution: ConfidenceDistribution;
  trend: TrendPoint[];
  generatedAt: string;
}

/* ------------------------------------------------------------------ */
/* Constants & helpers                                                 */
/* ------------------------------------------------------------------ */

const TIME_RANGES: { label: string; value: TimeRange }[] = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'All Time', value: 'all' },
];

const DIST_COLORS = {
  low: '#ef4444',      // red — 0-25%
  medium: '#f59e0b',   // amber — 25-50%
  high: '#3b82f6',     // blue — 50-75%
  veryHigh: '#10b981', // emerald — 75-100%
};

function fmt(n: number | null | undefined): string {
  if (n == null) return '0';
  return n.toLocaleString('en-US');
}

/** Colour-grade a success rate for quick scanning. */
function rateColor(rate: number): string {
  if (rate >= 75) return 'text-emerald-400';
  if (rate >= 50) return 'text-blue-400';
  if (rate >= 25) return 'text-amber-400';
  return 'text-red-400';
}

/** Colour-grade a 0–100 confidence score. */
function confColor(score: number): string {
  if (score >= 75) return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  if (score >= 50) return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
  if (score >= 25) return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  return 'bg-red-500/15 text-red-300 border-red-500/30';
}

/** Trim very long selector ids for table display while keeping the tail readable. */
function shortId(id: string, max = 48): string {
  if (!id) return '—';
  if (id.length <= max) return id;
  return `…${id.slice(id.length - max + 1)}`;
}

function shortDate(iso: string): string {
  // iso is YYYY-MM-DD from the backend
  const parts = (iso || '').split('-');
  if (parts.length === 3) return `${parts[1]}/${parts[2]}`;
  return iso;
}

/* ------------------------------------------------------------------ */
/* Card shell                                                          */
/* ------------------------------------------------------------------ */

function Card({ title, icon, children, action }: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          {icon}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function HealingAnalyticsClient() {
  const projectHeaders = useProjectHeaders();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Success-rate time window — fetched independently so the headline number can
  // re-window without reloading the whole dashboard.
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [windowRate, setWindowRate] = useState<SuccessRate | null>(null);
  const [windowLoading, setWindowLoading] = useState(false);

  // Serialise headers so the dependency is stable across renders.
  const headerKey = JSON.stringify(projectHeaders);

  const fetchDashboard = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/healing-analytics', {
        headers: projectHeaders,
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json && json.success === false) throw new Error(json.error || 'Backend error');
      setData(json.data || json);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.message || 'Failed to load healing analytics');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headerKey]);

  const fetchWindowRate = useCallback(async (range: TimeRange) => {
    setWindowLoading(true);
    try {
      const res = await fetch(`/api/healing-analytics/success-rate?timeRange=${range}`, {
        headers: projectHeaders,
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json && json.success === false) throw new Error(json.error || 'Backend error');
      setWindowRate(json.data || json);
    } catch {
      setWindowRate(null); // fall back to the all-time number from the aggregate
    } finally {
      setWindowLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headerKey]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);
  useEffect(() => { fetchWindowRate(timeRange); }, [timeRange, fetchWindowRate]);

  /* ----- Loading ----- */
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Activity className="h-10 w-10 text-emerald-400 animate-pulse" />
          <p className="text-slate-400 text-sm">Loading healing analytics…</p>
        </div>
      </div>
    );
  }

  /* ----- Error ----- */
  if (error && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 max-w-md text-center">
          <XCircle className="h-8 w-8 text-red-400 mx-auto mb-3" />
          <p className="text-red-300 font-medium mb-2">Failed to Load Healing Analytics</p>
          <p className="text-slate-400 text-sm mb-4">{error}</p>
          <button
            onClick={() => fetchDashboard()}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const sr = windowRate ?? data.successRate;
  const dist = data.confidenceDistribution;
  const distData = [
    { range: '0-25%', count: dist.low, key: 'low' as const },
    { range: '25-50%', count: dist.medium, key: 'medium' as const },
    { range: '50-75%', count: dist.high, key: 'high' as const },
    { range: '75-100%', count: dist.veryHigh, key: 'veryHigh' as const },
  ];
  const totalTracked = dist.low + dist.medium + dist.high + dist.veryHigh;

  const isEmpty =
    data.successRate.totalHeals === 0 &&
    data.topHealed.length === 0 &&
    totalTracked === 0 &&
    data.trend.length === 0;

  return (
    <div className="space-y-6">
      {/* ============ Header ============ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="h-7 w-7 text-emerald-400" />
            Healing Analytics
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            How well the self-healing engine is learning — success rate, hotspots and confidence over time
          </p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          {lastUpdated && (
            <span className="text-xs text-slate-500">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => fetchDashboard(false)}
            title="Refresh"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border bg-slate-800/50 border-slate-700/50 text-slate-300 hover:text-white transition-all"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {isEmpty && (
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-8 text-center">
          <Wrench className="h-8 w-8 text-slate-500 mx-auto mb-3" />
          <p className="text-slate-300 font-medium mb-1">No healing data yet</p>
          <p className="text-slate-500 text-sm">
            Once the self-healing engine applies and verifies fixes, success rates,
            element hotspots and confidence trends will appear here.
          </p>
        </div>
      )}

      {/* ============ Row 1: Success rate + Confidence distribution ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Success rate */}
        <Card
          title="Healing Success Rate"
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />}
          action={
            <div className="flex items-center bg-slate-900/50 rounded-lg border border-slate-700/50 p-0.5">
              {TIME_RANGES.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setTimeRange(opt.value)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                    timeRange === opt.value ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          }
        >
          <div className="flex items-end gap-4">
            <div className={`text-5xl font-bold ${rateColor(sr.successRate)} ${windowLoading ? 'opacity-50' : ''}`}>
              {sr.successRate.toFixed(1)}%
            </div>
            <div className="pb-2 text-sm text-slate-400">
              <span className="text-emerald-400 font-medium">{fmt(sr.successfulHeals)}</span> of{' '}
              <span className="text-slate-200 font-medium">{fmt(sr.totalHeals)}</span> heals successful
            </div>
          </div>
          {/* progress bar */}
          <div className="mt-4 h-2.5 w-full rounded-full bg-slate-700/50 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${Math.min(100, Math.max(0, sr.successRate))}%` }}
            />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="bg-slate-900/40 rounded-lg p-3 border border-slate-700/40">
              <div className="text-xs text-slate-500">Total</div>
              <div className="text-lg font-semibold text-slate-100">{fmt(sr.totalHeals)}</div>
            </div>
            <div className="bg-slate-900/40 rounded-lg p-3 border border-slate-700/40">
              <div className="text-xs text-slate-500">Successful</div>
              <div className="text-lg font-semibold text-emerald-400">{fmt(sr.successfulHeals)}</div>
            </div>
            <div className="bg-slate-900/40 rounded-lg p-3 border border-slate-700/40">
              <div className="text-xs text-slate-500">Failed</div>
              <div className="text-lg font-semibold text-red-400">{fmt(sr.failedHeals)}</div>
            </div>
          </div>
        </Card>

        {/* Confidence distribution */}
        <Card
          title="Confidence Distribution"
          icon={<Gauge className="h-4 w-4 text-emerald-400" />}
          action={<span className="text-xs text-slate-500">{fmt(totalTracked)} elements tracked</span>}
        >
          {totalTracked === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-slate-500 text-sm">
              No tracked elements yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={distData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="range" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} allowDecimals={false} />
                <RechartsTooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0' }}
                  cursor={{ fill: 'rgba(148,163,184,0.08)' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {distData.map(d => (
                    <Cell key={d.key} fill={DIST_COLORS[d.key]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* ============ Row 2: Healing trend ============ */}
      <Card
        title="Healing Trend (30 Days)"
        icon={<TrendingUp className="h-4 w-4 text-emerald-400" />}
      >
        {data.trend.length === 0 ? (
          <div className="h-[260px] flex items-center justify-center text-slate-500 text-sm">
            No heals recorded in the last 30 days
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.trend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 11 }} tickFormatter={shortDate} />
              <YAxis yAxisId="left" stroke="#94a3b8" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis
                yAxisId="right" orientation="right" stroke="#10b981"
                tick={{ fontSize: 11 }} domain={[0, 100]} unit="%"
              />
              <RechartsTooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0' }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                yAxisId="left" type="monotone" dataKey="totalHeals" name="Total heals"
                stroke="#60a5fa" strokeWidth={2} dot={false}
              />
              <Line
                yAxisId="right" type="monotone" dataKey="successRate" name="Success rate %"
                stroke="#10b981" strokeWidth={2} dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* ============ Row 3: Top healed + Top failed ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top healed */}
        <Card title="Top Healed Elements" icon={<Wrench className="h-4 w-4 text-emerald-400" />}>
          {data.topHealed.length === 0 ? (
            <div className="h-[120px] flex items-center justify-center text-slate-500 text-sm">
              No healed elements yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 text-xs border-b border-slate-700/50">
                    <th className="py-2 pr-2 font-medium">Element</th>
                    <th className="py-2 px-2 font-medium text-right">Heals</th>
                    <th className="py-2 px-2 font-medium text-right">Success</th>
                    <th className="py-2 pl-2 font-medium text-right">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topHealed.map((el, i) => (
                    <tr key={`${el.elementId}-${i}`} className="border-b border-slate-800/50 last:border-0">
                      <td className="py-2 pr-2">
                        <span className="font-mono text-xs text-slate-200" title={el.elementId}>
                          {shortId(el.elementId)}
                        </span>
                        {el.locatorType && (
                          <span className="ml-2 text-[10px] text-slate-500 uppercase">{el.locatorType}</span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-right text-slate-300">{fmt(el.totalApplications)}</td>
                      <td className={`py-2 px-2 text-right font-medium ${rateColor(el.successRate)}`}>
                        {el.successRate.toFixed(0)}%
                      </td>
                      <td className="py-2 pl-2 text-right">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${confColor(el.confidenceScore)}`}>
                          {el.confidenceScore.toFixed(0)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Top failed */}
        <Card
          title="Top Failed Elements"
          icon={<AlertTriangle className="h-4 w-4 text-amber-400" />}
          action={<span className="text-xs text-slate-500">Needs manual attention</span>}
        >
          {data.topFailed.length === 0 ? (
            <div className="h-[120px] flex items-center justify-center text-slate-500 text-sm">
              No failing elements — nice 🎉
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 text-xs border-b border-slate-700/50">
                    <th className="py-2 pr-2 font-medium">Element</th>
                    <th className="py-2 px-2 font-medium text-right">Heals</th>
                    <th className="py-2 px-2 font-medium text-right">Failures</th>
                    <th className="py-2 pl-2 font-medium text-right">Fail rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topFailed.map((el, i) => (
                    <tr key={`${el.elementId}-${i}`} className="border-b border-slate-800/50 last:border-0">
                      <td className="py-2 pr-2">
                        <span className="font-mono text-xs text-slate-200" title={el.elementId}>
                          {shortId(el.elementId)}
                        </span>
                        {el.locatorType && (
                          <span className="ml-2 text-[10px] text-slate-500 uppercase">{el.locatorType}</span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-right text-slate-300">{fmt(el.totalApplications)}</td>
                      <td className="py-2 px-2 text-right text-red-400">{fmt(el.failedApplications)}</td>
                      <td className="py-2 pl-2 text-right font-medium text-red-400">
                        {el.failureRate.toFixed(0)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-slate-600">
        <ShieldCheck className="h-3.5 w-3.5" />
        Scoped to your active project · generated {data.generatedAt ? new Date(data.generatedAt).toLocaleString() : ''}
      </div>
    </div>
  );
}
