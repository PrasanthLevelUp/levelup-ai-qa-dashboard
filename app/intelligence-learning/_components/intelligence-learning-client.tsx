'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  RefreshCw, XCircle, Brain, TrendingUp, TrendingDown, ShieldCheck,
  AlertTriangle, Zap, Sparkles, Activity, Target, Wrench, Download,
  ArrowUpRight, ArrowDownRight, Layers, GitBranch, CheckCircle2,
  Lightbulb, Gauge, FlaskConical,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface OverviewCards {
  trackedSelectors: number;
  stableSelectors: number;
  stablePct: number;
  fragileSelectors: number;
  avgStabilityPct: number;
  totalBreaks: number;
  insightsGenerated: number;
  maintenancePatterns: number;
  healRate: number;
  flywheelHealth: 'cold-start' | 'learning' | 'compounding' | string;
}

interface TrendPoint { date: string; attempts: number; healed: number; rate: number; }

interface TrendSummary {
  days: number;
  startRate: number;
  endRate: number;
  deltaRate: number;
  avgRate: number;
  totalAttempts: number;
  totalHealed: number;
  improving: boolean;
}

interface FragileSelector {
  selector: string;
  strategy: string;
  timesBroken: number;
  timesUsed: number;
  stabilityPct: number;
  severity: 'critical' | 'high' | 'medium' | string;
  suggestedStrategy: string;
}

interface PatternRow {
  oldSelector: string;
  newSelector: string;
  timesApplied: number;
  confidence: number;
  successRate: number | null;
}

interface StrategyStability {
  strategy: string;
  samples: number;
  total_used: number;
  total_broken: number;
  avg_stability: number;
}

interface InsightRow {
  id: number;
  insight_type: string;
  scope_key: string | null;
  payload: Record<string, any>;
  confidence: number;
  evidence_count: number;
  status: string;
  updated_at: string;
}

interface OverviewData {
  cards: OverviewCards;
  healingTrend: { points: TrendPoint[]; summary: TrendSummary };
  strategyStability: StrategyStability[];
  insightCounts: Record<string, number>;
  topFragileSelectors: FragileSelector[];
  topPatterns: PatternRow[];
  recentInsights: InsightRow[];
  generatedAt: string;
}

/* ------------------------------------------------------------------ */
/* Constants & helpers                                                 */
/* ------------------------------------------------------------------ */

const PERIOD_OPTIONS = [
  { label: '7d', value: 7 },
  { label: '14d', value: 14 },
  { label: '30d', value: 30 },
  { label: '90d', value: 90 },
];

const HEALTH_META: Record<string, { label: string; color: string; bg: string; ring: string; desc: string }> = {
  'cold-start': { label: 'Cold Start', color: 'text-slate-300', bg: 'bg-slate-500/15', ring: 'border-slate-500/40', desc: 'Gathering first signals' },
  'learning': { label: 'Learning', color: 'text-blue-300', bg: 'bg-blue-500/15', ring: 'border-blue-500/40', desc: 'Building intelligence' },
  'compounding': { label: 'Compounding', color: 'text-emerald-300', bg: 'bg-emerald-500/15', ring: 'border-emerald-500/40', desc: 'Flywheel accelerating' },
};

const SEVERITY_META: Record<string, { color: string; bg: string; border: string; label: string }> = {
  critical: { color: 'text-red-300', bg: 'bg-red-500/10', border: 'border-red-500/30', label: 'Critical' },
  high: { color: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-500/30', label: 'High' },
  medium: { color: 'text-yellow-300', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', label: 'Medium' },
};

function fmt(n: number | null | undefined): string {
  if (n == null) return '0';
  return n.toLocaleString('en-US');
}

function prettyType(t: string): string {
  return (t || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function insightSummary(i: InsightRow): string {
  const p = i.payload || {};
  return (
    p.summary || p.description || p.recommendation || p.message || p.detail ||
    (p.selector ? `Selector: ${p.selector}` : '') ||
    (p.strategy ? `Strategy: ${p.strategy}` : '') ||
    'New intelligence learned from recent runs.'
  );
}

function timeAgo(iso: string): string {
  try {
    const d = new Date(iso).getTime();
    const diff = Date.now() - d;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  } catch { return ''; }
}

const STRATEGY_COLORS: Record<string, string> = {
  'data-testid': '#10b981',
  'role': '#3b82f6',
  'id': '#8b5cf6',
  'css': '#f59e0b',
  'xpath': '#ef4444',
  'text': '#06b6d4',
};
function strategyColor(s: string): string {
  const key = (s || '').toLowerCase();
  for (const k of Object.keys(STRATEGY_COLORS)) if (key.includes(k)) return STRATEGY_COLORS[k];
  return '#64748b';
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function IntelligenceLearningClient() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [learningScope, setLearningScope] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Lightweight fetch of the active learning scope for the privacy indicator.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/learning-scope', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(j => { if (!cancelled && j) setLearningScope((j.data || j)?.learningScope ?? null); })
      .catch(() => { /* indicator is best-effort */ });
    return () => { cancelled = true; };
  }, []);

  const fetchOverview = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/intelligence-learning/overview?days=${days}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json && json.success === false) throw new Error(json.error || 'Backend error');
      setData(json.data || json);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.message || 'Failed to load intelligence data');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);

  // Auto-refresh every 30s when enabled
  useEffect(() => {
    if (autoRefresh) {
      timerRef.current = setInterval(() => fetchOverview(false), 30000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [autoRefresh, fetchOverview]);

  const runAnalyze = useCallback(async () => {
    setAnalyzing(true);
    try {
      await fetch('/api/intelligence-learning/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sinceDays: days }),
      });
      await fetchOverview(false);
    } catch { /* surfaced via overview error */ }
    finally { setAnalyzing(false); }
  }, [days, fetchOverview]);

  const exportReport = useCallback(() => {
    if (!data) return;
    const payload = { ...data, windowDays: days, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `intelligence-learning-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data, days]);

  /* ----- Loading ----- */
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Brain className="h-10 w-10 text-emerald-400 animate-pulse" />
          <p className="text-slate-400 text-sm">Loading intelligence learning data...</p>
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
          <p className="text-red-300 font-medium mb-2">Failed to Load Intelligence Data</p>
          <p className="text-slate-400 text-sm mb-4">{error}</p>
          <button onClick={() => fetchOverview()} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors">Retry</button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const c = data.cards;
  const trend = data.healingTrend;
  const health = HEALTH_META[c.flywheelHealth] || HEALTH_META['learning'];
  const isEmpty = c.trackedSelectors === 0 && c.insightsGenerated === 0 && trend.summary.totalAttempts === 0;

  // Week-over-week split of trend points
  const points = trend.points || [];
  const half = Math.floor(points.length / 2);
  const prevWeek = points.slice(0, half).filter(p => p.attempts > 0);
  const thisWeek = points.slice(half).filter(p => p.attempts > 0);
  const avg = (arr: TrendPoint[]) => arr.length ? arr.reduce((a, p) => a + p.rate, 0) / arr.length : 0;
  const prevAvg = avg(prevWeek);
  const curAvg = avg(thisWeek);
  const wow = parseFloat((curAvg - prevAvg).toFixed(1));

  return (
    <div className="space-y-6 print:bg-white">
      {/* ============ Header ============ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Brain className="h-7 w-7 text-emerald-400" />
            Intelligence Learning
          </h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <p className="text-slate-400 text-sm">Watch the AI learn, heal, and harden your test suite over time</p>
            {learningScope && (
              <a
                href="/settings/privacy"
                title="Learning scope — click to manage privacy controls"
                className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border transition-colors ${
                  learningScope === 'disabled'
                    ? 'bg-slate-500/10 border-slate-500/40 text-slate-300 hover:bg-slate-500/20'
                    : learningScope === 'company'
                      ? 'bg-sky-500/10 border-sky-500/40 text-sky-300 hover:bg-sky-500/20'
                      : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20'
                }`}
              >
                <ShieldCheck className="h-3 w-3" />
                Learning: {learningScope === 'project' ? 'Project (isolated)' : learningScope === 'company' ? 'Company' : 'Disabled'}
              </a>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap print:hidden">
          <div className="flex items-center bg-slate-800/50 rounded-lg border border-slate-700/50 p-0.5">
            {PERIOD_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setDays(opt.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  days === opt.value ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setAutoRefresh(v => !v)}
            title="Toggle auto-refresh (30s)"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
              autoRefresh ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300' : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="h-3.5 w-3.5" /> Live
          </button>
          <button
            onClick={runAnalyze}
            disabled={analyzing}
            title="Mine recent healing history for new intelligence"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600/20 border border-blue-500/40 text-blue-300 hover:bg-blue-600/30 transition-all disabled:opacity-50"
          >
            <Sparkles className={`h-3.5 w-3.5 ${analyzing ? 'animate-pulse' : ''}`} /> {analyzing ? 'Analyzing...' : 'Analyze Now'}
          </button>
          <button onClick={exportReport} title="Export report as JSON" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-white transition-all">
            <Download className="h-3.5 w-3.5" /> Export
          </button>
          <button onClick={() => fetchOverview()} className="p-2 bg-slate-800/50 rounded-lg border border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600 transition-all">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {isEmpty && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3">
          <Lightbulb className="h-5 w-5 text-blue-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-blue-200 text-sm font-medium">The flywheel is warming up</p>
            <p className="text-slate-400 text-xs mt-1">As your tests run and heal, the AI will start tracking selector stability, learning maintenance patterns, and generating insights. Run a few suites or click <span className="text-blue-300 font-medium">Analyze Now</span> to mine existing healing history.</p>
          </div>
        </div>
      )}

      {/* ============ SECTION A: Overview Cards ============ */}
      {/* Hero banner */}
      <div className="relative bg-gradient-to-br from-emerald-500/10 to-blue-600/5 border border-emerald-500/30 rounded-2xl p-6 shadow-xl shadow-emerald-500/10 overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 opacity-5"><Brain className="w-full h-full" /></div>
        <div className="relative flex flex-wrap items-center justify-between gap-4 mb-5">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${health.ring} ${health.bg}`}>
            <Gauge className={`h-4 w-4 ${health.color}`} />
            <span className={`text-sm font-semibold ${health.color}`}>Flywheel: {health.label}</span>
            <span className="text-xs text-slate-400">· {health.desc}</span>
          </div>
          {lastUpdated && <span className="text-xs text-slate-500">Updated {timeAgo(lastUpdated.toISOString())}</span>}
        </div>
        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-emerald-300/70 font-medium mb-1 flex items-center gap-1"><Layers className="h-3.5 w-3.5" /> Selectors Tracked</p>
            <p className="text-4xl font-bold text-white">{fmt(c.trackedSelectors)}</p>
            <p className="text-xs text-slate-400 mt-1">Across your test suite</p>
          </div>
          <div>
            <p className="text-xs text-emerald-300/70 font-medium mb-1 flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> Stable Selectors</p>
            <p className="text-4xl font-bold text-emerald-400">{fmt(c.stableSelectors)}</p>
            <p className="text-xs text-slate-400 mt-1">{c.stablePct}% of all selectors</p>
          </div>
          <div>
            <p className="text-xs text-emerald-300/70 font-medium mb-1 flex items-center gap-1"><Zap className="h-3.5 w-3.5" /> Heal Success Rate</p>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-bold text-emerald-400">{trend.summary.endRate || c.healRate}%</p>
              {trend.summary.deltaRate !== 0 && (
                <span className={`flex items-center text-sm font-semibold ${trend.summary.deltaRate > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {trend.summary.deltaRate > 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                  {Math.abs(trend.summary.deltaRate)}%
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">{trend.summary.deltaRate >= 0 ? 'Improved' : 'Changed'} over {days}d</p>
          </div>
          <div>
            <p className="text-xs text-emerald-300/70 font-medium mb-1 flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" /> Insights Generated</p>
            <p className="text-4xl font-bold text-white">{fmt(c.insightsGenerated)}</p>
            <p className="text-xs text-slate-400 mt-1">{fmt(c.maintenancePatterns)} patterns learned</p>
          </div>
        </div>
      </div>

      {/* Secondary stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Target className="h-4 w-4 text-blue-400" />} label="Avg Stability" value={`${c.avgStabilityPct}%`} sub="weighted score" accent="text-blue-400" />
        <StatCard icon={<AlertTriangle className="h-4 w-4 text-amber-400" />} label="Fragile Selectors" value={fmt(c.fragileSelectors)} sub="need attention" accent="text-amber-400" />
        <StatCard icon={<GitBranch className="h-4 w-4 text-purple-400" />} label="Maintenance Patterns" value={fmt(c.maintenancePatterns)} sub="reusable fixes" accent="text-purple-400" />
        <StatCard icon={<Wrench className="h-4 w-4 text-red-400" />} label="Total Breaks Repaired" value={fmt(c.totalBreaks)} sub="self-healed" accent="text-red-400" />
      </div>

      {/* ============ SECTION B: Healing Success Rate Trend ============ */}
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-400" /> Healing Success Rate Trend
          </h3>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-slate-400">Start <span className="text-slate-200 font-semibold">{trend.summary.startRate}%</span></span>
            <span className="text-slate-400">Now <span className="text-emerald-300 font-semibold">{trend.summary.endRate}%</span></span>
            <span className={`flex items-center gap-1 font-semibold ${trend.summary.improving ? 'text-emerald-400' : 'text-red-400'}`}>
              {trend.summary.improving ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {trend.summary.deltaRate > 0 ? '+' : ''}{trend.summary.deltaRate}%
            </span>
          </div>
        </div>
        {points.some(p => p.attempts > 0) ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={points} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
              <defs>
                <linearGradient id="healGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={d => (d || '').slice(5)} tickLine={false} axisLine={{ stroke: '#1e293b' }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={v => `${v}%`} tickLine={false} axisLine={false} width={40} />
              <RechartsTooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px', color: '#f1f5f9' }}
                formatter={(value: any, name: string) => {
                  if (name === 'rate') return [`${Number(value).toFixed(1)}%`, 'Success Rate'];
                  return [value, name];
                }}
              />
              {trend.summary.avgRate > 0 && (
                <ReferenceLine y={trend.summary.avgRate} stroke="#3b82f6" strokeDasharray="4 4" label={{ value: `avg ${trend.summary.avgRate}%`, fill: '#60a5fa', fontSize: 10, position: 'right' }} />
              )}
              <Area type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={2.5} fill="url(#healGradient)" dot={{ r: 2, fill: '#10b981' }} activeDot={{ r: 5, fill: '#10b981' }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-slate-500 text-sm text-center py-16">No healing attempts recorded in this window yet.</p>
        )}
        {/* Week-over-week comparison */}
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-700/50">
          <div className="text-center">
            <p className="text-xs text-slate-500">Prev Half Avg</p>
            <p className="text-lg font-bold text-slate-300">{prevAvg.toFixed(1)}%</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500">Recent Half Avg</p>
            <p className="text-lg font-bold text-emerald-400">{curAvg.toFixed(1)}%</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500">Week-over-Week</p>
            <p className={`text-lg font-bold flex items-center justify-center gap-1 ${wow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {wow >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}{wow > 0 ? '+' : ''}{wow}%
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center gap-6 mt-3 text-xs text-slate-500">
          <span>Total attempts: <span className="text-slate-300 font-medium">{fmt(trend.summary.totalAttempts)}</span></span>
          <span>Healed: <span className="text-emerald-300 font-medium">{fmt(trend.summary.totalHealed)}</span></span>
        </div>
      </div>

      {/* ============ SECTION C + D side by side ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION C: Maintenance Patterns Learned */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-4">
            <GitBranch className="h-4 w-4 text-purple-400" /> Maintenance Patterns Learned
            <span className="ml-auto text-xs text-slate-500 font-normal">{fmt(c.maintenancePatterns)} total</span>
          </h3>
          {data.topPatterns.length > 0 ? (
            <div className="space-y-3">
              {data.topPatterns.map((p, i) => (
                <div key={i} className="bg-slate-900/40 border border-slate-700/40 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-xs font-mono mb-2 flex-wrap">
                    <code className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-300 break-all">{p.oldSelector}</code>
                    <ArrowUpRight className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    <code className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 break-all">{p.newSelector}</code>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-amber-400" /> applied {p.timesApplied}×</span>
                    {p.successRate != null && <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-400" /> {p.successRate}% success</span>}
                    <span className="ml-auto text-slate-500">conf {p.confidence}%</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm text-center py-10">No maintenance patterns learned yet.</p>
          )}
        </div>

        {/* SECTION D: Fragile Selectors */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-4">
            <AlertTriangle className="h-4 w-4 text-amber-400" /> Fragile Selectors
            <span className="ml-auto text-xs text-slate-500 font-normal">{fmt(c.fragileSelectors)} flagged</span>
          </h3>
          {data.topFragileSelectors.length > 0 ? (
            <div className="space-y-3">
              {data.topFragileSelectors.map((s, i) => {
                const sev = SEVERITY_META[s.severity] || SEVERITY_META.medium;
                return (
                  <div key={i} className={`rounded-lg p-3 border ${sev.border} ${sev.bg}`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <code className="text-xs font-mono text-slate-200 break-all">{s.selector}</code>
                      <span className={`shrink-0 text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${sev.color} ${sev.bg} border ${sev.border}`}>{sev.label}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mb-2">
                      <span>stability <span className={sev.color + ' font-semibold'}>{s.stabilityPct}%</span></span>
                      <span>broke <span className="text-red-300 font-semibold">{s.timesBroken}×</span></span>
                      <span className="text-slate-500">via {s.strategy}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-400">Suggested: <span className="text-emerald-300 font-medium">{s.suggestedStrategy}</span></span>
                      <button className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30 transition-all print:hidden">
                        <Wrench className="h-3 w-3" /> Fix Now
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10">
              <ShieldCheck className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">No fragile selectors — your suite is rock solid.</p>
            </div>
          )}
        </div>
      </div>

      {/* ============ Strategy stability bars ============ */}
      {data.strategyStability && data.strategyStability.length > 0 && (
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-4">
            <FlaskConical className="h-4 w-4 text-cyan-400" /> Stability by Selector Strategy
          </h3>
          <div className="space-y-3">
            {data.strategyStability.map((s, i) => {
              const pct = Math.round((s.avg_stability || 0) * 100);
              return (
                <div key={i}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-2 text-slate-300 font-medium">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: strategyColor(s.strategy) }} />
                      {s.strategy}
                    </span>
                    <span className="text-slate-400">{pct}% · {fmt(s.samples)} samples</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-900/60 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: strategyColor(s.strategy) }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============ SECTION E: Intelligence Insights Feed ============ */}
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-400" /> Intelligence Insights
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            {Object.entries(data.insightCounts || {}).slice(0, 4).map(([k, v]) => (
              <span key={k} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700/40 text-slate-300 border border-slate-600/40">{prettyType(k)} {v}</span>
            ))}
          </div>
        </div>
        {data.recentInsights.length > 0 ? (
          <div className="space-y-2">
            {data.recentInsights.map((ins) => (
              <div key={ins.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/40 border border-slate-700/40 hover:border-slate-600/60 transition-all">
                <div className="mt-0.5 p-1.5 rounded-md bg-emerald-500/10 shrink-0">
                  <Lightbulb className="h-3.5 w-3.5 text-emerald-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-slate-200">{prettyType(ins.insight_type)}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/30">conf {Math.round((ins.confidence || 0) * 100)}%</span>
                    <span className="text-[10px] text-slate-500">· {ins.evidence_count} evidence</span>
                    <span className="ml-auto text-[10px] text-slate-500">{timeAgo(ins.updated_at)}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 break-words">{insightSummary(ins)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-sm text-center py-10">No insights generated yet. Click <span className="text-blue-300">Analyze Now</span> to mine recent runs.</p>
        )}
      </div>

      <p className="text-center text-xs text-slate-600 pb-2">
        Generated {data.generatedAt ? new Date(data.generatedAt).toLocaleString() : ''} · {days}-day window
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

function StatCard({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: string; sub: string; accent: string }) {
  return (
    <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-slate-400 font-medium">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${accent}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-1">{sub}</p>
    </div>
  );
}
