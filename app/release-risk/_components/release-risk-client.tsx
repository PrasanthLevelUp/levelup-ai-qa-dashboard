'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  RefreshCw, Shield, ShieldAlert, ShieldCheck, ShieldX,
  AlertTriangle, TrendingUp, TrendingDown, Activity,
  Target, Zap, Bug, CheckCircle2, XCircle, ArrowRight,
  BarChart3, Layers, Clock,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip,
  ResponsiveContainer, CartesianGrid,
  BarChart, Bar, Cell, RadialBarChart, RadialBar,
} from 'recharts';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface RiskSignal {
  name: string;
  category: string;
  score: number;
  weight: number;
  value: string;
  status: 'good' | 'warning' | 'critical';
  detail: string;
}

interface RiskArea {
  module: string;
  riskScore: number;
  failureCount: number;
  flakyCount: number;
  healingFailures: number;
  criticalRCAs: number;
}

interface RiskAssessment {
  overallScore: number;
  grade: string;
  recommendation: string;
  signals: RiskSignal[];
  riskAreas: RiskArea[];
  summary: string;
  assessedAt: string;
}

interface TrendPoint {
  date: string;
  riskScore: number;
  failureRate: number;
  flakyRate: number;
  healingFailureRate: number;
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const GRADE_CONFIG: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  A: { color: '#10b981', bg: '#10b98115', icon: ShieldCheck, label: 'Safe to Release' },
  B: { color: '#3b82f6', bg: '#3b82f615', icon: Shield, label: 'Low Risk' },
  C: { color: '#f59e0b', bg: '#f59e0b15', icon: ShieldAlert, label: 'Moderate Risk' },
  D: { color: '#f97316', bg: '#f9731615', icon: ShieldAlert, label: 'High Risk' },
  F: { color: '#ef4444', bg: '#ef444415', icon: ShieldX, label: 'Critical — Do Not Release' },
};

const STATUS_COLORS = {
  good: '#10b981',
  warning: '#f59e0b',
  critical: '#ef4444',
};

const SIGNAL_ICONS: Record<string, any> = {
  healing: Zap,
  flaky: Bug,
  rca: AlertTriangle,
  confidence: Target,
  stability: ShieldAlert,
  trend: TrendingUp,
};

const PERIOD_OPTIONS = [
  { value: '7', label: '7 days' },
  { value: '14', label: '14 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
];

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function ReleaseRiskClient() {
  const [loading, setLoading] = useState(true);
  const [assessment, setAssessment] = useState<RiskAssessment | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [days, setDays] = useState('30');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [assessRes, trendRes] = await Promise.all([
        fetch(`/api/release-risk?days=${days}`).then(r => r.json()),
        fetch(`/api/release-risk/trend?days=${days}`).then(r => r.json()),
      ]);
      if (!assessRes.error) setAssessment(assessRes);
      if (Array.isArray(trendRes)) setTrend(trendRes);
    } catch (err) {
      console.error('Failed to load risk data', err);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading && !assessment) {
    return (
      <div className="flex items-center justify-center py-32">
        <RefreshCw className="animate-spin text-slate-500" size={28} />
      </div>
    );
  }

  const grade = assessment ? GRADE_CONFIG[assessment.grade] || GRADE_CONFIG.C : GRADE_CONFIG.C;
  const GradeIcon = grade.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ backgroundColor: grade.bg }}>
              <Shield style={{ color: grade.color }} size={24} />
            </div>
            Release Risk Engine
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            AI-powered release confidence assessment
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-slate-800/50 p-1 rounded-lg border border-slate-700/50">
            {PERIOD_OPTIONS.map(p => (
              <button
                key={p.value}
                onClick={() => setDays(p.value)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                  days === p.value
                    ? 'bg-slate-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
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
      </div>

      {assessment && (
        <>
          {/* Grade Hero */}
          <div className="bg-[#1e293b] rounded-2xl p-6 border border-slate-700/50">
            <div className="flex flex-col lg:flex-row items-center gap-8">
              {/* Score Gauge */}
              <div className="flex-shrink-0">
                <div className="relative w-48 h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                      cx="50%" cy="50%"
                      innerRadius="70%" outerRadius="100%"
                      barSize={14}
                      data={[{ value: assessment.overallScore, fill: grade.color }]}
                      startAngle={180}
                      endAngle={0}
                    >
                      <RadialBar background={{ fill: '#334155' }} dataKey="value" cornerRadius={10} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-5xl font-black" style={{ color: grade.color }}>
                      {assessment.overallScore}
                    </span>
                    <span className="text-xs text-slate-400 mt-1">/ 100 risk</span>
                  </div>
                </div>
              </div>

              {/* Grade & Recommendation */}
              <div className="flex-1 text-center lg:text-left">
                <div className="flex items-center gap-3 justify-center lg:justify-start mb-3">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: grade.bg }}
                  >
                    <GradeIcon size={32} style={{ color: grade.color }} />
                  </div>
                  <div>
                    <div className="text-4xl font-black text-white">Grade {assessment.grade}</div>
                    <div className="text-sm font-medium" style={{ color: grade.color }}>{grade.label}</div>
                  </div>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed max-w-xl">
                  {assessment.recommendation}
                </p>
                <div className="flex items-center gap-2 mt-3 text-xs text-slate-500 justify-center lg:justify-start">
                  <Clock size={12} />
                  Assessed: {new Date(assessment.assessedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  <span>•</span>
                  Window: {days} days
                </div>
              </div>
            </div>

            {/* Summary Banner */}
            <div
              className="mt-5 px-4 py-3 rounded-xl text-sm border"
              style={{
                backgroundColor: `${grade.color}08`,
                borderColor: `${grade.color}30`,
                color: grade.color,
              }}
            >
              {assessment.summary}
            </div>
          </div>

          {/* Risk Signals */}
          <div className="bg-[#1e293b] rounded-xl p-5 border border-slate-700/50">
            <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
              <Activity size={16} className="text-blue-400" />
              Risk Signals
              <span className="text-xs text-slate-500 font-normal ml-1">(weighted contribution to overall score)</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assessment.signals.map((signal) => {
                const Icon = SIGNAL_ICONS[signal.category] || Activity;
                const statusColor = STATUS_COLORS[signal.status];
                const weightedContribution = Math.round(signal.score * signal.weight);
                return (
                  <div
                    key={signal.name}
                    className="bg-slate-800/50 rounded-xl p-4 border transition-colors"
                    style={{ borderColor: `${statusColor}30` }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${statusColor}15` }}>
                          <Icon size={14} style={{ color: statusColor }} />
                        </div>
                        <span className="text-xs font-medium text-slate-300">{signal.name}</span>
                      </div>
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                        style={{ backgroundColor: `${statusColor}20`, color: statusColor }}
                      >
                        {signal.status}
                      </span>
                    </div>

                    <div className="text-2xl font-bold text-white mb-1">{signal.value}</div>
                    <p className="text-[11px] text-slate-500 mb-3">{signal.detail}</p>

                    {/* Score bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Signal Risk: {signal.score}/100</span>
                        <span>Weight: {(signal.weight * 100).toFixed(0)}% → +{weightedContribution} pts</span>
                      </div>
                      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${signal.score}%`, backgroundColor: statusColor }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Risk Trend + Module Risks */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Risk Trend Chart */}
            <div className="bg-[#1e293b] rounded-xl p-5 border border-slate-700/50">
              <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                <TrendingUp size={16} className="text-emerald-400" />
                Risk Score Trend ({days}d)
              </h3>
              {trend.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={trend} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                    <defs>
                      <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="failGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      tickFormatter={(d: string) => d.slice(5)}
                    />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} domain={[0, 100]} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                      labelFormatter={(l: string) => `Date: ${l}`}
                      formatter={(value: number, name: string) => [
                        `${value}${name.includes('Rate') ? '%' : ''}`,
                        name,
                      ]}
                    />
                    <Area
                      type="monotone" dataKey="riskScore" name="Risk Score"
                      stroke="#ef4444" fill="url(#riskGrad)" strokeWidth={2}
                    />
                    <Area
                      type="monotone" dataKey="failureRate" name="Failure Rate %"
                      stroke="#f59e0b" fill="url(#failGrad)" strokeWidth={1.5}
                      strokeDasharray="4 4"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-slate-500 text-sm">
                  No trend data yet
                </div>
              )}
            </div>

            {/* Module Risk Areas */}
            <div className="bg-[#1e293b] rounded-xl p-5 border border-slate-700/50">
              <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                <Layers size={16} className="text-amber-400" />
                Risk Areas by Module
              </h3>
              {assessment.riskAreas.length > 0 ? (
                <div className="space-y-3">
                  {assessment.riskAreas.map((area) => {
                    const riskColor =
                      area.riskScore >= 70 ? '#ef4444' :
                      area.riskScore >= 40 ? '#f59e0b' : '#10b981';
                    return (
                      <div key={area.module} className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/20">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-slate-200 capitalize">{area.module}</span>
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-bold"
                            style={{ backgroundColor: `${riskColor}20`, color: riskColor }}
                          >
                            Risk: {area.riskScore}
                          </span>
                        </div>
                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-2">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${area.riskScore}%`, backgroundColor: riskColor }}
                          />
                        </div>
                        <div className="flex flex-wrap gap-3 text-[11px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <XCircle size={10} className="text-red-400" />
                            {area.failureCount} failures
                          </span>
                          <span className="flex items-center gap-1">
                            <Bug size={10} className="text-amber-400" />
                            {area.flakyCount} flaky
                          </span>
                          <span className="flex items-center gap-1">
                            <Zap size={10} className="text-orange-400" />
                            {area.healingFailures} heal fails
                          </span>
                          <span className="flex items-center gap-1">
                            <AlertTriangle size={10} className="text-red-500" />
                            {area.criticalRCAs} critical
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-slate-500 text-sm">
                  <div className="text-center">
                    <ShieldCheck size={32} className="mx-auto mb-2 text-emerald-500/50" />
                    <p>No risky modules detected</p>
                    <p className="text-xs mt-1">All modules are within safe thresholds</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Signal Breakdown Bar Chart */}
          <div className="bg-[#1e293b] rounded-xl p-5 border border-slate-700/50">
            <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
              <BarChart3 size={16} className="text-purple-400" />
              Signal Contribution to Overall Score
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={assessment.signals.map(s => ({
                  name: s.name.replace('Failure', 'Fail').replace('Direction', 'Dir.').replace('Level', 'Lvl').replace('Unhealed', 'Unheal.'),
                  contribution: Math.round(s.score * s.weight),
                  score: s.score,
                  status: s.status,
                }))}
                margin={{ top: 5, right: 10, left: -15, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                  formatter={(value: number) => [`${value} pts`, 'Contribution']}
                />
                <Bar dataKey="contribution" radius={[4, 4, 0, 0]}>
                  {assessment.signals.map((s, i) => (
                    <Cell key={i} fill={STATUS_COLORS[s.status]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
