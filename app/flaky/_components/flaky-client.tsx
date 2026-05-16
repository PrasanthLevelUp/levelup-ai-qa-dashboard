'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Bug,
  Clock,
  BarChart3,
  Shield,
  Target,
  ArrowUpRight,
  Info,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip,
  ResponsiveContainer, CartesianGrid,
  BarChart, Bar, Cell,
} from 'recharts';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface FlakyTest {
  test_name: string;
  flaky_count: number;
  total_analyses: number;
  flaky_rate: number;
  latest_reason: string | null;
  latest_severity: string;
  classifications: string[];
  first_seen: string;
  last_seen: string;
  affected_components: string[];
}

interface FlakySummary {
  totalFlaky: number;
  totalAnalyses: number;
  flakyRate: number;
}

interface TrendPoint {
  date: string;
  flaky: number;
  total: number;
}

interface HistoryEntry {
  id: number;
  test_name: string;
  root_cause: string;
  classification: string;
  severity: string;
  confidence: number;
  suggested_fix: string;
  is_flaky: boolean;
  flaky_reason: string | null;
  affected_component: string;
  healing_attempted: boolean;
  healing_succeeded: boolean;
  healing_strategy: string | null;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'text-red-400 bg-red-500/10 border-red-500/20',
  high: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  low: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
};

const CLASS_LABELS: Record<string, string> = {
  flaky_test: 'Flaky Test',
  selector_drift: 'Selector Drift',
  infra_issue: 'Infra Issue',
  app_bug: 'App Bug',
  env_config: 'Env Config',
  data_issue: 'Data Issue',
  unknown: 'Unknown',
};

const CLASS_COLORS: Record<string, string> = {
  flaky_test: '#f59e0b',
  selector_drift: '#8b5cf6',
  infra_issue: '#ef4444',
  app_bug: '#3b82f6',
  env_config: '#6366f1',
  data_issue: '#14b8a6',
  unknown: '#64748b',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

/* ------------------------------------------------------------------ */
/* Main Component                                                      */
/* ------------------------------------------------------------------ */

export function FlakyClient() {
  const [tests, setTests] = useState<FlakyTest[]>([]);
  const [summary, setSummary] = useState<FlakySummary>({ totalFlaky: 0, totalAnalyses: 0, flakyRate: 0 });
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTest, setExpandedTest] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'flaky_count' | 'flaky_rate' | 'last_seen'>('flaky_count');

  const fetchData = useCallback(async () => {
    try {
      const [flakyRes, trendRes] = await Promise.all([
        fetch('/api/flaky'),
        fetch('/api/flaky/trend?days=30'),
      ]);
      const flakyData = await flakyRes.json();
      const trendData = await trendRes.json();

      if (flakyData.success) {
        setTests(flakyData.data.tests || []);
        setSummary(flakyData.data.summary || { totalFlaky: 0, totalAnalyses: 0, flakyRate: 0 });
      }
      if (trendData.success) {
        setTrend(trendData.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch flaky data:', err);
    }
  }, []);

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const toggleExpand = async (testName: string) => {
    if (expandedTest === testName) {
      setExpandedTest(null);
      setHistory([]);
      return;
    }
    setExpandedTest(testName);
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/flaky/history/${encodeURIComponent(testName)}`);
      const data = await res.json();
      if (data.success) setHistory(data.data || []);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const sortedTests = [...tests].sort((a, b) => {
    if (sortBy === 'flaky_count') return b.flaky_count - a.flaky_count;
    if (sortBy === 'flaky_rate') return b.flaky_rate - a.flaky_rate;
    return new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime();
  });

  // Build classification breakdown for bar chart
  const classBreakdown = tests.reduce<Record<string, number>>((acc, t) => {
    t.classifications.forEach((c) => {
      acc[c] = (acc[c] || 0) + t.flaky_count;
    });
    return acc;
  }, {});
  const classChartData = Object.entries(classBreakdown)
    .map(([name, value]) => ({ name: CLASS_LABELS[name] || name, value, fill: CLASS_COLORS[name] || '#64748b' }))
    .sort((a, b) => b.value - a.value);

  // Severity breakdown
  const sevBreakdown = tests.reduce<Record<string, number>>((acc, t) => {
    acc[t.latest_severity] = (acc[t.latest_severity] || 0) + 1;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-slate-400">
          <RefreshCw size={20} className="animate-spin" />
          <span>Loading flaky test data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-display flex items-center gap-2">
            <Bug className="text-amber-400" size={24} />
            Flaky Tests
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Identify unreliable tests, understand root causes, and track resolution progress.
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); fetchData().finally(() => setLoading(false)); }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1e293b] border border-[#334155] text-slate-300 hover:text-white hover:bg-[#334155] transition-colors text-xs"
        >
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      {/* Empty State */}
      {tests.length === 0 && trend.length === 0 ? (
        <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-12 text-center">
          <Shield size={40} className="text-emerald-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-white mb-2">No Flaky Tests Detected</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Great news! The RCA engine hasn&apos;t flagged any tests as flaky yet.
            As more healing jobs run, flaky tests will automatically appear here.
          </p>
        </div>
      ) : (
        <>
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Flaky Tests Found"
              value={summary.totalFlaky}
              icon={AlertTriangle}
              color="text-amber-400"
              bgColor="bg-amber-500/10"
            />
            <MetricCard
              label="Flaky Rate"
              value={`${summary.flakyRate}%`}
              icon={Activity}
              color="text-red-400"
              bgColor="bg-red-500/10"
              subtitle={`${summary.totalFlaky} of ${summary.totalAnalyses} analyses`}
            />
            <MetricCard
              label="Unique Flaky Tests"
              value={tests.length}
              icon={Target}
              color="text-purple-400"
              bgColor="bg-purple-500/10"
            />
            <MetricCard
              label="Most Affected Severity"
              value={Object.entries(sevBreakdown).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'}
              icon={Zap}
              color="text-blue-400"
              bgColor="bg-blue-500/10"
              subtitle={`${Object.values(sevBreakdown).reduce((a, b) => a + b, 0)} total issues`}
              capitalize
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Flaky Trend Chart */}
            <div className="lg:col-span-2 bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp size={14} className="text-amber-400" />
                Flaky Test Trend (30 days)
              </h3>
              {trend.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={trend}>
                    <defs>
                      <linearGradient id="flakyGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey="date"
                      stroke="#475569"
                      fontSize={10}
                      tickFormatter={(v) => new Date(v).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis stroke="#475569" fontSize={10} allowDecimals={false} />
                    <RechartsTooltip
                      contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: 12 }}
                      labelStyle={{ color: '#94a3b8' }}
                      labelFormatter={(v) => new Date(v).toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' })}
                    />
                    <Area type="monotone" dataKey="total" name="Total Analyses" stroke="#3b82f6" fill="url(#totalGrad)" strokeWidth={1.5} />
                    <Area type="monotone" dataKey="flaky" name="Flaky" stroke="#f59e0b" fill="url(#flakyGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-slate-600 text-center py-10">No trend data available yet.</p>
              )}
            </div>

            {/* Classification Breakdown */}
            <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <BarChart3 size={14} className="text-purple-400" />
                Root Cause Breakdown
              </h3>
              {classChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={classChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                    <XAxis type="number" stroke="#475569" fontSize={10} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" stroke="#475569" fontSize={10} width={95} />
                    <RechartsTooltip
                      contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: 12 }}
                    />
                    <Bar dataKey="value" name="Occurrences" radius={[0, 4, 4, 0]} barSize={18}>
                      {classChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-slate-600 text-center py-10">No classification data yet.</p>
              )}
            </div>
          </div>

          {/* Flaky Tests Table */}
          <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl overflow-hidden">
            {/* Table Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a3040]">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Bug size={14} className="text-amber-400" />
                Flaky Test Details
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {tests.length}
                </span>
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-600">Sort by:</span>
                {(['flaky_count', 'flaky_rate', 'last_seen'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSortBy(s)}
                    className={`text-[10px] px-2 py-1 rounded-md transition-colors ${
                      sortBy === s
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {s === 'flaky_count' ? 'Count' : s === 'flaky_rate' ? 'Rate' : 'Recent'}
                  </button>
                ))}
              </div>
            </div>

            {/* Test Rows */}
            <div className="divide-y divide-[#2a3040]">
              {sortedTests.map((test) => {
                const isExpanded = expandedTest === test.test_name;
                const sevClass = SEVERITY_COLORS[test.latest_severity] || SEVERITY_COLORS.medium;

                return (
                  <div key={test.test_name}>
                    {/* Main Row */}
                    <button
                      onClick={() => toggleExpand(test.test_name)}
                      className="w-full text-left px-5 py-4 hover:bg-[#0c1222]/30 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        {/* Flaky indicator */}
                        <div className="shrink-0">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${test.flaky_rate > 50 ? 'bg-red-500/10' : test.flaky_rate > 25 ? 'bg-amber-500/10' : 'bg-yellow-500/10'}`}>
                            <span className={`text-sm font-bold ${test.flaky_rate > 50 ? 'text-red-400' : test.flaky_rate > 25 ? 'text-amber-400' : 'text-yellow-400'}`}>
                              {test.flaky_rate}%
                            </span>
                          </div>
                        </div>

                        {/* Test info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-white truncate max-w-md" title={test.test_name}>
                              {test.test_name}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${sevClass}`}>
                              {test.latest_severity}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                              <AlertTriangle size={8} />
                              {test.flaky_count} flaky / {test.total_analyses} total
                            </span>
                            {test.affected_components.length > 0 && (
                              <span className="text-[10px] text-slate-600">
                                → {test.affected_components.slice(0, 2).join(', ')}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Classifications pills */}
                        <div className="hidden md:flex items-center gap-1 shrink-0">
                          {test.classifications.slice(0, 3).map((c) => (
                            <span
                              key={c}
                              className="text-[9px] px-1.5 py-0.5 rounded-md"
                              style={{ backgroundColor: `${CLASS_COLORS[c] || '#475569'}15`, color: CLASS_COLORS[c] || '#94a3b8' }}
                            >
                              {CLASS_LABELS[c] || c}
                            </span>
                          ))}
                        </div>

                        {/* Last seen */}
                        <div className="hidden sm:flex items-center gap-1 text-[10px] text-slate-600 shrink-0">
                          <Clock size={9} />
                          {timeAgo(test.last_seen)}
                        </div>

                        {/* Expand arrow */}
                        <div className="shrink-0 text-slate-600">
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </div>
                      </div>

                      {/* Latest reason preview */}
                      {test.latest_reason && (
                        <p className="text-[11px] text-slate-500 mt-2 pl-14 line-clamp-1">
                          {test.latest_reason}
                        </p>
                      )}
                    </button>

                    {/* Expanded History Panel */}
                    {isExpanded && (
                      <div className="bg-[#0c1222] border-t border-[#2a3040] px-5 py-4">
                        {historyLoading ? (
                          <div className="flex items-center gap-2 text-slate-500 py-4 justify-center">
                            <RefreshCw size={12} className="animate-spin" />
                            <span className="text-xs">Loading history...</span>
                          </div>
                        ) : history.length === 0 ? (
                          <p className="text-xs text-slate-600 text-center py-4">No analysis history found.</p>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-semibold text-slate-400">Analysis History</h4>
                              <span className="text-[10px] text-slate-600">{history.length} entries</span>
                            </div>
                            <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                              {history.map((entry) => (
                                <HistoryRow key={entry.id} entry={entry} />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

function MetricCard({
  label, value, icon: Icon, color, bgColor, subtitle, capitalize,
}: {
  label: string;
  value: string | number;
  icon: any;
  color: string;
  bgColor: string;
  subtitle?: string;
  capitalize?: boolean;
}) {
  return (
    <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-500 font-medium">{label}</span>
        <div className={`w-8 h-8 rounded-lg ${bgColor} flex items-center justify-center`}>
          <Icon size={14} className={color} />
        </div>
      </div>
      <p className={`text-2xl font-bold text-white ${capitalize ? 'capitalize' : ''}`}>{value}</p>
      {subtitle && <p className="text-[10px] text-slate-600 mt-1">{subtitle}</p>}
    </div>
  );
}

function HistoryRow({ entry }: { entry: HistoryEntry }) {
  const sevClass = SEVERITY_COLORS[entry.severity] || SEVERITY_COLORS.medium;
  const isFlaky = entry.is_flaky;

  return (
    <div className={`rounded-lg border px-4 py-3 ${
      isFlaky
        ? 'border-amber-500/15 bg-amber-500/[0.02]'
        : 'border-[#2a3040] bg-[#1a1f2e]/50'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${sevClass}`}>
              {entry.severity}
            </span>
            <span
              className="text-[9px] px-1.5 py-0.5 rounded-md"
              style={{ backgroundColor: `${CLASS_COLORS[entry.classification] || '#475569'}15`, color: CLASS_COLORS[entry.classification] || '#94a3b8' }}
            >
              {CLASS_LABELS[entry.classification] || entry.classification}
            </span>
            {isFlaky && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 flex items-center gap-0.5">
                <AlertTriangle size={7} />
                Flaky
              </span>
            )}
            {entry.healing_attempted && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded-md flex items-center gap-0.5 ${
                entry.healing_succeeded
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-red-500/10 text-red-400'
              }`}>
                <Zap size={7} />
                {entry.healing_succeeded ? 'Healed' : 'Heal Failed'}
              </span>
            )}
            <span className="text-[9px] text-slate-600 flex items-center gap-0.5">
              <Target size={7} />
              {Math.round(entry.confidence * 100)}% confidence
            </span>
          </div>

          {/* Root cause */}
          <p className="text-xs text-slate-300 leading-relaxed">{entry.root_cause}</p>

          {/* Suggested fix */}
          {entry.suggested_fix && (
            <p className="text-[11px] text-slate-500 mt-1.5">
              <span className="text-emerald-400/70">Fix:</span> {entry.suggested_fix}
            </p>
          )}

          {/* Flaky reason */}
          {entry.flaky_reason && (
            <p className="text-[11px] text-amber-400/60 mt-1">
              <span className="text-amber-400/80">Flaky reason:</span> {entry.flaky_reason}
            </p>
          )}
        </div>

        {/* Timestamp */}
        <div className="text-[10px] text-slate-600 shrink-0 flex items-center gap-1">
          <Clock size={9} />
          {timeAgo(entry.created_at)}
        </div>
      </div>
    </div>
  );
}
