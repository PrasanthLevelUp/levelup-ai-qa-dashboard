'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  RefreshCw, XCircle, DollarSign, Clock, TrendingUp,
  Zap, GitPullRequest, Brain, Bug, BarChart3,
  ArrowUpRight, ArrowDownRight, Percent, Calculator,
  Shield, Award, Target, Layers,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip,
  ResponsiveContainer, CartesianGrid,
  BarChart, Bar, Cell, PieChart, Pie,
  ComposedChart, Line,
} from 'recharts';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface ROIMetrics {
  totalHoursSaved: number;
  healingHoursSaved: number;
  flakyInvestigationHoursSaved: number;
  prAutomationHoursSaved: number;
  patternReuseHoursSaved: number;
  totalCostSaved: number;
  laborCostSaved: number;
  tokenCostActual: number;
  tokenCostTheoretical: number;
  tokenCostSaved: number;
  netROI: number;
  roiPercentage: number;
  avgCostPerHeal: number;
  manualCostPerFix: number;
  costReductionPercent: number;
  healingsPerDay: number;
  totalHealings: number;
  successfulHealings: number;
  failedHealings: number;
  successRate: number;
  prsGenerated: number;
  prsMerged: number;
  patternsLearned: number;
  patternReuses: number;
  flakyTestsDetected: number;
  strategyBreakdown: {
    rule_based: number;
    database_pattern: number;
    ai_reasoning: number;
    other: number;
  };
  zeroTokenHealings: number;
  zeroTokenPercent: number;
  monthlyMaintenanceSaved: number;
  yearlyMaintenanceSaved: number;
  maintenanceReductionPercent: number;
}

interface ROITrendPoint {
  date: string;
  healings: number;
  hoursSaved: number;
  costSaved: number;
  tokenCost: number;
}

interface ROICategoryBreakdown {
  category: string;
  hoursSaved: number;
  costSaved: number;
  count: number;
}

interface ROIReport {
  metrics: ROIMetrics;
  trend: ROITrendPoint[];
  categoryBreakdown: ROICategoryBreakdown[];
  generatedAt: string;
  windowDays: number;
}

const PERIOD_OPTIONS = [
  { label: '7d', value: 7 },
  { label: '14d', value: 14 },
  { label: '30d', value: 30 },
  { label: '90d', value: 90 },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatCurrency(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toFixed(2)}`;
}

function formatHours(n: number): string {
  if (n >= 100) return `${Math.round(n)}h`;
  return `${n.toFixed(1)}h`;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function ROIClient() {
  const [report, setReport] = useState<ROIReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/roi?days=${days}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load ROI report');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-8 w-8 text-emerald-400 animate-spin" />
          <p className="text-slate-400 text-sm">Calculating ROI metrics…</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 max-w-md text-center">
          <XCircle className="h-8 w-8 text-red-400 mx-auto mb-3" />
          <p className="text-red-300 font-medium mb-2">Failed to Load ROI Data</p>
          <p className="text-slate-400 text-sm mb-4">{error}</p>
          <button onClick={fetchReport} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors">Retry</button>
        </div>
      </div>
    );
  }

  const m = report.metrics;

  // Strategy pie data
  const strategyPie = [
    { name: 'Rule-Based', value: m.strategyBreakdown.rule_based, fill: '#10b981' },
    { name: 'Pattern', value: m.strategyBreakdown.database_pattern, fill: '#3b82f6' },
    { name: 'AI', value: m.strategyBreakdown.ai_reasoning, fill: '#f59e0b' },
    ...(m.strategyBreakdown.other > 0 ? [{ name: 'Other', value: m.strategyBreakdown.other, fill: '#64748b' }] : []),
  ].filter(d => d.value > 0);

  // Category bar data
  const catBarData = report.categoryBreakdown
    .filter(c => c.costSaved > 0 || c.hoursSaved > 0)
    .map(c => ({ ...c, fill: c.category === 'Auto-Healing' ? '#10b981' : c.category === 'Flaky Investigation' ? '#f59e0b' : c.category === 'PR Automation' ? '#3b82f6' : '#a855f7' }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <DollarSign className="h-7 w-7 text-emerald-400" />
            ROI Dashboard
          </h1>
          <p className="text-slate-400 text-sm mt-1">Return on Investment & Maintenance Cost Savings</p>
        </div>
        <div className="flex items-center gap-3">
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
          <button onClick={fetchReport} className="p-2 bg-slate-800/50 rounded-lg border border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600 transition-all">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Hero ROI Banner */}
      <div className="relative bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/30 rounded-2xl p-6 shadow-xl shadow-emerald-500/10 overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 opacity-5">
          <TrendingUp className="w-full h-full" />
        </div>
        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-emerald-300/70 font-medium mb-1">Total Savings</p>
            <p className="text-3xl font-bold text-emerald-400">{formatCurrency(m.totalCostSaved)}</p>
            <p className="text-xs text-slate-400 mt-1">{report.windowDays}-day window</p>
          </div>
          <div>
            <p className="text-xs text-emerald-300/70 font-medium mb-1">Hours Saved</p>
            <p className="text-3xl font-bold text-white">{formatHours(m.totalHoursSaved)}</p>
            <p className="text-xs text-slate-400 mt-1">Engineering time reclaimed</p>
          </div>
          <div>
            <p className="text-xs text-emerald-300/70 font-medium mb-1">ROI</p>
            <p className="text-3xl font-bold text-emerald-400">{m.roiPercentage > 9999 ? '∞' : `${m.roiPercentage}%`}</p>
            <p className="text-xs text-slate-400 mt-1">Return on AI investment</p>
          </div>
          <div>
            <p className="text-xs text-emerald-300/70 font-medium mb-1">Cost Reduction</p>
            <p className="text-3xl font-bold text-white">{m.costReductionPercent}%</p>
            <p className="text-xs text-slate-400 mt-1">vs manual maintenance</p>
          </div>
        </div>
      </div>

      {/* Maintenance Projection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calculator className="h-4 w-4 text-blue-400" />
            <span className="text-xs text-slate-400 font-medium">Monthly Projection</span>
          </div>
          <p className="text-xl font-bold text-blue-400">{formatCurrency(m.monthlyMaintenanceSaved)}</p>
          <p className="text-xs text-slate-500 mt-1">saved per month</p>
        </div>
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Award className="h-4 w-4 text-purple-400" />
            <span className="text-xs text-slate-400 font-medium">Yearly Projection</span>
          </div>
          <p className="text-xl font-bold text-purple-400">{formatCurrency(m.yearlyMaintenanceSaved)}</p>
          <p className="text-xs text-slate-500 mt-1">saved per year</p>
        </div>
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-amber-400" />
            <span className="text-xs text-slate-400 font-medium">Avg Cost per Heal</span>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-xl font-bold text-emerald-400">${m.avgCostPerHeal.toFixed(4)}</p>
            <span className="text-xs text-slate-500">vs {formatCurrency(m.manualCostPerFix)} manual</span>
          </div>
        </div>
      </div>

      {/* Savings Trend Chart + Strategy Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend chart */}
        <div className="lg:col-span-2 bg-slate-800/30 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Savings Trend ({report.windowDays}d)</h3>
          {report.trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={report.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={d => d.slice(5)} />
                <YAxis yAxisId="cost" tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={v => `$${v}`} />
                <YAxis yAxisId="hours" orientation="right" tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={v => `${v}h`} />
                <RechartsTooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }} />
                <Area yAxisId="cost" type="monotone" dataKey="costSaved" stroke="#10b981" fill="#10b981" fillOpacity={0.2} name="Cost Saved ($)" />
                <Line yAxisId="hours" type="monotone" dataKey="hoursSaved" stroke="#3b82f6" strokeWidth={2} dot={false} name="Hours Saved" />
                <Area yAxisId="cost" type="monotone" dataKey="tokenCost" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} name="Token Cost ($)" />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-500 text-sm text-center py-16">No trend data available</p>
          )}
        </div>

        {/* Strategy pie */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Strategy Efficiency</h3>
          {strategyPie.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={strategyPie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} stroke="none">
                    {strategyPie.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <RechartsTooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {strategyPie.map(s => (
                  <div key={s.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.fill }} />
                      <span className="text-slate-400">{s.name}</span>
                    </div>
                    <span className="text-slate-300 font-medium">{s.value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-700/50 text-center">
                <p className="text-xs text-slate-500">Zero-Token Healings</p>
                <p className="text-lg font-bold text-emerald-400">{m.zeroTokenPercent}%</p>
              </div>
            </>
          ) : (
            <p className="text-slate-500 text-sm text-center py-8">No strategy data</p>
          )}
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar chart */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Savings by Category</h3>
          {catBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={catBarData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={v => `$${v}`} />
                <YAxis type="category" dataKey="category" width={130} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <RechartsTooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="costSaved" name="Cost Saved ($)" radius={[0, 4, 4, 0]}>
                  {catBarData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-500 text-sm text-center py-8">No data available</p>
          )}
        </div>

        {/* Category detail cards */}
        <div className="space-y-3">
          {report.categoryBreakdown.map(cat => {
            const iconMap: Record<string, React.ElementType> = {
              'Auto-Healing': Zap,
              'Flaky Investigation': Bug,
              'PR Automation': GitPullRequest,
              'Pattern Reuse': Brain,
            };
            const colorMap: Record<string, string> = {
              'Auto-Healing': 'text-emerald-400',
              'Flaky Investigation': 'text-amber-400',
              'PR Automation': 'text-blue-400',
              'Pattern Reuse': 'text-purple-400',
            };
            const CatIcon = iconMap[cat.category] || Layers;
            const catColor = colorMap[cat.category] || 'text-slate-400';
            return (
              <div key={cat.category} className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CatIcon className={`h-5 w-5 ${catColor}`} />
                  <div>
                    <p className="text-sm font-medium text-white">{cat.category}</p>
                    <p className="text-xs text-slate-500">{cat.count} occurrences</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${catColor}`}>{formatCurrency(cat.costSaved)}</p>
                  <p className="text-xs text-slate-500">{formatHours(cat.hoursSaved)} saved</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Metrics Grid */}
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Detailed Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCell label="Total Healings" value={m.totalHealings.toLocaleString()} icon={Zap} color="text-emerald-400" />
          <MetricCell label="Success Rate" value={`${m.successRate}%`} icon={Shield} color={m.successRate >= 80 ? 'text-emerald-400' : 'text-amber-400'} />
          <MetricCell label="Healings/Day" value={m.healingsPerDay.toString()} icon={BarChart3} color="text-blue-400" />
          <MetricCell label="Failed Healings" value={m.failedHealings.toLocaleString()} icon={XCircle} color={m.failedHealings === 0 ? 'text-emerald-400' : 'text-red-400'} />
          <MetricCell label="PRs Generated" value={m.prsGenerated.toString()} icon={GitPullRequest} color="text-blue-400" />
          <MetricCell label="PRs Merged" value={m.prsMerged.toString()} icon={GitPullRequest} color="text-emerald-400" />
          <MetricCell label="Patterns Learned" value={m.patternsLearned.toLocaleString()} icon={Brain} color="text-purple-400" />
          <MetricCell label="Pattern Reuses" value={m.patternReuses.toLocaleString()} icon={Brain} color="text-purple-400" />
          <MetricCell label="Flaky Tests" value={m.flakyTestsDetected.toString()} icon={Bug} color="text-amber-400" />
          <MetricCell label="Token Cost" value={`$${m.tokenCostActual.toFixed(2)}`} icon={DollarSign} color="text-amber-400" />
          <MetricCell label="Labor Saved" value={formatCurrency(m.laborCostSaved)} icon={Clock} color="text-emerald-400" />
          <MetricCell label="Net ROI" value={formatCurrency(m.netROI)} icon={TrendingUp} color="text-emerald-400" />
        </div>
      </div>

      {/* Cost Comparison */}
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Cost Comparison: AI vs Manual</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
            <p className="text-xs text-emerald-300/70 font-medium mb-2">LevelUp AI (Actual)</p>
            <p className="text-2xl font-bold text-emerald-400">${m.tokenCostActual.toFixed(2)}</p>
            <p className="text-xs text-slate-400 mt-1">Total AI token cost for {m.totalHealings} healings</p>
            <div className="mt-3 pt-3 border-t border-emerald-500/20 flex items-center justify-between text-xs">
              <span className="text-slate-500">Cost per fix</span>
              <span className="text-emerald-400 font-medium">${m.avgCostPerHeal.toFixed(4)}</span>
            </div>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <p className="text-xs text-red-300/70 font-medium mb-2">Manual Approach (Estimated)</p>
            <p className="text-2xl font-bold text-red-400">{formatCurrency(m.laborCostSaved + m.tokenCostActual)}</p>
            <p className="text-xs text-slate-400 mt-1">@ $75/hr × {formatHours(m.totalHoursSaved)} engineer time</p>
            <div className="mt-3 pt-3 border-t border-red-500/20 flex items-center justify-between text-xs">
              <span className="text-slate-500">Cost per fix</span>
              <span className="text-red-400 font-medium">{formatCurrency(m.manualCostPerFix)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pb-4">
        <p className="text-xs text-slate-600">
          Benchmarks: Manual fix ~30min, Flaky investigation ~45min, PR creation ~20min, Engineer rate $75/hr • {new Date(report.generatedAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* MetricCell                                                          */
/* ------------------------------------------------------------------ */

function MetricCell({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-slate-900/30 rounded-lg p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`h-3.5 w-3.5 ${color}`} />
        <span className="text-xs text-slate-500">{label}</span>
      </div>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}
