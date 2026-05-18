'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  RefreshCw, XCircle, AlertTriangle, CheckCircle2,
  Search, Brain, Shield, Layers, Bug, Activity,
  Cpu, Globe, FlaskConical, HelpCircle, Lightbulb,
  TrendingUp, TrendingDown, Minus, Clock,
  ChevronDown, ChevronUp, Info,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip,
  ResponsiveContainer, CartesianGrid,
  BarChart, Bar, Cell,
  PieChart, Pie,
} from 'recharts';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface ClassificationBreakdown {
  classification: string;
  count: number;
  percentage: number;
  domain: string;
  avgConfidence: number;
  avgSeverityScore: number;
  healingRate: number;
}

interface DomainSummary {
  domain: string;
  count: number;
  percentage: number;
  classifications: string[];
  topAffectedComponent: string;
  avgConfidence: number;
  trend: 'improving' | 'stable' | 'degrading';
}

interface ComponentHeatmapEntry {
  component: string;
  total: number;
  app_bug: number;
  infra_issue: number;
  flaky_test: number;
  env_config: number;
  data_issue: number;
  selector_drift: number;
  dominantClassification: string;
  severityScore: number;
}

interface TrendPoint {
  date: string;
  app_bug: number;
  infra_issue: number;
  flaky_test: number;
  env_config: number;
  data_issue: number;
  selector_drift: number;
  unknown: number;
}

interface EnvironmentInsight {
  type: 'warning' | 'info' | 'success';
  title: string;
  description: string;
  classification: string;
  metric: string;
}

interface IntelligenceReport {
  summary: {
    totalAnalyses: number;
    applicationFailures: number;
    environmentFailures: number;
    testQualityIssues: number;
    unknownFailures: number;
    environmentFailureRate: number;
    avgConfidence: number;
    dominantDomain: string;
  };
  classificationBreakdown: ClassificationBreakdown[];
  domainSummaries: DomainSummary[];
  componentHeatmap: ComponentHeatmapEntry[];
  classificationTrend: TrendPoint[];
  insights: EnvironmentInsight[];
  generatedAt: string;
  windowDays: number;
}

interface RecentRCA {
  id: number;
  test_name: string;
  classification: string;
  severity: string;
  confidence: number;
  root_cause: string;
  suggested_fix: string;
  affected_component: string;
  is_flaky: boolean;
  healing_attempted: boolean;
  healing_succeeded: boolean;
  healing_strategy: string | null;
  summary: string;
  created_at: string;
}

const PERIOD_OPTIONS = [
  { label: '7d', value: 7 },
  { label: '14d', value: 14 },
  { label: '30d', value: 30 },
  { label: '90d', value: 90 },
];

/* ------------------------------------------------------------------ */
/* Classification styling                                              */
/* ------------------------------------------------------------------ */

const CLASSIFICATION_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  app_bug:        { label: 'App Bug',        color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/30',     icon: Bug },
  selector_drift: { label: 'Selector Drift', color: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/30',  icon: Search },
  infra_issue:    { label: 'Infra Issue',    color: 'text-purple-400',  bg: 'bg-purple-500/10',  border: 'border-purple-500/30',  icon: Cpu },
  env_config:     { label: 'Env Config',     color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/30',    icon: Globe },
  data_issue:     { label: 'Data Issue',     color: 'text-cyan-400',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/30',    icon: Layers },
  flaky_test:     { label: 'Flaky Test',     color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   icon: FlaskConical },
  unknown:        { label: 'Unknown',        color: 'text-slate-400',   bg: 'bg-slate-500/10',   border: 'border-slate-500/30',   icon: HelpCircle },
};

const DOMAIN_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  application:   { label: 'Application',    color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30',    icon: Bug },
  environment:   { label: 'Environment',    color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', icon: Globe },
  test_quality:  { label: 'Test Quality',   color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/30',  icon: FlaskConical },
  unknown:       { label: 'Unknown',        color: 'text-slate-400',  bg: 'bg-slate-500/10',  border: 'border-slate-500/30',  icon: HelpCircle },
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'text-red-400',
  high: 'text-orange-400',
  medium: 'text-amber-400',
  low: 'text-emerald-400',
};

const CHART_COLORS: Record<string, string> = {
  app_bug: '#ef4444',
  selector_drift: '#f97316',
  infra_issue: '#a855f7',
  env_config: '#3b82f6',
  data_issue: '#06b6d4',
  flaky_test: '#f59e0b',
  unknown: '#64748b',
};

/* ------------------------------------------------------------------ */
/* Tabs                                                                */
/* ------------------------------------------------------------------ */

type TabId = 'overview' | 'classifications' | 'heatmap' | 'recent';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'classifications', label: 'Classifications', icon: Brain },
  { id: 'heatmap', label: 'Component Map', icon: Layers },
  { id: 'recent', label: 'Recent Analyses', icon: Clock },
];

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function RCAIntelligenceClient() {
  const [report, setReport] = useState<IntelligenceReport | null>(null);
  const [recentRCAs, setRecentRCAs] = useState<RecentRCA[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [expandedRCA, setExpandedRCA] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [reportRes, recentRes] = await Promise.all([
        fetch(`/api/rca-intelligence?days=${days}`),
        fetch(`/api/rca-intelligence/recent?limit=30`),
      ]);
      if (!reportRes.ok) throw new Error(`Report: HTTP ${reportRes.status}`);
      const reportData = await reportRes.json();
      setReport(reportData);

      if (recentRes.ok) {
        const rd = await recentRes.json();
        setRecentRCAs(rd.data || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load RCA intelligence');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ---------------------------------------------------------------- */
  /* Loading / Error states                                            */
  /* ---------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-8 w-8 text-purple-400 animate-spin" />
          <p className="text-slate-400 text-sm">Analyzing failure intelligence…</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 max-w-md text-center">
          <XCircle className="h-8 w-8 text-red-400 mx-auto mb-3" />
          <p className="text-red-300 font-medium mb-2">Failed to Load Intelligence Report</p>
          <p className="text-slate-400 text-sm mb-4">{error}</p>
          <button onClick={fetchData} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors">Retry</button>
        </div>
      </div>
    );
  }

  const s = report.summary;

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Brain className="h-7 w-7 text-purple-400" />
            RCA Intelligence
          </h1>
          <p className="text-slate-400 text-sm mt-1">Enhanced Root Cause Analysis with Environment Intelligence</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-800/50 rounded-lg border border-slate-700/50 p-0.5">
            {PERIOD_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setDays(opt.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  days === opt.value ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button onClick={fetchData} className="p-2 bg-slate-800/50 rounded-lg border border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600 transition-all">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Domain Summary Hero Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(['application', 'environment', 'test_quality', 'unknown'] as const).map(domain => {
          const dc = DOMAIN_CONFIG[domain];
          const DIcon = dc.icon;
          const ds = report.domainSummaries.find(d => d.domain === domain);
          const count = ds?.count || 0;
          const pct = ds?.percentage || 0;
          return (
            <div key={domain} className={`${dc.bg} border ${dc.border} rounded-xl p-4`}>
              <div className="flex items-center gap-2 mb-2">
                <DIcon className={`h-4 w-4 ${dc.color}`} />
                <span className="text-xs font-medium text-slate-300">{dc.label}</span>
              </div>
              <p className={`text-2xl font-bold ${dc.color}`}>{count}</p>
              <p className="text-xs text-slate-500">{pct}% of failures</p>
            </div>
          );
        })}
      </div>

      {/* Insights */}
      {report.insights.length > 0 && (
        <div className="space-y-2">
          {report.insights.map((insight, idx) => {
            const insightConfig = {
              warning: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: AlertTriangle, color: 'text-amber-400' },
              info: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: Info, color: 'text-blue-400' },
              success: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: CheckCircle2, color: 'text-emerald-400' },
            }[insight.type];
            const IIcon = insightConfig.icon;
            return (
              <div key={idx} className={`${insightConfig.bg} border ${insightConfig.border} rounded-lg p-3 flex items-start gap-3`}>
                <IIcon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${insightConfig.color}`} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${insightConfig.color}`}>{insight.title}</span>
                    <span className="text-xs text-slate-500 bg-slate-800/50 px-1.5 py-0.5 rounded">{insight.metric}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{insight.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-800/30 rounded-lg border border-slate-700/50 p-1">
        {TABS.map(tab => {
          const TIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-all ${
                activeTab === tab.id ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
              }`}
            >
              <TIcon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab report={report} />}
      {activeTab === 'classifications' && <ClassificationsTab report={report} />}
      {activeTab === 'heatmap' && <HeatmapTab report={report} />}
      {activeTab === 'recent' && <RecentTab rcas={recentRCAs} expandedRCA={expandedRCA} setExpandedRCA={setExpandedRCA} />}
    </div>
  );
}

/* ================================================================== */
/*  Overview Tab                                                       */
/* ================================================================== */

function OverviewTab({ report }: { report: IntelligenceReport }) {
  const s = report.summary;

  // Domain pie data
  const pieData = report.domainSummaries
    .filter(d => d.count > 0)
    .map(d => ({
      name: DOMAIN_CONFIG[d.domain]?.label || d.domain,
      value: d.count,
      fill: d.domain === 'application' ? '#ef4444' : d.domain === 'environment' ? '#a855f7' : d.domain === 'test_quality' ? '#f59e0b' : '#64748b',
    }));

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Total Analyses" value={s.totalAnalyses} color="text-white" />
        <MetricCard label="Env Failure Rate" value={`${s.environmentFailureRate}%`} color={s.environmentFailureRate > 30 ? 'text-red-400' : s.environmentFailureRate > 15 ? 'text-amber-400' : 'text-emerald-400'} />
        <MetricCard label="Avg Confidence" value={`${(s.avgConfidence * 100).toFixed(0)}%`} color={s.avgConfidence >= 0.7 ? 'text-emerald-400' : 'text-amber-400'} />
        <MetricCard label="Dominant Domain" value={DOMAIN_CONFIG[s.dominantDomain]?.label || s.dominantDomain} color={DOMAIN_CONFIG[s.dominantDomain]?.color || 'text-slate-300'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Domain Distribution Pie */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Failure Domain Distribution</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} stroke="none">
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <RechartsTooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-500 text-sm text-center py-8">No data available</p>
          )}
          <div className="flex justify-center gap-4 mt-2">
            {pieData.map(d => (
              <div key={d.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
                <span className="text-xs text-slate-400">{d.name} ({d.value})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Domain Trend Cards */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Domain Trends</h3>
          <div className="space-y-3">
            {report.domainSummaries.filter(d => d.count > 0).map(ds => {
              const dc = DOMAIN_CONFIG[ds.domain] || DOMAIN_CONFIG.unknown;
              const DIcon = dc.icon;
              const TrendIcon = ds.trend === 'improving' ? TrendingDown : ds.trend === 'degrading' ? TrendingUp : Minus;
              const trendColor = ds.trend === 'improving' ? 'text-emerald-400' : ds.trend === 'degrading' ? 'text-red-400' : 'text-slate-400';
              return (
                <div key={ds.domain} className={`${dc.bg} border ${dc.border} rounded-lg p-3 flex items-center justify-between`}>
                  <div className="flex items-center gap-3">
                    <DIcon className={`h-5 w-5 ${dc.color}`} />
                    <div>
                      <p className="text-sm font-medium text-white">{dc.label}</p>
                      <p className="text-xs text-slate-400">{ds.count} failures • {ds.percentage}%</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Top: {ds.topAffectedComponent}</span>
                    <TrendIcon className={`h-4 w-4 ${trendColor}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Classification Trend Chart */}
      {report.classificationTrend.length > 0 && (
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Classification Trend ({report.windowDays}d)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={report.classificationTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <RechartsTooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }} />
              {Object.entries(CHART_COLORS).map(([key, color]) => (
                <Area key={key} type="monotone" dataKey={key} stackId="1" stroke={color} fill={color} fillOpacity={0.3} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-3 mt-3">
            {Object.entries(CHART_COLORS).map(([key, color]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-xs text-slate-400">{CLASSIFICATION_CONFIG[key]?.label || key}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Classifications Tab                                                */
/* ================================================================== */

function ClassificationsTab({ report }: { report: IntelligenceReport }) {
  const breakdown = report.classificationBreakdown;

  // Bar chart data
  const barData = breakdown.map(b => ({
    name: CLASSIFICATION_CONFIG[b.classification]?.label || b.classification,
    count: b.count,
    fill: CHART_COLORS[b.classification] || '#64748b',
  }));

  return (
    <div className="space-y-6">
      {/* Classification bar chart */}
      {barData.length > 0 && (
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Classification Distribution</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={barData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={110} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <RechartsTooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Detailed classification cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {breakdown.map(b => {
          const cc = CLASSIFICATION_CONFIG[b.classification] || CLASSIFICATION_CONFIG.unknown;
          const CIcon = cc.icon;
          return (
            <div key={b.classification} className={`${cc.bg} border ${cc.border} rounded-xl p-4`}>
              <div className="flex items-center gap-2 mb-3">
                <CIcon className={`h-5 w-5 ${cc.color}`} />
                <span className="text-sm font-medium text-white">{cc.label}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${cc.bg} ${cc.color} font-semibold border ${cc.border} ml-auto`}>
                  {b.count}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500">Percentage</span>
                  <p className="text-slate-300 font-medium">{b.percentage}%</p>
                </div>
                <div>
                  <span className="text-slate-500">Domain</span>
                  <p className="text-slate-300 font-medium capitalize">{b.domain.replace('_', ' ')}</p>
                </div>
                <div>
                  <span className="text-slate-500">Avg Confidence</span>
                  <p className={`font-medium ${b.avgConfidence >= 0.7 ? 'text-emerald-400' : b.avgConfidence >= 0.5 ? 'text-amber-400' : 'text-red-400'}`}>
                    {(b.avgConfidence * 100).toFixed(0)}%
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Healing Rate</span>
                  <p className={`font-medium ${b.healingRate >= 70 ? 'text-emerald-400' : b.healingRate >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                    {b.healingRate}%
                  </p>
                </div>
              </div>
              {/* Severity bar */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-500">Avg Severity</span>
                  <span className="text-slate-400">{b.avgSeverityScore.toFixed(1)}/4</span>
                </div>
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(b.avgSeverityScore / 4) * 100}%`,
                      backgroundColor: b.avgSeverityScore >= 3 ? '#ef4444' : b.avgSeverityScore >= 2 ? '#f59e0b' : '#10b981',
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Heatmap Tab                                                        */
/* ================================================================== */

function HeatmapTab({ report }: { report: IntelligenceReport }) {
  const heatmap = report.componentHeatmap;
  const classKeys = ['app_bug', 'infra_issue', 'flaky_test', 'env_config', 'data_issue', 'selector_drift'] as const;

  if (heatmap.length === 0) {
    return (
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-8 text-center">
        <Layers className="h-8 w-8 text-slate-500 mx-auto mb-3" />
        <p className="text-slate-400 text-sm">No component data available for this period</p>
      </div>
    );
  }

  const maxCount = Math.max(...heatmap.flatMap(h => classKeys.map(k => h[k])), 1);

  return (
    <div className="space-y-4">
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5 overflow-x-auto">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Component × Classification Heatmap</h3>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-700/50">
              <th className="text-left py-2 pr-4 text-slate-400 font-medium w-40">Component</th>
              {classKeys.map(k => (
                <th key={k} className="text-center py-2 px-2 text-slate-400 font-medium">
                  {CLASSIFICATION_CONFIG[k]?.label || k}
                </th>
              ))}
              <th className="text-center py-2 px-2 text-slate-400 font-medium">Total</th>
              <th className="text-center py-2 px-2 text-slate-400 font-medium">Severity</th>
            </tr>
          </thead>
          <tbody>
            {heatmap.map(entry => (
              <tr key={entry.component} className="border-b border-slate-700/20 hover:bg-slate-800/30">
                <td className="py-2.5 pr-4 text-slate-300 font-medium truncate max-w-[160px]" title={entry.component}>
                  {entry.component}
                </td>
                {classKeys.map(k => {
                  const val = entry[k];
                  const intensity = val > 0 ? Math.max(0.15, val / maxCount) : 0;
                  const color = CHART_COLORS[k] || '#64748b';
                  return (
                    <td key={k} className="text-center py-2.5 px-2">
                      {val > 0 ? (
                        <span
                          className="inline-block w-8 h-6 rounded text-white text-xs font-medium leading-6"
                          style={{ backgroundColor: color, opacity: intensity + 0.3 }}
                        >
                          {val}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                  );
                })}
                <td className="text-center py-2.5 px-2">
                  <span className="text-white font-semibold">{entry.total}</span>
                </td>
                <td className="text-center py-2.5 px-2">
                  <span className={`font-medium ${
                    entry.severityScore >= 3 ? 'text-red-400' : entry.severityScore >= 2 ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {entry.severityScore.toFixed(1)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Top component bar chart */}
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Top Components by Failure Count</h3>
        <ResponsiveContainer width="100%" height={Math.max(180, heatmap.length * 36)}>
          <BarChart data={heatmap.slice(0, 10)} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} />
            <YAxis type="category" dataKey="component" width={140} tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <RechartsTooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }} />
            {classKeys.map(k => (
              <Bar key={k} dataKey={k} stackId="a" fill={CHART_COLORS[k] || '#64748b'} />
            ))}
          </BarChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap justify-center gap-3 mt-3">
          {classKeys.map(k => (
            <div key={k} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[k] }} />
              <span className="text-xs text-slate-400">{CLASSIFICATION_CONFIG[k]?.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Recent Analyses Tab                                                */
/* ================================================================== */

function RecentTab({ rcas, expandedRCA, setExpandedRCA }: { rcas: RecentRCA[]; expandedRCA: number | null; setExpandedRCA: (id: number | null) => void }) {
  if (rcas.length === 0) {
    return (
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-8 text-center">
        <Clock className="h-8 w-8 text-slate-500 mx-auto mb-3" />
        <p className="text-slate-400 text-sm">No recent analyses found</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rcas.map(rca => {
        const cc = CLASSIFICATION_CONFIG[rca.classification] || CLASSIFICATION_CONFIG.unknown;
        const CIcon = cc.icon;
        const expanded = expandedRCA === rca.id;

        return (
          <div key={rca.id} className={`border ${cc.border} rounded-xl overflow-hidden transition-all`}>
            <button
              onClick={() => setExpandedRCA(expanded ? null : rca.id)}
              className={`w-full flex items-center justify-between p-3 ${cc.bg} hover:brightness-110 transition-all`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <CIcon className={`h-4 w-4 flex-shrink-0 ${cc.color}`} />
                <span className="text-sm text-white truncate">{rca.test_name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${cc.bg} ${cc.color} font-semibold border ${cc.border} flex-shrink-0`}>
                  {cc.label}
                </span>
                <span className={`text-xs font-medium flex-shrink-0 ${SEVERITY_COLORS[rca.severity] || 'text-slate-400'}`}>
                  {rca.severity}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-slate-500">{new Date(rca.created_at).toLocaleDateString()}</span>
                {expanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
              </div>
            </button>

            {expanded && (
              <div className="bg-slate-900/40 p-4 space-y-3 text-sm">
                <div>
                  <span className="text-slate-500 text-xs font-medium">Root Cause</span>
                  <p className="text-slate-300 mt-0.5">{rca.root_cause}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-xs font-medium">Suggested Fix</span>
                  <p className="text-slate-300 mt-0.5">{rca.suggested_fix}</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <span className="text-slate-500 text-xs">Component</span>
                    <p className="text-slate-300 text-xs font-medium">{rca.affected_component}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs">Confidence</span>
                    <p className={`text-xs font-medium ${rca.confidence >= 0.7 ? 'text-emerald-400' : rca.confidence >= 0.5 ? 'text-amber-400' : 'text-red-400'}`}>
                      {(rca.confidence * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs">Healing</span>
                    <p className="text-xs font-medium">
                      {rca.healing_attempted
                        ? rca.healing_succeeded
                          ? <span className="text-emerald-400">Healed ({rca.healing_strategy})</span>
                          : <span className="text-red-400">Failed</span>
                        : <span className="text-slate-400">Not attempted</span>}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs">Flaky</span>
                    <p className={`text-xs font-medium ${rca.is_flaky ? 'text-amber-400' : 'text-slate-400'}`}>
                      {rca.is_flaky ? 'Yes' : 'No'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ================================================================== */
/*  Helper Components                                                  */
/* ================================================================== */

function MetricCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
