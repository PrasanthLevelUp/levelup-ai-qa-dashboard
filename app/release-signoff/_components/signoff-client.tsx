'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  RefreshCw, CheckCircle2, XCircle, AlertTriangle,
  Shield, ShieldCheck, ShieldAlert, ShieldX,
  ClipboardCheck, FileCheck, ChevronDown, ChevronUp,
  Activity, TrendingUp, Bug, Brain, Layers, Zap,
  Clock,
} from 'lucide-react';
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
} from 'recharts';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface SectionItem {
  label: string;
  value: string;
  status?: 'good' | 'warning' | 'critical';
}

interface SignoffSection {
  title: string;
  status: 'pass' | 'warn' | 'fail';
  items: SectionItem[];
}

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

interface SignoffReport {
  decision: 'APPROVE' | 'REVIEW_REQUIRED' | 'REJECT';
  decisionReason: string;
  riskAssessment: RiskAssessment;
  sections: SignoffSection[];
  executiveSummary: string;
  generatedAt: string;
  windowDays: number;
}

const PERIOD_OPTIONS = [
  { label: '7 days', value: 7 },
  { label: '14 days', value: 14 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
];

const SECTION_ICONS: Record<string, React.ElementType> = {
  'Test Health': Activity,
  'Healing Performance': Zap,
  'Flaky Test Analysis': Bug,
  'Root Cause Analysis': AlertTriangle,
  'Learning & Intelligence': Brain,
  'High-Risk Modules': Layers,
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function SignoffClient() {
  const [report, setReport] = useState<SignoffReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/release-signoff?days=${days}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setReport(data);
      // Auto-expand all sections on load
      if (data.sections) {
        setExpandedSections(new Set(data.sections.map((s: SignoffSection) => s.title)));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load signoff report');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const toggleSection = (title: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  /* ---------------------------------------------------------------- */
  /* Decision styling                                                  */
  /* ---------------------------------------------------------------- */

  const decisionConfig = {
    APPROVE: {
      bg: 'from-emerald-500/10 to-emerald-600/5',
      border: 'border-emerald-500/30',
      text: 'text-emerald-400',
      icon: CheckCircle2,
      label: 'APPROVED',
      glow: 'shadow-emerald-500/20',
      badge: 'bg-emerald-500/20 text-emerald-300 ring-emerald-500/30',
    },
    REVIEW_REQUIRED: {
      bg: 'from-amber-500/10 to-amber-600/5',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
      icon: AlertTriangle,
      label: 'REVIEW REQUIRED',
      glow: 'shadow-amber-500/20',
      badge: 'bg-amber-500/20 text-amber-300 ring-amber-500/30',
    },
    REJECT: {
      bg: 'from-red-500/10 to-red-600/5',
      border: 'border-red-500/30',
      text: 'text-red-400',
      icon: XCircle,
      label: 'REJECTED',
      glow: 'shadow-red-500/20',
      badge: 'bg-red-500/20 text-red-300 ring-red-500/30',
    },
  };

  const sectionStatusConfig = {
    pass: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', icon: CheckCircle2, label: 'PASS' },
    warn: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', icon: AlertTriangle, label: 'WARN' },
    fail: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', icon: XCircle, label: 'FAIL' },
  };

  const itemStatusColors = {
    good: 'text-emerald-400',
    warning: 'text-amber-400',
    critical: 'text-red-400',
  };

  /* ---------------------------------------------------------------- */
  /* Grade → radial chart data                                         */
  /* ---------------------------------------------------------------- */

  const gradeColor = (g: string) => {
    switch (g) {
      case 'A': return '#10b981';
      case 'B': return '#34d399';
      case 'C': return '#f59e0b';
      case 'D': return '#f97316';
      case 'F': return '#ef4444';
      default: return '#6b7280';
    }
  };

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-8 w-8 text-blue-400 animate-spin" />
          <p className="text-slate-400 text-sm">Generating signoff report…</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 max-w-md text-center">
          <XCircle className="h-8 w-8 text-red-400 mx-auto mb-3" />
          <p className="text-red-300 font-medium mb-2">Failed to Load Report</p>
          <p className="text-slate-400 text-sm mb-4">{error}</p>
          <button onClick={fetchReport} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const dc = decisionConfig[report.decision];
  const DecisionIcon = dc.icon;
  const riskScore = report.riskAssessment.overallScore;
  const riskGrade = report.riskAssessment.grade;
  const radialData = [{ name: 'Score', value: 100 - riskScore, fill: gradeColor(riskGrade) }];
  const passCount = report.sections.filter(s => s.status === 'pass').length;
  const warnCount = report.sections.filter(s => s.status === 'warn').length;
  const failCount = report.sections.filter(s => s.status === 'fail').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ClipboardCheck className="h-7 w-7 text-blue-400" />
            Release Signoff Assistant
          </h1>
          <p className="text-slate-400 text-sm mt-1">AI-powered quality gate assessment for release readiness</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Period selector */}
          <div className="flex items-center bg-slate-800/50 rounded-lg border border-slate-700/50 p-0.5">
            {PERIOD_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setDays(opt.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  days === opt.value
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            onClick={fetchReport}
            disabled={loading}
            className="p-2 bg-slate-800/50 rounded-lg border border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600 transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Decision Hero */}
      <div className={`relative bg-gradient-to-br ${dc.bg} border ${dc.border} rounded-2xl p-6 shadow-xl ${dc.glow} overflow-hidden`}>
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 opacity-5">
          <DecisionIcon className="w-full h-full" />
        </div>

        <div className="relative flex items-start gap-6">
          {/* Decision badge */}
          <div className="flex-shrink-0">
            <div className={`w-20 h-20 rounded-2xl ${dc.badge} ring-2 flex items-center justify-center`}>
              <DecisionIcon className={`h-10 w-10 ${dc.text}`} />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <span className={`text-2xl font-bold ${dc.text}`}>{dc.label}</span>
              <span className="text-xs text-slate-500">•</span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(report.generatedAt).toLocaleString()}
              </span>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">{report.decisionReason}</p>
          </div>

          {/* Risk gauge mini */}
          <div className="flex-shrink-0 text-center">
            <div className="w-24 h-20">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="100%" innerRadius="60%" outerRadius="100%" startAngle={180} endAngle={0} barSize={8} data={radialData}>
                  <RadialBar dataKey="value" cornerRadius={4} background={{ fill: '#1e293b' }} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <div className="-mt-2">
              <span className="text-lg font-bold" style={{ color: gradeColor(riskGrade) }}>
                Grade {riskGrade}
              </span>
              <p className="text-xs text-slate-500">Risk: {riskScore}/100</p>
            </div>
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
          <FileCheck className="h-4 w-4 text-blue-400" />
          Executive Summary
        </h3>
        <p className="text-slate-400 text-sm leading-relaxed">{report.executiveSummary}</p>
      </div>

      {/* Section summary bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 mx-auto mb-1" />
          <span className="text-2xl font-bold text-emerald-400">{passCount}</span>
          <p className="text-xs text-slate-400 mt-0.5">Passing</p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
          <AlertTriangle className="h-5 w-5 text-amber-400 mx-auto mb-1" />
          <span className="text-2xl font-bold text-amber-400">{warnCount}</span>
          <p className="text-xs text-slate-400 mt-0.5">Warnings</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
          <XCircle className="h-5 w-5 text-red-400 mx-auto mb-1" />
          <span className="text-2xl font-bold text-red-400">{failCount}</span>
          <p className="text-xs text-slate-400 mt-0.5">Failing</p>
        </div>
      </div>

      {/* Quality Gate Sections */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-300">Quality Gate Details</h3>
        {report.sections.map(section => {
          const sc = sectionStatusConfig[section.status];
          const StatusIcon = sc.icon;
          const SectionIcon = SECTION_ICONS[section.title] || Shield;
          const expanded = expandedSections.has(section.title);

          return (
            <div key={section.title} className={`border ${sc.border} rounded-xl overflow-hidden transition-all`}>
              {/* Section header — clickable */}
              <button
                onClick={() => toggleSection(section.title)}
                className={`w-full flex items-center justify-between p-4 ${sc.bg} hover:brightness-110 transition-all`}
              >
                <div className="flex items-center gap-3">
                  <SectionIcon className={`h-5 w-5 ${sc.text}`} />
                  <span className="text-sm font-medium text-white">{section.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${sc.bg} ${sc.text} font-semibold border ${sc.border}`}>
                    {sc.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusIcon className={`h-4 w-4 ${sc.text}`} />
                  {expanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </div>
              </button>

              {/* Section detail items */}
              {expanded && (
                <div className="bg-slate-900/40 divide-y divide-slate-700/30">
                  {section.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm text-slate-400">{item.label}</span>
                      <span className={`text-sm font-medium ${item.status ? itemStatusColors[item.status] : 'text-slate-300'}`}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Risk Assessment embed */}
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-blue-400" />
          Risk Assessment Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {report.riskAssessment.signals.slice(0, 8).map(sig => {
            const sigColor = sig.status === 'good' ? 'text-emerald-400' : sig.status === 'warning' ? 'text-amber-400' : 'text-red-400';
            const sigBg = sig.status === 'good' ? 'bg-emerald-500/10' : sig.status === 'warning' ? 'bg-amber-500/10' : 'bg-red-500/10';
            return (
              <div key={sig.name} className={`${sigBg} rounded-lg p-3 text-center`}>
                <p className="text-xs text-slate-500 mb-1 truncate" title={sig.name}>{sig.name}</p>
                <p className={`text-lg font-bold ${sigColor}`}>{sig.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">Score: {sig.score}</p>
              </div>
            );
          })}
        </div>
        {report.riskAssessment.riskAreas.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-700/50">
            <p className="text-xs text-slate-500 mb-2 font-medium">High-Risk Modules</p>
            <div className="flex flex-wrap gap-2">
              {report.riskAssessment.riskAreas.slice(0, 6).map(area => {
                const aColor = area.riskScore >= 70 ? 'bg-red-500/20 text-red-300 border-red-500/30'
                  : area.riskScore >= 40 ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'bg-slate-700/50 text-slate-300 border-slate-600/50';
                return (
                  <span key={area.module} className={`text-xs px-2.5 py-1 rounded-full border ${aColor}`}>
                    {area.module} ({area.riskScore})
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center pb-4">
        <p className="text-xs text-slate-600">
          Report generated for {report.windowDays}-day window • {new Date(report.generatedAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}
