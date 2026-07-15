'use client';

/**
 * TimeSelector — the WHEN dimension of the workspace bar.
 * ======================================================
 * "Time" is the single time axis. A **Sprint** is just one *kind* of time
 * (the "Current Sprint" mode), NOT a separate hierarchy level. The selector
 * offers five modes:
 *
 *   • Current Sprint  → scoped to the active sprint's date window (x-sprint-id)
 *   • Last 7 Days     → rolling window
 *   • Last 14 Days    → rolling window
 *   • Last 30 Days    → rolling window
 *   • Custom Range    → explicit start/end dates
 *
 * Picking a specific sprint keeps `activeSprint` populated (so pages that still
 * read the sprint — analytics, RCA, release — keep working unchanged) AND sets
 * the mode to `current_sprint`. Rolling / custom modes resolve to concrete
 * start/end dates via the workspace `time` window.
 */

import { useRef, useState } from 'react';
import { useProjectSprints, useWorkspaceTime, TIME_MODE_LABELS, type TimeMode } from '@/lib/workspace-context';
import { CalendarClock, ChevronDown, Check, Plus, CircleDot, Rocket } from 'lucide-react';
import Link from 'next/link';
import { AnchoredMenu } from '@/components/ui/anchored-menu';

const STATUS_COLORS: Record<string, string> = {
  active: 'text-emerald-400',
  planned: 'text-sky-400',
  completed: 'text-slate-400',
  cancelled: 'text-red-400',
};

function statusColor(status: string | null): string {
  return STATUS_COLORS[(status || '').toLowerCase()] || 'text-slate-500';
}

function fmt(d: string | null): string {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function dateRange(start: string | null, end: string | null): string {
  const s = fmt(start);
  const e = fmt(end);
  if (s && e) return `${s} – ${e}`;
  return s || e || '';
}

/** Convert an ISO datetime (or null) into a yyyy-mm-dd value for <input type=date>. */
function toDateInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

const ROLLING_MODES: TimeMode[] = ['last_7_days', 'last_14_days', 'last_30_days'];

export function TimeSelector({ compact = false }: { compact?: boolean }) {
  const { sprints, currentSprint, activeSprint, setActiveSprint, loading } = useProjectSprints();
  const { time, timeMode, setTimeMode, customRange, setCustomRange } = useWorkspaceTime();
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  if (loading) {
    return <div className="h-8 w-32 rounded-lg bg-[#1e293b] animate-pulse" />;
  }

  // Button label reflects the active mode.
  const buttonLabel = (() => {
    if (timeMode === 'current_sprint') return activeSprint?.name || 'Current Sprint';
    if (timeMode === 'custom') {
      const r = dateRange(customRange.start, customRange.end);
      return r || 'Custom Range';
    }
    return TIME_MODE_LABELS[timeMode];
  })();

  const chooseSprint = (sprintId: number) => {
    const sprint = sprints.find((s) => s.id === sprintId) || null;
    setActiveSprint(sprint);
    setTimeMode('current_sprint');
    setOpen(false);
  };

  const chooseRolling = (mode: TimeMode) => {
    setTimeMode(mode);
    setOpen(false);
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen(!open)}
        title={`Time (WHEN): ${time.label}${time.start && time.end ? ` · ${dateRange(time.start, time.end)}` : ''}`}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-200 bg-[#1e293b] hover:bg-[#283548] border border-[#334155] transition-all max-w-[240px]"
      >
        <CalendarClock size={13} className="text-violet-400 flex-shrink-0" />
        <span className="truncate flex-1 text-left">{buttonLabel}</span>
        {timeMode === 'current_sprint' && activeSprint && currentSprint && activeSprint.id === currentSprint.id && (
          <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-500/15 text-emerald-400 flex-shrink-0">current</span>
        )}
        <ChevronDown size={13} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnchoredMenu open={open} onClose={() => setOpen(false)} anchorRef={btnRef} width={288}>
        <div className="px-3 py-2 border-b border-[#1e293b]">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-400">Time (when)</p>
          <p className="text-[10px] text-slate-500 leading-tight mt-0.5">Scope every view to a sprint or a rolling window. A sprint is just one kind of time.</p>
        </div>

        {/* ── Sprints (Current Sprint mode) ─────────────── */}
        {sprints.length > 0 && (
          <div className="py-1">
            <p className="px-3 py-1 text-[9px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Rocket size={9} className="text-violet-400" /> Sprints
            </p>
            {sprints.map((sprint) => {
              const range = dateRange(sprint.start_date, sprint.end_date);
              const selected = timeMode === 'current_sprint' && activeSprint?.id === sprint.id;
              return (
                <button
                  key={sprint.id}
                  onClick={() => chooseSprint(sprint.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${
                    selected ? 'bg-violet-500/10 text-violet-400' : 'text-slate-300 hover:bg-[#1e293b]'
                  }`}
                >
                  <CircleDot size={10} className={`flex-shrink-0 ${statusColor(sprint.status)}`} />
                  <span className="flex flex-col items-start flex-1 min-w-0">
                    <span className="truncate w-full text-left">{sprint.name}</span>
                    {range && <span className="text-[9px] text-slate-500">{range}</span>}
                  </span>
                  {currentSprint?.id === sprint.id && <span className="text-[9px] text-emerald-400 flex-shrink-0">current</span>}
                  {selected && <Check size={12} className="text-violet-400 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Rolling windows ───────────────────────────── */}
        <div className="py-1 border-t border-[#1e293b]">
          <p className="px-3 py-1 text-[9px] font-semibold uppercase tracking-wider text-slate-500">Rolling window</p>
          {ROLLING_MODES.map((mode) => (
            <button
              key={mode}
              onClick={() => chooseRolling(mode)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${
                timeMode === mode ? 'bg-violet-500/10 text-violet-400' : 'text-slate-300 hover:bg-[#1e293b]'
              }`}
            >
              <CalendarClock size={10} className="flex-shrink-0 text-slate-500" />
              <span className="flex-1 text-left">{TIME_MODE_LABELS[mode]}</span>
              {timeMode === mode && <Check size={12} className="text-violet-400 flex-shrink-0" />}
            </button>
          ))}
        </div>

        {/* ── Custom range ──────────────────────────────── */}
        <div className="py-1 border-t border-[#1e293b]">
          <button
            onClick={() => setTimeMode('custom')}
            className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${
              timeMode === 'custom' ? 'bg-violet-500/10 text-violet-400' : 'text-slate-300 hover:bg-[#1e293b]'
            }`}
          >
            <CalendarClock size={10} className="flex-shrink-0 text-slate-500" />
            <span className="flex-1 text-left">{TIME_MODE_LABELS.custom}</span>
            {timeMode === 'custom' && <Check size={12} className="text-violet-400 flex-shrink-0" />}
          </button>
          {timeMode === 'custom' && (
            <div className="px-3 py-2 flex flex-col gap-2">
              <label className="flex items-center justify-between gap-2 text-[10px] text-slate-400">
                <span>Start</span>
                <input
                  type="date"
                  value={toDateInput(customRange.start)}
                  max={toDateInput(customRange.end) || undefined}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCustomRange({ start: v ? new Date(v + 'T00:00:00').toISOString() : null, end: customRange.end });
                  }}
                  className="bg-[#0b1220] border border-[#334155] rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-violet-500"
                />
              </label>
              <label className="flex items-center justify-between gap-2 text-[10px] text-slate-400">
                <span>End</span>
                <input
                  type="date"
                  value={toDateInput(customRange.end)}
                  min={toDateInput(customRange.start) || undefined}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCustomRange({ start: customRange.start, end: v ? new Date(v + 'T23:59:59').toISOString() : null });
                  }}
                  className="bg-[#0b1220] border border-[#334155] rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-violet-500"
                />
              </label>
            </div>
          )}
        </div>

        {/* ── Manage sprints ────────────────────────────── */}
        <div className="border-t border-[#1e293b]">
          <Link
            href="/settings/sprints"
            onClick={() => setOpen(false)}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-slate-400 hover:text-white hover:bg-[#1e293b] transition-colors"
          >
            <Plus size={12} />
            <span>Manage Sprints</span>
          </Link>
        </div>
      </AnchoredMenu>
    </>
  );
}
