'use client';

/**
 * GlobalContextBar (Phase 1 Foundation)
 * =====================================
 * A sticky workspace bar shown across all authenticated pages. It surfaces the
 * active project, environment & sprint selectors, the time-range selector and a
 * compact set of "quick stats" (healing success rate, risk grade) plus a sprint
 * progress bar. Renders nothing until a project is selected so it degrades
 * gracefully on first-run / unauthenticated states.
 */

import { useProject } from '@/lib/project-context';
import { useProjectContext } from '@/lib/workspace-context';
import { EnvironmentSelector } from './environment-selector';
import { SprintSelector } from './sprint-selector';
import { TimeRangeSelector } from './time-range-selector';
import { Activity, ShieldCheck, FolderKanban } from 'lucide-react';

const RISK_COLORS: Record<string, string> = {
  A: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  B: 'text-lime-400 bg-lime-500/10 border-lime-500/20',
  C: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  D: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  F: 'text-red-400 bg-red-500/10 border-red-500/20',
};

export function GlobalContextBar() {
  const { activeProject } = useProject();
  const { quickStats, sprintProgress } = useProjectContext();

  // Degrade gracefully: nothing to show without a project.
  if (!activeProject) return null;

  const healingRate = quickStats?.healingSuccessRate;
  const riskGrade = quickStats?.riskGrade;
  const pct = sprintProgress?.percentComplete;

  return (
    <div className="sticky top-0 z-30 lg:ml-64 border-b border-[#1e293b] bg-[#0b1220]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0b1220]/80">
      <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto">
        {/* Project name */}
        <div className="hidden md:flex items-center gap-1.5 pr-2 mr-1 border-r border-[#1e293b] flex-shrink-0">
          <FolderKanban size={14} className="text-emerald-400" />
          <span className="text-xs font-semibold text-slate-200 truncate max-w-[160px]">{activeProject.name}</span>
        </div>

        {/* Selectors */}
        <div className="flex-shrink-0"><EnvironmentSelector compact /></div>
        <div className="flex-shrink-0"><SprintSelector compact /></div>
        <div className="flex-shrink-0"><TimeRangeSelector /></div>

        {/* Spacer */}
        <div className="flex-1 min-w-[8px]" />

        {/* Sprint progress */}
        {pct !== null && pct !== undefined && (
          <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
            <div className="w-28 h-1.5 rounded-full bg-[#1e293b] overflow-hidden">
              <div
                className={`h-full rounded-full ${sprintProgress?.isOverdue ? 'bg-red-500' : 'bg-violet-500'}`}
                style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 tabular-nums">
              {Math.round(pct)}%
              {sprintProgress?.remainingDays != null && !sprintProgress.isOverdue && (
                <span className="text-slate-500"> · {sprintProgress.remainingDays}d left</span>
              )}
              {sprintProgress?.isOverdue && <span className="text-red-400"> · overdue</span>}
            </span>
          </div>
        )}

        {/* Quick stats */}
        {healingRate !== null && healingRate !== undefined && (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1e293b] border border-[#334155] flex-shrink-0">
            <Activity size={13} className="text-emerald-400" />
            <span className="text-[10px] text-slate-400">Healing</span>
            <span className="text-xs font-semibold text-emerald-400 tabular-nums">{Math.round(healingRate)}%</span>
          </div>
        )}

        {riskGrade && (
          <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border flex-shrink-0 ${RISK_COLORS[riskGrade] || RISK_COLORS.C}`}>
            <ShieldCheck size={13} />
            <span className="text-[10px] opacity-80">Risk</span>
            <span className="text-xs font-bold tabular-nums">{riskGrade}</span>
          </div>
        )}
      </div>
    </div>
  );
}
