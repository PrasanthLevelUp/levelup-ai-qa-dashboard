'use client';

import { useCallback, useEffect, useState } from 'react';
import { useProject, useProjectHeaders } from '@/lib/project-context';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  AlertCircle,
  GitBranch,
  Globe,
  BookOpen,
  Database,
  Brain,
  Link2,
  Search,
  ArrowRight,
  Sparkles,
  Bug,
  RefreshCw,
  Loader2,
  Activity,
  FolderOpen,
  Zap,
  TrendingUp,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types (match backend IntelligenceHealth shape)                            */
/* -------------------------------------------------------------------------- */

type SourceStatus = 'excellent' | 'good' | 'fair' | 'poor' | 'missing';
type Priority = 'critical' | 'high' | 'medium' | 'low';

interface SourceHealth {
  score: number;
  status: SourceStatus;
  metrics: Record<string, any>;
  impact: Priority;
  lastUpdated?: string;
}

interface Recommendation {
  id: string;
  priority: Priority;
  source: string;
  title: string;
  description: string;
  impact: string;
  actionUrl?: string;
  estimatedTime?: string;
}

interface IntelligenceStats {
  scriptsGeneratedWithIntelligence: number;
  scriptsGeneratedWithoutIntelligence: number;
  healingSuccessWithIntelligence: number;
  healingSuccessWithoutIntelligence: number;
  intelligenceUsageBreakdown?: Record<string, number>;
}

interface IntelligenceHealth {
  overall: number;
  sources: Record<string, SourceHealth>;
  recommendations: Recommendation[];
  stats: IntelligenceStats;
}

/* -------------------------------------------------------------------------- */
/*  Static maps                                                               */
/* -------------------------------------------------------------------------- */

const SOURCE_LABELS: Record<string, string> = {
  repositoryIntelligence: 'Repository Intelligence',
  applicationProfiles: 'Application Profiles',
  appKnowledge: 'App Knowledge',
  flakyTests: 'Flaky Tests',
  domMemory: 'DOM Memory',
  learningEngine: 'Learning Engine',
  similarityEngine: 'Similarity Engine',
  rcaIntelligence: 'RCA Intelligence',
};

const SOURCE_HREFS: Record<string, string> = {
  repositoryIntelligence: '/repo-intelligence',
  applicationProfiles: '/profiles',
  appKnowledge: '/knowledge',
  flakyTests: '/flaky',
  domMemory: '/dom-memory',
  learningEngine: '/learning',
  similarityEngine: '/similarity',
  rcaIntelligence: '/rca-intelligence',
};

function sourceIcon(key: string, size = 18) {
  const cls = 'text-violet-400';
  switch (key) {
    case 'repositoryIntelligence':
      return <GitBranch size={size} className={cls} />;
    case 'applicationProfiles':
      return <Globe size={size} className={cls} />;
    case 'appKnowledge':
      return <BookOpen size={size} className={cls} />;
    case 'flakyTests':
      return <Bug size={size} className={cls} />;
    case 'domMemory':
      return <Database size={size} className={cls} />;
    case 'learningEngine':
      return <Brain size={size} className={cls} />;
    case 'similarityEngine':
      return <Link2 size={size} className={cls} />;
    case 'rcaIntelligence':
      return <Search size={size} className={cls} />;
    default:
      return <Sparkles size={size} className={cls} />;
  }
}

function statusClasses(status: SourceStatus): string {
  switch (status) {
    case 'excellent':
      return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    case 'good':
      return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    case 'fair':
      return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    case 'poor':
      return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
    case 'missing':
    default:
      return 'text-red-400 bg-red-500/10 border-red-500/20';
  }
}

function statusIcon(status: SourceStatus, size = 14) {
  switch (status) {
    case 'excellent':
    case 'good':
      return <CheckCircle2 size={size} />;
    case 'fair':
      return <AlertTriangle size={size} />;
    case 'poor':
      return <AlertCircle size={size} />;
    case 'missing':
    default:
      return <XCircle size={size} />;
  }
}

function priorityBar(priority: Priority): string {
  switch (priority) {
    case 'critical':
      return 'bg-red-500';
    case 'high':
      return 'bg-orange-500';
    case 'medium':
      return 'bg-amber-500';
    case 'low':
    default:
      return 'bg-blue-500';
  }
}

function priorityBadge(priority: Priority): string {
  switch (priority) {
    case 'critical':
      return 'text-red-400 bg-red-500/10 border-red-500/20';
    case 'high':
      return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
    case 'medium':
      return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    case 'low':
    default:
      return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
  }
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-blue-400';
  if (score >= 40) return 'text-amber-400';
  if (score > 0) return 'text-orange-400';
  return 'text-red-400';
}

function overallLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Needs Improvement';
}

function humanizeMetric(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function formatMetricValue(value: any): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

const SOURCE_ORDER = [
  'repositoryIntelligence',
  'applicationProfiles',
  'appKnowledge',
  'flakyTests',
  'domMemory',
  'learningEngine',
  'similarityEngine',
  'rcaIntelligence',
];

export function IntelligenceClient() {
  const { activeProject, loading: projectLoading } = useProject();
  const projectHeaders = useProjectHeaders();

  const [health, setHealth] = useState<IntelligenceHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    if (projectLoading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/intelligence/health', { headers: projectHeaders });
      const data = await res.json();
      if (data?.success && data.data) {
        setHealth(data.data);
      } else {
        setError(data?.error || 'Failed to load intelligence health');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load intelligence health');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectLoading, activeProject?.id]);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  /* ---- Loading ---- */
  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-24">
          <div className="flex items-center gap-3 text-slate-400">
            <Loader2 size={20} className="animate-spin text-violet-400" />
            <span className="text-sm">Loading intelligence health…</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Activity className="text-violet-400" size={28} />
            Intelligence Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Monitor and optimize every intelligence source for maximum AI performance
          </p>
          {activeProject && (
            <div className="flex items-center gap-1.5 mt-2">
              <FolderOpen size={12} className="text-violet-400" />
              <span className="text-xs text-violet-300/80">
                Project: <span className="font-medium text-violet-300">{activeProject.name}</span>
              </span>
            </div>
          )}
        </div>
        <button
          onClick={fetchHealth}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1e293b] border border-[#334155] text-slate-300 hover:text-white hover:bg-[#334155] transition-colors text-sm"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
          <AlertTriangle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-red-300 font-medium">Could not load intelligence health</p>
            <p className="text-xs text-red-300/70 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {health && (
        <>
          {/* Overall Health Score */}
          <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-[#1a1f2e] to-blue-500/10 p-8">
            <div className="flex items-center justify-between gap-6">
              <div>
                <h2 className="text-xl font-semibold text-white mb-1">Overall Intelligence Health</h2>
                <p className="text-sm text-slate-400">
                  Your platform intelligence is{' '}
                  <span className={`font-semibold ${scoreColor(health.overall)}`}>
                    {overallLabel(health.overall)}
                  </span>
                </p>
              </div>
              <div className="text-center flex-shrink-0">
                <div className={`text-6xl font-bold ${scoreColor(health.overall)}`}>
                  {health.overall}
                </div>
                <div className="text-xs text-slate-500 mt-1">/ 100</div>
              </div>
            </div>
            <div className="mt-5 h-3 w-full rounded-full bg-[#0f172a] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500 transition-all duration-500"
                style={{ width: `${Math.max(0, Math.min(100, health.overall))}%` }}
              />
            </div>
          </div>

          {/* Intelligence Sources Grid */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <Sparkles size={18} className="text-violet-400" />
              Intelligence Sources
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SOURCE_ORDER.filter((k) => health.sources?.[k]).map((key) => {
                const source = health.sources[key];
                const href = SOURCE_HREFS[key];
                return (
                  <div
                    key={key}
                    className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-5 hover:border-[#3a4060] transition-colors"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-violet-500/10 rounded-lg flex-shrink-0">
                          {sourceIcon(key)}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-white truncate">
                            {SOURCE_LABELS[key] || humanizeMetric(key)}
                          </h3>
                          <span
                            className={`inline-flex items-center gap-1 mt-1 text-[10px] px-2 py-0.5 rounded border capitalize ${statusClasses(
                              source.status
                            )}`}
                          >
                            {statusIcon(source.status, 10)}
                            {source.status}
                          </span>
                        </div>
                      </div>
                      <div className={`text-2xl font-bold flex-shrink-0 ${scoreColor(source.score)}`}>
                        {source.score}
                      </div>
                    </div>

                    {source.metrics && Object.keys(source.metrics).length > 0 && (
                      <div className="space-y-1.5 border-t border-[#2a3040] pt-3">
                        {Object.entries(source.metrics).map(([metric, value]) => (
                          <div key={metric} className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">{humanizeMetric(metric)}</span>
                            <span className="text-slate-300 font-mono">
                              {formatMetricValue(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {href && (
                      <a
                        href={href}
                        className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors"
                      >
                        Open {SOURCE_LABELS[key] || 'source'}
                        <ArrowRight size={12} />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recommendations */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <Zap size={18} className="text-violet-400" />
              Recommended Actions
            </h2>
            {health.recommendations && health.recommendations.length > 0 ? (
              <div className="space-y-3">
                {health.recommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-5 flex items-stretch gap-4"
                  >
                    <div className={`w-1 rounded-full flex-shrink-0 ${priorityBar(rec.priority)}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded border capitalize ${priorityBadge(
                            rec.priority
                          )}`}
                        >
                          {rec.priority}
                        </span>
                        <span className="text-xs text-slate-500">{rec.source}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-white mb-1">{rec.title}</h3>
                      <p className="text-xs text-slate-400 mb-3 leading-relaxed">{rec.description}</p>
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-4 text-xs">
                          <span className="inline-flex items-center gap-1 text-emerald-400">
                            <TrendingUp size={12} />
                            {rec.impact}
                          </span>
                          {rec.estimatedTime && (
                            <span className="text-slate-500">⏱️ {rec.estimatedTime}</span>
                          )}
                        </div>
                        {rec.actionUrl && (
                          <a
                            href={rec.actionUrl}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition-colors"
                          >
                            Fix Now
                            <ArrowRight size={12} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-6 flex items-center gap-3">
                <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
                <p className="text-sm text-slate-300">
                  No recommendations right now — your intelligence sources are in good shape.
                </p>
              </div>
            )}
          </div>

          {/* Usage Stats */}
          {health.stats && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <Activity size={18} className="text-violet-400" />
                Intelligence Usage Statistics
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  value={health.stats.scriptsGeneratedWithIntelligence}
                  label="Scripts with Intelligence"
                  color="text-violet-400"
                />
                <StatCard
                  value={health.stats.scriptsGeneratedWithoutIntelligence}
                  label="Scripts without Intelligence"
                  color="text-slate-400"
                />
                <StatCard
                  value={health.stats.healingSuccessWithIntelligence}
                  label="Healing Success (with Intelligence)"
                  color="text-emerald-400"
                />
                <StatCard
                  value={health.stats.healingSuccessWithoutIntelligence}
                  label="Healing Success (without Intelligence)"
                  color="text-orange-400"
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  return (
    <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-5">
      <div className={`text-3xl font-bold ${color}`}>{value ?? 0}</div>
      <div className="text-xs text-slate-500 mt-1.5 leading-snug">{label}</div>
    </div>
  );
}
