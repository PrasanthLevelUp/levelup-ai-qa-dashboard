'use client';

import { useState, useEffect, useCallback } from 'react';
import { useProject } from '@/lib/project-context';
import { toast } from 'sonner';
import {
  RefreshCw,
  Loader2,
  Activity,
  AlertTriangle,
  Clock,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  GitCompare,
  Gauge,
  TrendingDown,
  CheckCircle2,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types (mirror the backend script-maintenance service)             */
/* ------------------------------------------------------------------ */

interface OutdatedLocator {
  elementDescription: string;
  locator: string;
  reason: string;
  validationMethod: string;
}

interface ScriptHealth {
  scriptId: number;
  url: string;
  pageType: string | null;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  ageDays: number;
  stalenessPenalty: number;
  locatorHealth: number;
  totalLocators: number;
  validLocators: number;
  outdatedLocators: OutdatedLocator[];
  heuristicOnly: boolean;
  warnings: string[];
}

interface HealthSummary {
  total: number;
  avgScore: number;
  gradeCounts: Record<string, number>;
  needsAttention: number;
  staleCount: number;
  outdatedLocatorCount: number;
}

interface ImpactedScript {
  scriptId: number;
  url: string;
  impactedLocators: Array<{ elementDescription: string; locator: string; selector: string }>;
  riskLevel: 'low' | 'medium' | 'high';
}

interface ChangeEntry {
  baseUrl: string;
  versions: number;
  hasDiff: boolean;
  message?: string;
  fromVersion?: number;
  toVersion?: number;
  detectedAt?: string;
  severity?: 'none' | 'low' | 'medium' | 'high';
  diff?: {
    addedSelectors: string[];
    removedSelectors: string[];
    addedPages: string[];
    removedPages: string[];
    summary: string;
    severity: string;
  };
  impactedScripts?: ImpactedScript[];
}

/* ------------------------------------------------------------------ */
/*  Visual helpers                                                     */
/* ------------------------------------------------------------------ */

const GRADE_STYLES: Record<string, string> = {
  A: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  B: 'bg-lime-500/15 text-lime-400 border-lime-500/30',
  C: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  D: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  F: 'bg-red-500/15 text-red-400 border-red-500/30',
};

const SEVERITY_STYLES: Record<string, string> = {
  none: 'bg-slate-700/30 text-slate-400 border-slate-600/30',
  low: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  medium: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  high: 'bg-red-500/15 text-red-400 border-red-500/30',
};

const RISK_STYLES: Record<string, string> = {
  low: 'text-sky-400',
  medium: 'text-amber-400',
  high: 'text-red-400',
};

function scoreColor(score: number): string {
  if (score >= 90) return 'text-emerald-400';
  if (score >= 75) return 'text-lime-400';
  if (score >= 60) return 'text-amber-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
}

function shortUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname}${u.pathname}`.replace(/\/$/, '') || url;
  } catch {
    return url;
  }
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function ScriptHealthTab() {
  const { activeProject } = useProject();
  const [health, setHealth] = useState<ScriptHealth[]>([]);
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [changes, setChanges] = useState<ChangeEntry[]>([]);
  const [changesSummary, setChangesSummary] = useState<{ appsTracked: number; appsWithChanges: number; totalImpactedScripts: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const getProjectHeaders = useCallback((): Record<string, string> => {
    return activeProject?.id ? { 'x-project-id': String(activeProject.id) } : {};
  }, [activeProject?.id]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [healthRes, changesRes] = await Promise.all([
        fetch('/api/script-health', { headers: getProjectHeaders() }),
        fetch('/api/script-health/changes', { headers: getProjectHeaders() }),
      ]);

      const healthData = await healthRes.json();
      if (healthData.success) {
        setHealth(Array.isArray(healthData.scripts) ? healthData.scripts : []);
        setSummary(healthData.summary || null);
      } else {
        setError(healthData.error || 'Failed to load script health');
      }

      const changesData = await changesRes.json();
      if (changesData.success) {
        setChanges(Array.isArray(changesData.changes) ? changesData.changes : []);
        setChangesSummary(changesData.summary || null);
      }
    } catch (err) {
      console.error('[ScriptHealth] fetch failed:', err);
      setError('Failed to load script health');
    } finally {
      setLoading(false);
    }
  }, [getProjectHeaders]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const activeChanges = changes.filter((c) => c.hasDiff);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 size={20} className="animate-spin" />
          <span>Analyzing script health...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500/20 to-violet-600/20 border border-violet-500/30 flex items-center justify-center">
            <Activity size={18} className="text-violet-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Script Health</h2>
            <p className="text-[11px] text-slate-500">
              Proactive maintenance — locator validity, staleness &amp; UI change detection
            </p>
          </div>
        </div>
        <button
          onClick={fetchAll}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1e293b] border border-[#334155] text-slate-300 hover:text-white hover:bg-[#334155] transition-colors text-xs"
        >
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard
            icon={<Gauge size={16} />}
            label="Avg Health"
            value={`${summary.avgScore}`}
            suffix="/100"
            valueClass={scoreColor(summary.avgScore)}
            hint={`${summary.total} script${summary.total === 1 ? '' : 's'} tracked`}
          />
          <SummaryCard
            icon={<TrendingDown size={16} />}
            label="Needs Attention"
            value={`${summary.needsAttention}`}
            valueClass={summary.needsAttention > 0 ? 'text-orange-400' : 'text-emerald-400'}
            hint="grade D or F"
          />
          <SummaryCard
            icon={<Clock size={16} />}
            label="Stale Scripts"
            value={`${summary.staleCount}`}
            valueClass={summary.staleCount > 0 ? 'text-amber-400' : 'text-emerald-400'}
            hint="older than 90 days"
          />
          <SummaryCard
            icon={<ShieldAlert size={16} />}
            label="Outdated Locators"
            value={`${summary.outdatedLocatorCount}`}
            valueClass={summary.outdatedLocatorCount > 0 ? 'text-red-400' : 'text-emerald-400'}
            hint="across all scripts"
          />
        </div>
      )}

      {/* Change-detection banner */}
      {activeChanges.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <GitCompare size={16} className="text-amber-400" />
            <h3 className="text-sm font-semibold text-amber-300">UI Changes Detected</h3>
            {changesSummary && (
              <span className="text-[11px] text-slate-400">
                {changesSummary.appsWithChanges} app(s) changed · {changesSummary.totalImpactedScripts} script(s) potentially impacted
              </span>
            )}
          </div>
          <div className="space-y-3">
            {activeChanges.map((c) => (
              <div key={c.baseUrl} className="bg-[#0c1222] rounded-lg p-3 border border-[#2a3040]">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-medium text-slate-200 truncate max-w-[60%]" title={c.baseUrl}>
                    {shortUrl(c.baseUrl)}
                  </span>
                  <div className="flex items-center gap-2">
                    {c.severity && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${SEVERITY_STYLES[c.severity]}`}>
                        {c.severity} severity
                      </span>
                    )}
                    {c.fromVersion != null && c.toVersion != null && (
                      <span className="text-[10px] text-slate-500">v{c.fromVersion} → v{c.toVersion}</span>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">{c.diff?.summary}</p>

                {c.diff && (c.diff.removedSelectors.length > 0 || c.diff.addedSelectors.length > 0) && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {c.diff.removedSelectors.slice(0, 6).map((s, i) => (
                      <code key={`r-${i}`} className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-300 border border-red-500/20">
                        − {s}
                      </code>
                    ))}
                    {c.diff.addedSelectors.slice(0, 6).map((s, i) => (
                      <code key={`a-${i}`} className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        + {s}
                      </code>
                    ))}
                  </div>
                )}

                {c.impactedScripts && c.impactedScripts.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-[#2a3040]">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Impacted scripts</p>
                    <div className="space-y-1">
                      {c.impactedScripts.map((imp) => (
                        <div key={imp.scriptId} className="flex items-center gap-2 text-[11px]">
                          <span className={`font-medium ${RISK_STYLES[imp.riskLevel]}`}>● {imp.riskLevel}</span>
                          <span className="text-slate-400">#{imp.scriptId}</span>
                          <span className="text-slate-500 truncate">{shortUrl(imp.url)}</span>
                          <span className="text-slate-600">— {imp.impactedLocators.length} locator(s)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No-change info (only when we track apps but none changed) */}
      {activeChanges.length === 0 && changesSummary && changesSummary.appsTracked > 0 && (
        <div className="flex items-center gap-2 text-[11px] text-slate-500 px-1">
          <CheckCircle2 size={13} className="text-emerald-400" />
          No UI changes detected across {changesSummary.appsTracked} tracked app(s). Re-crawl an app to refresh change detection.
        </div>
      )}

      {/* Scripts table */}
      {health.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#1a1f2e] border border-[#2a3040] flex items-center justify-center mb-4">
            <Activity size={26} className="text-slate-600" />
          </div>
          <h3 className="text-sm font-medium text-slate-300 mb-1">No scripts to analyze yet</h3>
          <p className="text-xs text-slate-500 max-w-sm">
            Generate some test scripts first. Their health (locator validity &amp; staleness) will appear here so you can maintain them proactively.
          </p>
        </div>
      ) : (
        <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-[#2a3040] text-[10px] uppercase tracking-wider text-slate-500 font-medium">
            <div className="col-span-5">Script</div>
            <div className="col-span-2 text-center">Health</div>
            <div className="col-span-2 text-center">Locators</div>
            <div className="col-span-2 text-center">Age</div>
            <div className="col-span-1" />
          </div>
          {health.map((h) => {
            const isOpen = expanded.has(h.scriptId);
            const hasIssues = h.outdatedLocators.length > 0 || h.warnings.length > 0;
            return (
              <div key={h.scriptId} className="border-b border-[#2a3040] last:border-0">
                <button
                  onClick={() => hasIssues && toggleExpand(h.scriptId)}
                  className={`w-full grid grid-cols-12 gap-2 px-4 py-3 items-center text-left transition-colors ${
                    hasIssues ? 'hover:bg-[#1e2538] cursor-pointer' : 'cursor-default'
                  }`}
                >
                  {/* Script */}
                  <div className="col-span-5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-200 truncate" title={h.url}>{shortUrl(h.url)}</span>
                      {h.pageType && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20 shrink-0">
                          {h.pageType}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-600">#{h.scriptId}</span>
                  </div>

                  {/* Health score + grade */}
                  <div className="col-span-2 flex items-center justify-center gap-2">
                    <span className={`text-sm font-semibold ${scoreColor(h.score)}`}>{h.score}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${GRADE_STYLES[h.grade]}`}>
                      {h.grade}
                    </span>
                  </div>

                  {/* Locators */}
                  <div className="col-span-2 text-center">
                    {h.totalLocators > 0 ? (
                      <span className={`text-xs ${h.outdatedLocators.length > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                        {h.validLocators}/{h.totalLocators}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-600">n/a</span>
                    )}
                    {h.outdatedLocators.length > 0 && (
                      <p className="text-[9px] text-red-400">{h.outdatedLocators.length} outdated</p>
                    )}
                  </div>

                  {/* Age */}
                  <div className="col-span-2 text-center">
                    <span className={`text-xs ${h.ageDays > 90 ? 'text-amber-400' : 'text-slate-400'}`}>
                      {h.ageDays}d
                    </span>
                    {h.ageDays > 90 && <p className="text-[9px] text-amber-500">stale</p>}
                  </div>

                  {/* Expand chevron */}
                  <div className="col-span-1 flex justify-end">
                    {hasIssues && (isOpen ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />)}
                  </div>
                </button>

                {/* Expanded detail */}
                {isOpen && hasIssues && (
                  <div className="px-4 pb-3 -mt-1 space-y-2">
                    {h.heuristicOnly && (
                      <p className="text-[10px] text-slate-500 italic">
                        No recent crawl for this app — locator validity is heuristic. Re-crawl for precise results.
                      </p>
                    )}
                    {h.outdatedLocators.length > 0 && (
                      <div className="bg-[#0c1222] rounded-lg p-3 border border-red-500/15">
                        <p className="text-[10px] uppercase tracking-wider text-red-400/80 mb-2">Outdated / unverified locators</p>
                        <div className="space-y-1.5">
                          {h.outdatedLocators.map((o, i) => (
                            <div key={i} className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-2">
                                <code className="text-[11px] text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                  {o.locator}
                                </code>
                                <span className="text-[10px] text-slate-500">{o.elementDescription}</span>
                              </div>
                              <span className="text-[10px] text-slate-500 pl-1">↳ {o.reason}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {h.warnings.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {h.warnings.map((w, i) => (
                          <span key={i} className="text-[10px] text-slate-400 bg-[#0c1222] border border-[#2a3040] px-2 py-0.5 rounded">
                            {w}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function SummaryCard({
  icon,
  label,
  value,
  suffix,
  valueClass,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  suffix?: string;
  valueClass?: string;
  hint?: string;
}) {
  return (
    <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-4">
      <div className="flex items-center gap-2 text-slate-500 mb-2">
        {icon}
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-bold ${valueClass || 'text-white'}`}>{value}</span>
        {suffix && <span className="text-xs text-slate-600">{suffix}</span>}
      </div>
      {hint && <p className="text-[10px] text-slate-600 mt-1">{hint}</p>}
    </div>
  );
}
