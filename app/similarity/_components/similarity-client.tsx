'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  RefreshCw, Fingerprint, Target, TrendingUp, Sparkles,
  BarChart3, Search, ArrowRight, CheckCircle2, XCircle,
  Zap, Activity, GitCompare, Layers, FlaskConical,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip,
  ResponsiveContainer, CartesianGrid,
  BarChart, Bar, Cell, Legend, PieChart, Pie,
} from 'recharts';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface SimilarityStats {
  totalComparisons: number;
  avgConfidence: number;
  highConfidenceCount: number;
  mediumConfidenceCount: number;
  lowConfidenceCount: number;
  domCandidateHealings: number;
  semanticMatchRate: number;
  strategyEffectiveness: Array<{
    strategy: string;
    count: number;
    avgConfidence: number;
    successRate: number;
  }>;
}

interface DistributionBucket {
  bucket: string;
  range: string;
  count: number;
  percentage: number;
}

interface TrendPoint {
  date: string;
  avgConfidence: number;
  totalHealings: number;
  successCount: number;
  domCandidateCount: number;
}

interface TopMatch {
  failedLocator: string;
  healedLocator: string;
  confidence: number;
  strategy: string;
  testName: string;
  success: boolean;
  createdAt: string;
}

interface LocatorPair {
  failedLocator: string;
  healedLocator: string;
  occurrences: number;
  avgConfidence: number;
  successRate: number;
  strategies: string[];
  lastSeen: string;
}

interface LocatorTypeStats {
  locatorType: string;
  count: number;
  avgConfidence: number;
  successRate: number;
}

interface CompareResult {
  score: number;
  breakdown: {
    stringDistance: number;
    substringMatch: number;
    semanticMatch: number;
    commonPrefix: number;
    attributeTypeBonus: number;
    contextBonus: number;
  };
  reasoning: string;
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'matches', label: 'Top Matches', icon: Target },
  { id: 'pairs', label: 'Locator Pairs', icon: GitCompare },
  { id: 'compare', label: 'Live Compare', icon: FlaskConical },
] as const;

type TabId = typeof TABS[number]['id'];

const STRATEGY_COLORS: Record<string, string> = {
  rule_based: '#10b981',
  database_pattern: '#3b82f6',
  ai_reasoning: '#f59e0b',
};

const STRATEGY_LABELS: Record<string, string> = {
  rule_based: 'Rule Engine',
  database_pattern: 'Pattern Engine',
  ai_reasoning: 'AI Engine',
};

const DISTRIBUTION_COLORS = [
  '#10b981', '#34d399', '#6ee7b7',
  '#3b82f6', '#60a5fa',
  '#f59e0b', '#fbbf24',
  '#ef4444',
];

/* ------------------------------------------------------------------ */
/* Helper                                                              */
/* ------------------------------------------------------------------ */

function truncate(s: string, max = 50) {
  return s && s.length > max ? s.slice(0, max) + '…' : s || '—';
}

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

function strategyBadge(strategy: string) {
  const color = STRATEGY_COLORS[strategy] || '#94a3b8';
  const label = STRATEGY_LABELS[strategy] || strategy;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: `${color}20`, color }}
    >
      {label}
    </span>
  );
}

function confBadge(score: number) {
  const color =
    score >= 0.8 ? '#10b981' :
    score >= 0.6 ? '#3b82f6' :
    score >= 0.4 ? '#f59e0b' : '#ef4444';
  const label =
    score >= 0.8 ? 'High' :
    score >= 0.6 ? 'Good' :
    score >= 0.4 ? 'Fair' : 'Low';
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: `${color}20`, color }}
    >
      {label} ({(score * 100).toFixed(0)}%)
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function SimilarityClient() {
  const [tab, setTab] = useState<TabId>('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SimilarityStats | null>(null);
  const [distribution, setDistribution] = useState<DistributionBucket[]>([]);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [topMatches, setTopMatches] = useState<TopMatch[]>([]);
  const [pairs, setPairs] = useState<LocatorPair[]>([]);
  const [locatorTypes, setLocatorTypes] = useState<LocatorTypeStats[]>([]);

  // Compare state
  const [failedVal, setFailedVal] = useState('');
  const [candidateVal, setCandidateVal] = useState('');
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [comparing, setComparing] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, distRes, trendRes, matchRes, pairRes, typeRes] = await Promise.all([
        fetch('/api/similarity').then(r => r.json()),
        fetch('/api/similarity/distribution').then(r => r.json()),
        fetch('/api/similarity/trend?days=30').then(r => r.json()),
        fetch('/api/similarity/top-matches?limit=20').then(r => r.json()),
        fetch('/api/similarity/pairs?limit=20').then(r => r.json()),
        fetch('/api/similarity/locator-types').then(r => r.json()),
      ]);
      if (!statsRes.error) setStats(statsRes);
      if (Array.isArray(distRes)) setDistribution(distRes);
      if (Array.isArray(trendRes)) setTrend(trendRes);
      if (Array.isArray(matchRes)) setTopMatches(matchRes);
      if (Array.isArray(pairRes)) setPairs(pairRes);
      if (Array.isArray(typeRes)) setLocatorTypes(typeRes);
    } catch (err) {
      console.error('Failed to load similarity data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const runCompare = async () => {
    if (!failedVal.trim() || !candidateVal.trim()) return;
    setComparing(true);
    try {
      const res = await fetch('/api/similarity/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ failedValue: failedVal.trim(), candidateValue: candidateVal.trim() }),
      });
      const data = await res.json();
      if (!data.error) setCompareResult(data);
    } catch (err) {
      console.error('Compare failed', err);
    } finally {
      setComparing(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /* Metrics Cards                                                     */
  /* ---------------------------------------------------------------- */

  const metrics = stats ? [
    {
      label: 'Total Comparisons',
      value: stats.totalComparisons.toLocaleString(),
      icon: Fingerprint,
      color: '#3b82f6',
    },
    {
      label: 'Avg Confidence',
      value: pct(stats.avgConfidence),
      icon: Target,
      color: '#10b981',
    },
    {
      label: 'High Confidence',
      value: stats.highConfidenceCount.toLocaleString(),
      icon: CheckCircle2,
      color: '#10b981',
      sub: `≥ 80% confidence`,
    },
    {
      label: 'Medium Confidence',
      value: stats.mediumConfidenceCount.toLocaleString(),
      icon: Activity,
      color: '#3b82f6',
      sub: '50-79% confidence',
    },
    {
      label: 'DOM Candidate Heals',
      value: stats.domCandidateHealings.toLocaleString(),
      icon: Zap,
      color: '#f59e0b',
      sub: '0 tokens used',
    },
    {
      label: 'Semantic Match Rate',
      value: pct(stats.semanticMatchRate),
      icon: Sparkles,
      color: '#8b5cf6',
    },
  ] : [];

  /* ---------------------------------------------------------------- */
  /* Overview Tab                                                      */
  /* ---------------------------------------------------------------- */

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="bg-[#1e293b] rounded-xl p-5 border border-slate-700/50">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg" style={{ backgroundColor: `${m.color}15` }}>
                  <Icon size={18} style={{ color: m.color }} />
                </div>
                <span className="text-xs uppercase tracking-wider text-slate-400">{m.label}</span>
              </div>
              <div className="text-2xl font-bold text-white">{m.value}</div>
              {m.sub && <span className="text-xs text-slate-500 mt-1 block">{m.sub}</span>}
            </div>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Confidence Distribution */}
        <div className="bg-[#1e293b] rounded-xl p-5 border border-slate-700/50">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-blue-400" />
            Confidence Score Distribution
          </h3>
          {distribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={distribution} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="bucket" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                  formatter={(value: number, _: string, props: any) => [`${value} (${props.payload.percentage}%)`, 'Count']}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {distribution.map((_, i) => (
                    <Cell key={i} fill={DISTRIBUTION_COLORS[i % DISTRIBUTION_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-slate-500 text-sm">No distribution data yet</div>
          )}
        </div>

        {/* Locator Type Breakdown */}
        <div className="bg-[#1e293b] rounded-xl p-5 border border-slate-700/50">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <Layers size={16} className="text-purple-400" />
            Locator Type Analysis
          </h3>
          {locatorTypes.length > 0 ? (
            <div className="space-y-3">
              {locatorTypes.map((lt, i) => {
                const maxCount = Math.max(...locatorTypes.map(l => l.count));
                const widthPct = maxCount > 0 ? (lt.count / maxCount) * 100 : 0;
                return (
                  <div key={lt.locatorType} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium capitalize">{lt.locatorType}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-500">{lt.count} uses</span>
                        <span className="text-emerald-400">{pct(lt.successRate)} success</span>
                        <span className="text-blue-400">{pct(lt.avgConfidence)} conf</span>
                      </div>
                    </div>
                    <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${widthPct}%`,
                          backgroundColor: DISTRIBUTION_COLORS[i % DISTRIBUTION_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-slate-500 text-sm">No locator type data yet</div>
          )}
        </div>
      </div>

      {/* Confidence Trend */}
      <div className="bg-[#1e293b] rounded-xl p-5 border border-slate-700/50">
        <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
          <TrendingUp size={16} className="text-emerald-400" />
          Confidence Trend (30 days)
        </h3>
        {trend.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={trend} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
              <defs>
                <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="healGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={(d: string) => d.slice(5)}
              />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <RechartsTooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                labelFormatter={(l: string) => `Date: ${l}`}
              />
              <Legend />
              <Area
                type="monotone" dataKey="avgConfidence" name="Avg Confidence"
                stroke="#10b981" fill="url(#confGrad)" strokeWidth={2}
              />
              <Area
                type="monotone" dataKey="totalHealings" name="Total Healings"
                stroke="#3b82f6" fill="url(#healGrad)" strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[280px] flex items-center justify-center text-slate-500 text-sm">No trend data yet</div>
        )}
      </div>

      {/* Strategy Effectiveness */}
      {stats && stats.strategyEffectiveness.length > 0 && (
        <div className="bg-[#1e293b] rounded-xl p-5 border border-slate-700/50">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <Zap size={16} className="text-amber-400" />
            Strategy Effectiveness
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {stats.strategyEffectiveness.map((s) => {
              const color = STRATEGY_COLORS[s.strategy] || '#94a3b8';
              const label = STRATEGY_LABELS[s.strategy] || s.strategy;
              return (
                <div key={s.strategy} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/30">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-sm font-medium text-slate-200">{label}</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Healings</span>
                      <span className="text-white font-semibold">{s.count.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Avg Confidence</span>
                      <span className="font-semibold" style={{ color }}>{pct(s.avgConfidence)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Success Rate</span>
                      <span className="font-semibold" style={{ color }}>{pct(s.successRate)}</span>
                    </div>
                    {/* Mini progress bar */}
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden mt-1">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${s.successRate * 100}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  /* ---------------------------------------------------------------- */
  /* Top Matches Tab                                                   */
  /* ---------------------------------------------------------------- */

  const renderMatches = () => (
    <div className="bg-[#1e293b] rounded-xl border border-slate-700/50 overflow-hidden">
      <div className="p-4 border-b border-slate-700/50">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <Target size={16} className="text-emerald-400" />
          Top Similarity Matches (ranked by confidence)
        </h3>
      </div>
      {topMatches.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-700/50 text-slate-400">
                <th className="text-left p-3 font-medium">#</th>
                <th className="text-left p-3 font-medium">Test Name</th>
                <th className="text-left p-3 font-medium">Failed Locator</th>
                <th className="text-left p-3 font-medium">Healed Locator</th>
                <th className="text-left p-3 font-medium">Confidence</th>
                <th className="text-left p-3 font-medium">Strategy</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {topMatches.map((m, i) => (
                <tr key={i} className="border-b border-slate-700/30 hover:bg-slate-800/50 transition-colors">
                  <td className="p-3 text-slate-500 font-mono">{i + 1}</td>
                  <td className="p-3 text-slate-300 font-medium max-w-[150px] truncate" title={m.testName}>
                    {truncate(m.testName, 30)}
                  </td>
                  <td className="p-3">
                    <code className="text-red-400/80 bg-red-950/30 px-1.5 py-0.5 rounded text-[10px] font-mono">
                      {truncate(m.failedLocator, 40)}
                    </code>
                  </td>
                  <td className="p-3">
                    <code className="text-emerald-400/80 bg-emerald-950/30 px-1.5 py-0.5 rounded text-[10px] font-mono">
                      {truncate(m.healedLocator || '—', 40)}
                    </code>
                  </td>
                  <td className="p-3">{confBadge(m.confidence)}</td>
                  <td className="p-3">{strategyBadge(m.strategy)}</td>
                  <td className="p-3">
                    {m.success
                      ? <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 size={12} /> Healed</span>
                      : <span className="text-red-400 flex items-center gap-1"><XCircle size={12} /> Failed</span>
                    }
                  </td>
                  <td className="p-3 text-slate-500">
                    {new Date(m.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-12 text-center text-slate-500">No similarity matches recorded yet</div>
      )}
    </div>
  );

  /* ---------------------------------------------------------------- */
  /* Locator Pairs Tab                                                 */
  /* ---------------------------------------------------------------- */

  const renderPairs = () => (
    <div className="space-y-4">
      <div className="bg-[#1e293b] rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="p-4 border-b border-slate-700/50">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <GitCompare size={16} className="text-blue-400" />
            Recurring Locator Pairs (failed → healed)
          </h3>
          <p className="text-xs text-slate-500 mt-1">Locator mappings that appear multiple times across healing runs</p>
        </div>
        {pairs.length > 0 ? (
          <div className="divide-y divide-slate-700/30">
            {pairs.map((p, i) => (
              <div key={i} className="p-4 hover:bg-slate-800/30 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center text-sm font-bold text-slate-400">
                    {p.occurrences}
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="text-red-400/80 bg-red-950/30 px-2 py-0.5 rounded text-[10px] font-mono break-all">
                        {p.failedLocator}
                      </code>
                      <ArrowRight size={14} className="text-slate-500 flex-shrink-0" />
                      <code className="text-emerald-400/80 bg-emerald-950/30 px-2 py-0.5 rounded text-[10px] font-mono break-all">
                        {p.healedLocator}
                      </code>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span>{p.occurrences} occurrences</span>
                      <span>•</span>
                      {confBadge(p.avgConfidence)}
                      <span>•</span>
                      <span className="text-emerald-400">{pct(p.successRate)} success</span>
                      <span>•</span>
                      <div className="flex gap-1">
                        {p.strategies.map(s => (
                          <span key={s}>{strategyBadge(s)}</span>
                        ))}
                      </div>
                      <span>•</span>
                      <span className="text-slate-500">
                        Last: {new Date(p.lastSeen).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-slate-500">No recurring locator pairs found yet</div>
        )}
      </div>
    </div>
  );

  /* ---------------------------------------------------------------- */
  /* Live Compare Tab                                                  */
  /* ---------------------------------------------------------------- */

  const renderCompare = () => (
    <div className="space-y-6">
      <div className="bg-[#1e293b] rounded-xl p-6 border border-slate-700/50">
        <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
          <FlaskConical size={16} className="text-purple-400" />
          Live Similarity Comparison
        </h3>
        <p className="text-xs text-slate-500 mb-6">
          Test how the semantic similarity engine scores two locator attribute values.
          Try pairs like &quot;user&quot; vs &quot;username&quot;, or &quot;pwd&quot; vs &quot;password&quot;.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Failed Value</label>
            <input
              type="text"
              value={failedVal}
              onChange={(e) => setFailedVal(e.target.value)}
              placeholder='e.g. user, pwd, email'
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Candidate Value</label>
            <input
              type="text"
              value={candidateVal}
              onChange={(e) => setCandidateVal(e.target.value)}
              placeholder='e.g. username, password, emailAddress'
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
        </div>

        <button
          onClick={runCompare}
          disabled={comparing || !failedVal.trim() || !candidateVal.trim()}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          {comparing ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
          Compare
        </button>
      </div>

      {/* Results */}
      {compareResult && (
        <div className="bg-[#1e293b] rounded-xl p-6 border border-slate-700/50 space-y-5">
          {/* Overall Score */}
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div
                className="text-4xl font-bold"
                style={{
                  color: compareResult.score >= 0.7 ? '#10b981'
                    : compareResult.score >= 0.4 ? '#f59e0b'
                    : '#ef4444',
                }}
              >
                {(compareResult.score * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-slate-500 mt-1">Overall Score</div>
            </div>
            <div className="flex-1">
              <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${compareResult.score * 100}%`,
                    backgroundColor: compareResult.score >= 0.7 ? '#10b981'
                      : compareResult.score >= 0.4 ? '#f59e0b'
                      : '#ef4444',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Reasoning */}
          <div className="bg-slate-800/50 rounded-lg p-3">
            <span className="text-xs text-slate-400 block mb-1">Reasoning</span>
            <p className="text-sm text-slate-200">{compareResult.reasoning}</p>
          </div>

          {/* Breakdown */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Score Breakdown</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {([
                { key: 'stringDistance', label: 'String Distance', color: '#3b82f6' },
                { key: 'substringMatch', label: 'Substring Match', color: '#10b981' },
                { key: 'semanticMatch', label: 'Semantic Match', color: '#8b5cf6' },
                { key: 'commonPrefix', label: 'Common Prefix', color: '#f59e0b' },
                { key: 'attributeTypeBonus', label: 'Attribute Bonus', color: '#06b6d4' },
                { key: 'contextBonus', label: 'Context Bonus', color: '#ec4899' },
              ] as const).map(({ key, label, color }) => {
                const val = compareResult.breakdown[key];
                return (
                  <div key={key} className="bg-slate-800/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-400">{label}</span>
                      <span className="text-sm font-bold" style={{ color }}>{(val * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${val * 100}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Example Pairs */}
      <div className="bg-[#1e293b] rounded-xl p-5 border border-slate-700/50">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Try These Examples</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { a: 'user', b: 'username' },
            { a: 'pwd', b: 'password' },
            { a: 'email', b: 'emailAddress' },
            { a: 'fname', b: 'firstName' },
            { a: 'submit', b: 'signin' },
            { a: 'btn', b: 'button' },
          ].map(({ a, b }) => (
            <button
              key={`${a}-${b}`}
              onClick={() => { setFailedVal(a); setCandidateVal(b); setCompareResult(null); }}
              className="text-left px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors text-xs"
            >
              <span className="text-red-400 font-mono">{a}</span>
              <ArrowRight size={10} className="inline mx-1.5 text-slate-500" />
              <span className="text-emerald-400 font-mono">{b}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  /* ---------------------------------------------------------------- */
  /* Main Render                                                       */
  /* ---------------------------------------------------------------- */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10">
              <Fingerprint className="text-purple-400" size={24} />
            </div>
            Vector Similarity Engine
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Semantic similarity scoring for intelligent locator healing
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/50 p-1 rounded-xl border border-slate-700/50 w-fit">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                active
                  ? 'bg-purple-600/20 text-purple-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {loading && !stats ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="animate-spin text-slate-500" size={24} />
        </div>
      ) : (
        <>
          {tab === 'overview' && renderOverview()}
          {tab === 'matches' && renderMatches()}
          {tab === 'pairs' && renderPairs()}
          {tab === 'compare' && renderCompare()}
        </>
      )}
    </div>
  );
}
