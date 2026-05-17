'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  RefreshCw, Brain, Zap, Target, TrendingUp,
  Award, Clock, CheckCircle2, AlertTriangle, Search,
  ArrowRight, Sparkles, BarChart3, Activity,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip,
  ResponsiveContainer, CartesianGrid,
  BarChart, Bar, Cell, Legend,
} from 'recharts';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface LearningStats {
  totalPatterns: number;
  totalUsages: number;
  avgConfidence: number;
  avgTokensSaved: number;
  totalTokensSaved: number;
  topStrategy: string;
  activePatterns: number;
  stalePatterns: number;
}

interface Pattern {
  id: number;
  test_name: string;
  error_pattern: string;
  failed_locator: string;
  healed_locator: string;
  solution_strategy: string;
  confidence: number;
  success_count: number;
  failure_count: number;
  usage_count: number;
  avg_tokens_saved: number;
  last_used: string;
  created_at: string;
}

interface Strategy {
  strategy: string;
  pattern_count: number;
  total_usages: number;
  avg_confidence: number;
  success_rate: number;
  avg_tokens_saved: number;
}

interface VelocityPoint {
  date: string;
  new_patterns: number;
  pattern_usages: number;
}

type Tab = 'overview' | 'patterns' | 'strategies';

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const TABS: { key: Tab; label: string; icon: typeof Brain }[] = [
  { key: 'overview', label: 'Overview', icon: BarChart3 },
  { key: 'patterns', label: 'Patterns', icon: Brain },
  { key: 'strategies', label: 'Strategies', icon: Target },
];

const STRATEGY_COLORS: Record<string, string> = {
  rule_based: '#10b981',
  pattern_match: '#3b82f6',
  ai: '#a855f7',
};

const STRATEGY_LABELS: Record<string, string> = {
  rule_based: 'Rule-Based',
  pattern_match: 'Pattern Match',
  ai: 'AI Reasoning',
};

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function LearningClient() {
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<LearningStats | null>(null);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [topPatterns, setTopPatterns] = useState<Pattern[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [velocity, setVelocity] = useState<VelocityPoint[]>([]);
  const [search, setSearch] = useState('');
  const [strategyFilter, setStrategyFilter] = useState<string>('all');

  /* Fetch all data */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, pRes, tRes, strRes, vRes] = await Promise.allSettled([
        fetch('/api/learning'),
        fetch('/api/learning/patterns?limit=200'),
        fetch('/api/learning/top?limit=10'),
        fetch('/api/learning/strategies'),
        fetch('/api/learning/velocity?days=30'),
      ]);

      if (sRes.status === 'fulfilled') {
        const d = await sRes.value.json();
        if (d.success) setStats(d.data);
      }
      if (pRes.status === 'fulfilled') {
        const d = await pRes.value.json();
        if (d.success) setPatterns(d.data || []);
      }
      if (tRes.status === 'fulfilled') {
        const d = await tRes.value.json();
        if (d.success) setTopPatterns(d.data || []);
      }
      if (strRes.status === 'fulfilled') {
        const d = await strRes.value.json();
        if (d.success) setStrategies(d.data || []);
      }
      if (vRes.status === 'fulfilled') {
        const d = await vRes.value.json();
        if (d.success) setVelocity(d.data || []);
      }
    } catch (e) {
      console.error('Learning load error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* Filtered patterns */
  const filtered = patterns.filter((p) => {
    const matchesSearch =
      !search ||
      p.test_name.toLowerCase().includes(search.toLowerCase()) ||
      p.error_pattern.toLowerCase().includes(search.toLowerCase()) ||
      p.failed_locator.toLowerCase().includes(search.toLowerCase());
    const matchesStrategy =
      strategyFilter === 'all' || p.solution_strategy === strategyFilter;
    return matchesSearch && matchesStrategy;
  });

  /* Strategy chart data */
  const strategyChartData = strategies.map((s) => ({
    name: STRATEGY_LABELS[s.strategy] || s.strategy,
    patterns: s.pattern_count,
    usages: s.total_usages,
    confidence: Math.round(s.avg_confidence * 100),
    successRate: Math.round(s.success_rate),
    tokensSaved: Math.round(s.avg_tokens_saved),
    fill: STRATEGY_COLORS[s.strategy] || '#6b7280',
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Brain className="h-7 w-7 text-purple-400" />
            Learning Engine
          </h1>
          <p className="text-slate-400 mt-1">
            Pattern recognition &amp; self-healing intelligence analytics
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1a1f2e] border border-[#2a3040] text-slate-300 hover:bg-[#242938] transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#1a1f2e] p-1 rounded-lg border border-[#2a3040] w-fit">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-8 w-8 text-purple-400 animate-spin" />
        </div>
      )}

      {/* ============== OVERVIEW TAB ============== */}
      {!loading && tab === 'overview' && (
        <div className="space-y-6">
          {/* Stat Cards */}
          {stats && <StatsCards stats={stats} />}

          {/* Two-column: velocity chart + strategy comparison */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Learning Velocity */}
            <div className="bg-[#1a1f2e] rounded-xl border border-[#2a3040] p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Activity className="h-5 w-5 text-emerald-400" />
                Learning Velocity (30 days)
              </h3>
              {velocity.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={velocity}>
                    <defs>
                      <linearGradient id="newPatternsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="usagesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a3040" />
                    <XAxis
                      dataKey="date"
                      stroke="#64748b"
                      fontSize={12}
                      tickFormatter={(v: string) => new Date(v).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                      labelStyle={{ color: '#94a3b8' }}
                      labelFormatter={(v: string) => new Date(v).toLocaleDateString()}
                    />
                    <Area type="monotone" dataKey="new_patterns" name="New Patterns" stroke="#a855f7" fill="url(#newPatternsGrad)" strokeWidth={2} />
                    <Area type="monotone" dataKey="pattern_usages" name="Pattern Reuse" stroke="#10b981" fill="url(#usagesGrad)" strokeWidth={2} />
                    <Legend />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState text="No velocity data yet" />
              )}
            </div>

            {/* Strategy Comparison */}
            <div className="bg-[#1a1f2e] rounded-xl border border-[#2a3040] p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-400" />
                Strategy Effectiveness
              </h3>
              {strategyChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={strategyChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a3040" />
                    <XAxis type="number" stroke="#64748b" fontSize={12} />
                    <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={12} width={110} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                      labelStyle={{ color: '#94a3b8' }}
                    />
                    <Bar dataKey="usages" name="Total Usages" radius={[0, 4, 4, 0]}>
                      {strategyChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState text="No strategy data yet" />
              )}
            </div>
          </div>

          {/* Top Patterns */}
          <div className="bg-[#1a1f2e] rounded-xl border border-[#2a3040] p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-400" />
              Top Patterns by Usage
            </h3>
            {topPatterns.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-400 border-b border-[#2a3040]">
                      <th className="text-left py-3 px-3 font-medium">#</th>
                      <th className="text-left py-3 px-3 font-medium">Test</th>
                      <th className="text-left py-3 px-3 font-medium">Error Pattern</th>
                      <th className="text-left py-3 px-3 font-medium">Strategy</th>
                      <th className="text-right py-3 px-3 font-medium">Usages</th>
                      <th className="text-right py-3 px-3 font-medium">Success</th>
                      <th className="text-right py-3 px-3 font-medium">Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topPatterns.map((p, i) => (
                      <tr key={p.id} className="border-b border-[#2a3040]/50 hover:bg-[#242938] transition-colors">
                        <td className="py-3 px-3 text-slate-500 font-mono">{i + 1}</td>
                        <td className="py-3 px-3">
                          <span className="text-white font-medium truncate block max-w-[200px]" title={p.test_name}>
                            {p.test_name}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-slate-300 truncate block max-w-[250px] font-mono text-xs" title={p.error_pattern}>
                            {p.error_pattern}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <StrategyBadge strategy={p.solution_strategy} />
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-white">{p.usage_count}</td>
                        <td className="py-3 px-3 text-right">
                          <SuccessRate success={p.success_count} failure={p.failure_count} />
                        </td>
                        <td className="py-3 px-3 text-right">
                          <ConfidenceBadge confidence={p.confidence} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState text="No patterns learned yet" />
            )}
          </div>
        </div>
      )}

      {/* ============== PATTERNS TAB ============== */}
      {!loading && tab === 'patterns' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search by test name, error, or locator..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#1a1f2e] border border-[#2a3040] text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
              />
            </div>
            <select
              value={strategyFilter}
              onChange={(e) => setStrategyFilter(e.target.value)}
              className="px-4 py-2.5 rounded-lg bg-[#1a1f2e] border border-[#2a3040] text-slate-300 focus:outline-none focus:border-purple-500/50"
            >
              <option value="all">All Strategies</option>
              <option value="rule_based">Rule-Based</option>
              <option value="pattern_match">Pattern Match</option>
              <option value="ai">AI Reasoning</option>
            </select>
          </div>

          <p className="text-slate-500 text-sm">{filtered.length} patterns</p>

          {/* Pattern Cards */}
          {filtered.length > 0 ? (
            <div className="space-y-3">
              {filtered.map((p) => (
                <PatternCard key={p.id} pattern={p} />
              ))}
            </div>
          ) : (
            <EmptyState text={search || strategyFilter !== 'all' ? 'No matching patterns' : 'No patterns learned yet'} />
          )}
        </div>
      )}

      {/* ============== STRATEGIES TAB ============== */}
      {!loading && tab === 'strategies' && (
        <div className="space-y-6">
          {strategies.length > 0 ? (
            <>
              {/* Strategy Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {strategies.map((s) => (
                  <StrategyCard key={s.strategy} strategy={s} />
                ))}
              </div>

              {/* Comparison Chart */}
              <div className="bg-[#1a1f2e] rounded-xl border border-[#2a3040] p-6">
                <h3 className="text-white font-semibold mb-4">Confidence &amp; Success Rate Comparison</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={strategyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a3040" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                      labelStyle={{ color: '#94a3b8' }}
                    />
                    <Legend />
                    <Bar dataKey="confidence" name="Avg Confidence %" fill="#a855f7" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="successRate" name="Success Rate %" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <EmptyState text="No strategy data available" />
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

function StatsCards({ stats }: { stats: LearningStats }) {
  const cards = [
    {
      label: 'Total Patterns',
      value: formatNum(stats.totalPatterns),
      icon: Brain,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
    },
    {
      label: 'Pattern Usages',
      value: formatNum(stats.totalUsages),
      icon: Zap,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Avg Confidence',
      value: `${(stats.avgConfidence * 100).toFixed(1)}%`,
      icon: Target,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Tokens Saved',
      value: formatNum(stats.totalTokensSaved),
      icon: Sparkles,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'Active Patterns',
      value: stats.activePatterns.toString(),
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      sub: `${stats.stalePatterns} stale`,
    },
    {
      label: 'Top Strategy',
      value: STRATEGY_LABELS[stats.topStrategy] || stats.topStrategy || 'N/A',
      icon: Award,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.label}
            className="bg-[#1a1f2e] rounded-xl border border-[#2a3040] p-4 hover:border-purple-500/30 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-lg ${c.bg}`}>
                <Icon className={`h-4 w-4 ${c.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{c.value}</p>
            <p className="text-slate-400 text-xs mt-1">{c.label}</p>
            {c.sub && <p className="text-slate-500 text-xs">{c.sub}</p>}
          </div>
        );
      })}
    </div>
  );
}

function PatternCard({ pattern: p }: { pattern: Pattern }) {
  const successRate = p.success_count + p.failure_count > 0
    ? Math.round((p.success_count / (p.success_count + p.failure_count)) * 100)
    : 0;

  return (
    <div className="bg-[#1a1f2e] rounded-xl border border-[#2a3040] p-5 hover:border-purple-500/20 transition-colors">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-medium text-sm">{p.test_name}</span>
            <StrategyBadge strategy={p.solution_strategy} />
          </div>
          <p className="text-slate-400 text-xs font-mono truncate" title={p.error_pattern}>
            {p.error_pattern}
          </p>
          <div className="flex items-center gap-2 text-xs">
            <code className="text-red-400/80 bg-red-500/10 px-2 py-0.5 rounded truncate max-w-[250px]" title={p.failed_locator}>
              {p.failed_locator}
            </code>
            <ArrowRight className="h-3 w-3 text-slate-600 flex-shrink-0" />
            <code className="text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded truncate max-w-[250px]" title={p.healed_locator}>
              {p.healed_locator}
            </code>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs flex-shrink-0">
          <div className="text-center">
            <p className="text-white font-bold text-lg">{p.usage_count}</p>
            <p className="text-slate-500">Uses</p>
          </div>
          <div className="text-center">
            <p className={`font-bold text-lg ${successRate >= 80 ? 'text-emerald-400' : successRate >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
              {successRate}%
            </p>
            <p className="text-slate-500">Success</p>
          </div>
          <div className="text-center">
            <ConfidenceBadge confidence={p.confidence} />
            <p className="text-slate-500 mt-1">Conf.</p>
          </div>
          <div className="text-center">
            <p className="text-slate-300 font-mono">{Math.round(p.avg_tokens_saved)}</p>
            <p className="text-slate-500">Tokens</p>
          </div>
          <div className="text-center">
            <p className="text-slate-400">{timeAgo(p.last_used)}</p>
            <p className="text-slate-500">Last used</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StrategyCard({ strategy: s }: { strategy: Strategy }) {
  const color = STRATEGY_COLORS[s.strategy] || '#6b7280';
  const label = STRATEGY_LABELS[s.strategy] || s.strategy;

  return (
    <div
      className="bg-[#1a1f2e] rounded-xl border border-[#2a3040] p-6 hover:border-opacity-50 transition-colors"
      style={{ borderColor: `${color}30` }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}20` }}>
          {s.strategy === 'rule_based' && <Zap className="h-5 w-5" style={{ color }} />}
          {s.strategy === 'pattern_match' && <Brain className="h-5 w-5" style={{ color }} />}
          {s.strategy === 'ai' && <Sparkles className="h-5 w-5" style={{ color }} />}
          {!['rule_based', 'pattern_match', 'ai'].includes(s.strategy) && <Target className="h-5 w-5" style={{ color }} />}
        </div>
        <h3 className="text-white font-semibold text-lg">{label}</h3>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Patterns</span>
          <span className="text-white font-medium">{s.pattern_count}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Total Usages</span>
          <span className="text-white font-medium">{s.total_usages}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Avg Confidence</span>
          <span className="font-medium" style={{ color }}>{(s.avg_confidence * 100).toFixed(1)}%</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Success Rate</span>
          <span className={`font-medium ${s.success_rate >= 80 ? 'text-emerald-400' : s.success_rate >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
            {s.success_rate.toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Avg Tokens Saved</span>
          <span className="text-white font-medium">{Math.round(s.avg_tokens_saved)}</span>
        </div>
      </div>
    </div>
  );
}

function StrategyBadge({ strategy }: { strategy: string }) {
  const color = STRATEGY_COLORS[strategy] || '#6b7280';
  const label = STRATEGY_LABELS[strategy] || strategy;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: `${color}20`, color }}
    >
      {strategy === 'ai' && <Sparkles className="h-3 w-3" />}
      {label}
    </span>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = confidence * 100;
  const color = pct >= 80 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400';
  return <span className={`font-bold text-sm ${color}`}>{pct.toFixed(0)}%</span>;
}

function SuccessRate({ success, failure }: { success: number; failure: number }) {
  const total = success + failure;
  const rate = total > 0 ? Math.round((success / total) * 100) : 0;
  return (
    <span className="flex items-center gap-1 justify-end">
      {rate >= 80 ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
      ) : rate >= 50 ? (
        <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
      ) : null}
      <span className={`font-mono ${rate >= 80 ? 'text-emerald-400' : rate >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
        {rate}%
      </span>
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-500">
      <Brain className="h-12 w-12 mb-3 opacity-30" />
      <p>{text}</p>
    </div>
  );
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}
