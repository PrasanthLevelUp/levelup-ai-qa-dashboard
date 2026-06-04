'use client';

/**
 * GlobalContextBar (Phase 1 Foundation)
 * =====================================
 * A sticky workspace bar shown across all authenticated pages. It answers three
 * simple questions, left → right, each in its own clearly-labelled section:
 *
 *   WHAT   →  Project   ("Which app am I working on?")
 *   WHERE  →  Environment ("QA / Staging / Production")
 *   WHEN   →  Sprint     ("Which time period / sprint?")
 *
 * A compact set of "quick stats" (healing success rate, risk grade) trails on
 * the right. Renders nothing until a project is selected so it degrades
 * gracefully on first-run / unauthenticated states.
 */

import { useProject } from '@/lib/project-context';
import { useProjectContext } from '@/lib/workspace-context';
import { EnvironmentSelector } from './environment-selector';
import { SprintSelector } from './sprint-selector';
import { Activity, ShieldCheck, FolderKanban, MapPin, CalendarClock } from 'lucide-react';

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
    <div className="sticky top-0 z-40 lg:ml-64 border-b border-[#1e293b] bg-[#0b1220]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0b1220]/80">
      <div className="flex items-stretch gap-0 px-4 py-2 overflow-x-auto">
        {/* ── WHAT: Project ─────────────────────────────── */}
        <section
          className="hidden md:flex items-center gap-1.5 pr-3 flex-shrink-0"
          title={`Project: ${activeProject.name} — the application you are working on`}
        >
          <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 hidden xl:inline">Project</span>
          <FolderKanban size={14} className="text-emerald-400 flex-shrink-0" />
          <span className="text-xs font-semibold text-slate-200 truncate max-w-[160px]">{activeProject.name}</span>
        </section>

        <div className="w-px bg-[#1e293b] mx-1 flex-shrink-0 hidden md:block" />

        {/* ── WHERE: Environment ────────────────────────── */}
        <section
          className="flex items-center gap-1.5 px-1 flex-shrink-0"
          title="WHERE: choose the test environment (QA, Staging, Production)"
        >
          <MapPin size={12} className="text-slate-500 flex-shrink-0 hidden xl:inline" />
          <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 hidden xl:inline">Where</span>
          <EnvironmentSelector compact />
        </section>

        <div className="w-px bg-[#1e293b] mx-1 flex-shrink-0" />

        {/* ── WHEN: Sprint ──────────────────────────────── */}
        <section
          className="flex items-center gap-1.5 px-1 flex-shrink-0"
          title="WHEN: choose the sprint / time period to scope the data"
        >
          <CalendarClock size={12} className="text-slate-500 flex-shrink-0 hidden xl:inline" />
          <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 hidden xl:inline">When</span>
          <SprintSelector compact />
        </section>

        {/* Spacer */}
        <div className="flex-1 min-w-[8px]" />

        {/* Sprint progress (condensed) */}
        {pct !== null && pct !== undefined && (
          <div
            className="hidden lg:flex items-center gap-2 flex-shrink-0 pl-2"
            title={`Sprint progress: ${Math.round(pct)}% complete`}
          >
            <div className="w-24 h-1.5 rounded-full bg-[#1e293b] overflow-hidden">
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
          <div
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 ml-2 rounded-lg bg-[#1e293b] border border-[#334155] flex-shrink-0"
            title="Self-healing success rate for the selected scope"
          >
            <Activity size={13} className="text-emerald-400" />
            <span className="text-[10px] text-slate-400">Healing</span>
            <span className="text-xs font-semibold text-emerald-400 tabular-nums">{Math.round(healingRate)}%</span>
          </div>
        )}

        {riskGrade && (
          <div
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 ml-2 rounded-lg border flex-shrink-0 ${RISK_COLORS[riskGrade] || RISK_COLORS.C}`}
            title="Release risk grade for the selected scope"
          >
            <ShieldCheck size={13} />
            <span className="text-[10px] opacity-80">Risk</span>
            <span className="text-xs font-bold tabular-nums">{riskGrade}</span>
          </div>
        )}
      </div>
    </div>
  );
}
