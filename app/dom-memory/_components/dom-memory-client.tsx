'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  RefreshCw, Database, Layers, GitCompare, Code2, Eye,
  ArrowRight, Shield, Clock, BarChart3, Target,
  CheckCircle2, XCircle, AlertTriangle, TrendingUp,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip,
  ResponsiveContainer, CartesianGrid,
  BarChart, Bar, Cell, PieChart, Pie,
} from 'recharts';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface DomStats {
  totalSnapshots: number;
  totalSelectors: number;
  uniquePages: number;
  avgSelectorScore: number;
  totalLocatorChanges: number;
  uniqueHealedLocators: number;
}

interface Snapshot {
  id: number;
  script_id: number;
  page_url: string;
  elements_count: number;
  page_type: string | null;
  created_at: string;
  script_url: string | null;
  test_count: number | null;
}

interface SelectorEntry {
  selector: string;
  avg_score: number;
  usage_count: number;
  strategy: string;
  element_type: string | null;
  reasons: string[];
  first_seen: string;
  last_seen: string;
}

interface LocatorEntry {
  failed_locator: string;
  healed_locator: string;
  healing_strategy: string;
  test_name: string;
  success: boolean;
  confidence: number;
  occurrence_count: number;
  first_seen: string;
  last_seen: string;
}

interface TrendPoint {
  date: string;
  pages: number;
  elements: number;
  snapshots: number;
}

interface DistEntry {
  range: string;
  count: number;
}

type Tab = 'overview' | 'snapshots' | 'selectors' | 'locators';

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const TABS: { key: Tab; label: string; icon: typeof Database }[] = [
  { key: 'overview', label: 'Overview', icon: BarChart3 },
  { key: 'snapshots', label: 'DOM Snapshots', icon: Layers },
  { key: 'selectors', label: 'Selector Health', icon: Code2 },
  { key: 'locators', label: 'Locator Evolution', icon: GitCompare },
];

const SCORE_COLORS: Record<string, string> = {
  'Excellent (0.8-1.0)': '#10b981',
  'Good (0.6-0.8)': '#3b82f6',
  'Fair (0.4-0.6)': '#f59e0b',
  'Poor (0.2-0.4)': '#f97316',
  'Critical (0-0.2)': '#ef4444',
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

function scoreColor(score: number): string {
  if (score >= 0.8) return 'text-emerald-400';
  if (score >= 0.6) return 'text-blue-400';
  if (score >= 0.4) return 'text-amber-400';
  if (score >= 0.2) return 'text-orange-400';
  return 'text-red-400';
}

function scoreBg(score: number): string {
  if (score >= 0.8) return 'bg-emerald-500/10 border-emerald-500/20';
  if (score >= 0.6) return 'bg-blue-500/10 border-blue-500/20';
  if (score >= 0.4) return 'bg-amber-500/10 border-amber-500/20';
  if (score >= 0.2) return 'bg-orange-500/10 border-orange-500/20';
  return 'bg-red-500/10 border-red-500/20';
}

/* ------------------------------------------------------------------ */
/* Main Component                                                      */
/* ------------------------------------------------------------------ */

export function DomMemoryClient() {
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<DomStats | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [selectors, setSelectors] = useState<SelectorEntry[]>([]);
  const [locators, setLocators] = useState<LocatorEntry[]>([]);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [distribution, setDistribution] = useState<DistEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, trendRes, distRes] = await Promise.all([
        fetch('/api/dom-memory'),
        fetch('/api/dom-memory/trend?days=30'),
        fetch('/api/dom-memory/selectors/distribution'),
      ]);
      const statsData = await statsRes.json();
      const trendData = await trendRes.json();
      const distData = await distRes.json();

      if (statsData.success) setStats(statsData.data);
      if (trendData.success) setTrend(trendData.data || []);
      if (distData.success) setDistribution(distData.data || []);
    } catch (err) {
      console.error('Failed to fetch DOM memory data:', err);
    }
  }, []);

  const fetchSnapshots = useCallback(async () => {
    try {
      const res = await fetch('/api/dom-memory/snapshots?limit=50');
      const data = await res.json();
      if (data.success) setSnapshots(data.data || []);
    } catch (err) {
      console.error('Failed to fetch snapshots:', err);
    }
  }, []);

  const fetchSelectors = useCallback(async () => {
    try {
      const res = await fetch('/api/dom-memory/selectors?limit=100');
      const data = await res.json();
      if (data.success) setSelectors(data.data || []);
    } catch (err) {
      console.error('Failed to fetch selectors:', err);
    }
  }, []);

  const fetchLocators = useCallback(async () => {
    try {
      const res = await fetch('/api/dom-memory/locators?limit=50');
      const data = await res.json();
      if (data.success) setLocators(data.data || []);
    } catch (err) {
      console.error('Failed to fetch locators:', err);
    }
  }, []);

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  useEffect(() => {
    if (tab === 'snapshots' && snapshots.length === 0) fetchSnapshots();
    if (tab === 'selectors' && selectors.length === 0) fetchSelectors();
    if (tab === 'locators' && locators.length === 0) fetchLocators();
  }, [tab, snapshots.length, selectors.length, locators.length, fetchSnapshots, fetchSelectors, fetchLocators]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-slate-400">
          <RefreshCw size={20} className="animate-spin" />
          <span>Loading DOM memory data...</span>
        </div>
      </div>
    );
  }

  const isEmpty = !stats || (stats.totalSnapshots === 0 && stats.totalSelectors === 0 && stats.totalLocatorChanges === 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-display flex items-center gap-2">
            <Database className="text-purple-400" size={24} />
            DOM Memory
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Track DOM structure changes, selector stability, and locator evolution across your test suite.
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

      {isEmpty ? (
        <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-12 text-center">
          <Database size={40} className="text-purple-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-white mb-2">No DOM Data Captured Yet</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            DOM snapshots and selector scores are captured automatically when you generate test scripts
            or run healing jobs. Start by generating scripts to build your DOM memory.
          </p>
        </div>
      ) : (
        <>
          {/* Tab Navigation */}
          <div className="flex items-center gap-1 bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-1">
            {TABS.map((t) => {
              const Icon = t.icon;
              const isActive = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Icon size={13} />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          {tab === 'overview' && stats && (
            <OverviewTab stats={stats} trend={trend} distribution={distribution} />
          )}
          {tab === 'snapshots' && <SnapshotsTab snapshots={snapshots} />}
          {tab === 'selectors' && <SelectorsTab selectors={selectors} />}
          {tab === 'locators' && <LocatorsTab locators={locators} />}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Overview Tab                                                        */
/* ------------------------------------------------------------------ */

function OverviewTab({ stats, trend, distribution }: { stats: DomStats; trend: TrendPoint[]; distribution: DistEntry[] }) {
  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard label="DOM Snapshots" value={stats.totalSnapshots} icon={Layers} color="text-purple-400" bgColor="bg-purple-500/10" />
        <MetricCard label="Tracked Selectors" value={stats.totalSelectors} icon={Code2} color="text-blue-400" bgColor="bg-blue-500/10" />
        <MetricCard label="Unique Pages" value={stats.uniquePages} icon={Eye} color="text-cyan-400" bgColor="bg-cyan-500/10" />
        <MetricCard
          label="Avg Selector Score"
          value={stats.avgSelectorScore.toFixed(2)}
          icon={Target}
          color={scoreColor(stats.avgSelectorScore)}
          bgColor={stats.avgSelectorScore >= 0.6 ? 'bg-emerald-500/10' : 'bg-amber-500/10'}
        />
        <MetricCard label="Locator Changes" value={stats.totalLocatorChanges} icon={GitCompare} color="text-amber-400" bgColor="bg-amber-500/10" />
        <MetricCard label="Unique Healed Locators" value={stats.uniqueHealedLocators} icon={Shield} color="text-emerald-400" bgColor="bg-emerald-500/10" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Element Trend */}
        <div className="lg:col-span-2 bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp size={14} className="text-purple-400" />
            DOM Activity (30 days)
          </h3>
          {trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="elemGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="snapGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#475569" fontSize={10}
                  tickFormatter={(v) => new Date(v).toLocaleDateString('en', { month: 'short', day: 'numeric' })} />
                <YAxis stroke="#475569" fontSize={10} allowDecimals={false} />
                <RechartsTooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: 12 }}
                  labelFormatter={(v) => new Date(v).toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' })}
                />
                <Area type="monotone" dataKey="elements" name="Elements" stroke="#a855f7" fill="url(#elemGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="snapshots" name="Snapshots" stroke="#3b82f6" fill="url(#snapGrad)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-slate-600 text-center py-10">No trend data available yet.</p>
          )}
        </div>

        {/* Selector Score Distribution */}
        <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 size={14} className="text-blue-400" />
            Selector Quality
          </h3>
          {distribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={distribution}
                  dataKey="count"
                  nameKey="range"
                  cx="50%" cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={2}
                  stroke="#0f172a"
                  strokeWidth={2}
                >
                  {distribution.map((entry, i) => (
                    <Cell key={i} fill={SCORE_COLORS[entry.range] || '#64748b'} />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-slate-600 text-center py-10">No selector data yet.</p>
          )}
          {/* Legend */}
          <div className="flex flex-wrap gap-2 mt-2 justify-center">
            {distribution.map((d) => (
              <span key={d.range} className="flex items-center gap-1 text-[9px] text-slate-500">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: SCORE_COLORS[d.range] || '#64748b' }} />
                {d.range.split('(')[0].trim()}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Snapshots Tab                                                       */
/* ------------------------------------------------------------------ */

function SnapshotsTab({ snapshots }: { snapshots: Snapshot[] }) {
  if (snapshots.length === 0) {
    return (
      <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-10 text-center">
        <Layers size={28} className="text-slate-600 mx-auto mb-3" />
        <p className="text-sm text-slate-400">No DOM snapshots captured yet.</p>
        <p className="text-xs text-slate-600 mt-1">Generate test scripts to start capturing DOM snapshots.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[#2a3040]">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Layers size={14} className="text-purple-400" />
          DOM Snapshots
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
            {snapshots.length}
          </span>
        </h3>
      </div>
      <div className="divide-y divide-[#2a3040]">
        {snapshots.map((snap) => (
          <div key={snap.id} className="px-5 py-3 hover:bg-[#0c1222]/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-white truncate max-w-sm" title={snap.page_url}>
                    {snap.page_url}
                  </span>
                  {snap.page_type && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      {snap.page_type}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Code2 size={8} />
                    {snap.elements_count} elements
                  </span>
                  {snap.script_url && (
                    <span className="truncate max-w-xs">
                      Script: {snap.script_url}
                    </span>
                  )}
                  {snap.test_count != null && (
                    <span>{snap.test_count} tests</span>
                  )}
                </div>
              </div>
              <span className="text-[10px] text-slate-600 flex items-center gap-1 shrink-0">
                <Clock size={9} />
                {timeAgo(snap.created_at)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Selectors Tab                                                       */
/* ------------------------------------------------------------------ */

function SelectorsTab({ selectors }: { selectors: SelectorEntry[] }) {
  if (selectors.length === 0) {
    return (
      <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-10 text-center">
        <Code2 size={28} className="text-slate-600 mx-auto mb-3" />
        <p className="text-sm text-slate-400">No selector scores recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[#2a3040]">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Code2 size={14} className="text-blue-400" />
          Selector Health
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
            {selectors.length}
          </span>
        </h3>
        <p className="text-[10px] text-slate-600 mt-1">Sorted by score (worst first) — low-scoring selectors are fragile and likely to break.</p>
      </div>
      <div className="divide-y divide-[#2a3040]">
        {selectors.map((sel, i) => (
          <div key={i} className="px-5 py-3 hover:bg-[#0c1222]/30 transition-colors">
            <div className="flex items-center gap-4">
              {/* Score badge */}
              <div className={`w-12 h-10 rounded-lg border flex items-center justify-center shrink-0 ${scoreBg(parseFloat(String(sel.avg_score)))}`}>
                <span className={`text-sm font-bold ${scoreColor(parseFloat(String(sel.avg_score)))}`}>
                  {parseFloat(String(sel.avg_score)).toFixed(1)}
                </span>
              </div>

              {/* Selector info */}
              <div className="flex-1 min-w-0">
                <code className="text-xs text-slate-300 font-mono block truncate" title={sel.selector}>
                  {sel.selector}
                </code>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500">
                  {sel.strategy && <span className="text-purple-400/70">{sel.strategy}</span>}
                  {sel.element_type && <span>{sel.element_type}</span>}
                  <span>{sel.usage_count}x used</span>
                </div>
              </div>

              {/* Reasons */}
              <div className="hidden md:flex items-center gap-1 shrink-0">
                {sel.reasons.slice(0, 2).map((r, j) => (
                  <span key={j} className="text-[9px] px-1.5 py-0.5 rounded bg-[#0c1222] text-slate-500 border border-[#2a3040] max-w-[120px] truncate">
                    {r}
                  </span>
                ))}
              </div>

              {/* Last seen */}
              <span className="text-[10px] text-slate-600 flex items-center gap-1 shrink-0">
                <Clock size={9} />
                {timeAgo(sel.last_seen)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Locators Tab                                                        */
/* ------------------------------------------------------------------ */

function LocatorsTab({ locators }: { locators: LocatorEntry[] }) {
  if (locators.length === 0) {
    return (
      <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-10 text-center">
        <GitCompare size={28} className="text-slate-600 mx-auto mb-3" />
        <p className="text-sm text-slate-400">No locator evolution data yet.</p>
        <p className="text-xs text-slate-600 mt-1">Locator changes are recorded when the healing engine fixes broken selectors.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[#2a3040]">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <GitCompare size={14} className="text-amber-400" />
          Locator Evolution
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            {locators.length}
          </span>
        </h3>
        <p className="text-[10px] text-slate-600 mt-1">History of broken selectors healed by the AI engine — showing how locators evolved.</p>
      </div>
      <div className="divide-y divide-[#2a3040]">
        {locators.map((loc, i) => (
          <div key={i} className="px-5 py-4 hover:bg-[#0c1222]/30 transition-colors">
            <div className="flex items-start gap-3">
              {/* Success indicator */}
              <div className="mt-1 shrink-0">
                {loc.success ? (
                  <CheckCircle2 size={14} className="text-emerald-400" />
                ) : (
                  <XCircle size={14} className="text-red-400" />
                )}
              </div>

              {/* Locator change */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-xs font-medium text-white">{loc.test_name}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    {loc.healing_strategy}
                  </span>
                  <span className="text-[9px] text-slate-600">
                    {loc.occurrence_count}x
                  </span>
                  <span className="text-[9px] text-slate-600 flex items-center gap-0.5">
                    <Target size={7} />
                    {Math.round(loc.confidence * 100)}%
                  </span>
                </div>

                {/* Failed → Healed */}
                <div className="flex items-center gap-2 mt-1.5">
                  <code className="text-[10px] text-red-400/80 font-mono bg-red-500/5 px-2 py-1 rounded border border-red-500/10 truncate max-w-xs" title={loc.failed_locator}>
                    {loc.failed_locator}
                  </code>
                  <ArrowRight size={10} className="text-slate-600 shrink-0" />
                  <code className="text-[10px] text-emerald-400/80 font-mono bg-emerald-500/5 px-2 py-1 rounded border border-emerald-500/10 truncate max-w-xs" title={loc.healed_locator}>
                    {loc.healed_locator}
                  </code>
                </div>
              </div>

              {/* Timestamp */}
              <span className="text-[10px] text-slate-600 flex items-center gap-1 shrink-0">
                <Clock size={9} />
                {timeAgo(loc.last_seen)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Metric Card                                                         */
/* ------------------------------------------------------------------ */

function MetricCard({
  label, value, icon: Icon, color, bgColor,
}: {
  label: string;
  value: string | number;
  icon: any;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-500 font-medium">{label}</span>
        <div className={`w-8 h-8 rounded-lg ${bgColor} flex items-center justify-center`}>
          <Icon size={14} className={color} />
        </div>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
