'use client';

import { useRef, useState } from 'react';
import { useProjectSprints } from '@/lib/workspace-context';
import { Rocket, ChevronDown, Check, Plus, CircleDot } from 'lucide-react';
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

/** Compact "Mar 1 – Mar 14" range, or '' when no dates are set. */
function dateRange(start: string | null, end: string | null): string {
  const s = fmt(start);
  const e = fmt(end);
  if (s && e) return `${s} – ${e}`;
  return s || e || '';
}

/** Whole days left until the end date (null when no end date / past). */
function daysLeft(end: string | null): number | null {
  if (!end) return null;
  const ms = new Date(end).getTime() - Date.now();
  if (isNaN(ms)) return null;
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export function SprintSelector({ compact = false }: { compact?: boolean }) {
  const { sprints, currentSprint, activeSprint, setActiveSprint, loading } = useProjectSprints();
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  if (loading) {
    return <div className="h-8 w-32 rounded-lg bg-[#1e293b] animate-pulse" />;
  }

  if (sprints.length === 0) {
    return (
      <Link
        href="/settings/sprints"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-violet-400 bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/20 transition-all"
      >
        <Plus size={13} />
        <span>{compact ? 'Sprint' : 'Add Sprint'}</span>
      </Link>
    );
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen(!open)}
        title={
          activeSprint
            ? `Sprint (WHEN): ${activeSprint.name}${dateRange(activeSprint.start_date, activeSprint.end_date) ? ` · ${dateRange(activeSprint.start_date, activeSprint.end_date)}` : ''}`
            : 'Select the sprint / time period to scope the data'
        }
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-200 bg-[#1e293b] hover:bg-[#283548] border border-[#334155] transition-all max-w-[240px]"
      >
        <Rocket size={13} className="text-violet-400 flex-shrink-0" />
        <span className="truncate flex-1 text-left">{activeSprint?.name || 'Select Sprint'}</span>
        {activeSprint?.end_date && daysLeft(activeSprint.end_date) != null && (
          <span className="hidden md:inline text-[9px] text-slate-400 flex-shrink-0 tabular-nums">{daysLeft(activeSprint.end_date)}d left</span>
        )}
        {activeSprint && currentSprint && activeSprint.id === currentSprint.id && (
          <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-500/15 text-emerald-400 flex-shrink-0">current</span>
        )}
        <ChevronDown size={13} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnchoredMenu open={open} onClose={() => setOpen(false)} anchorRef={btnRef} width={272}>
        <div className="px-3 py-2 border-b border-[#1e293b]">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-400">When (time period)</p>
          <p className="text-[10px] text-slate-500 leading-tight mt-0.5">Sprints are time-based cycles used to filter data and track metrics.</p>
        </div>
        {sprints.map((sprint) => {
          const range = dateRange(sprint.start_date, sprint.end_date);
          return (
          <button
            key={sprint.id}
            onClick={() => { setActiveSprint(sprint); setOpen(false); }}
            className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs transition-colors ${
              activeSprint?.id === sprint.id ? 'bg-violet-500/10 text-violet-400' : 'text-slate-300 hover:bg-[#1e293b]'
            }`}
          >
            <CircleDot size={10} className={`flex-shrink-0 ${statusColor(sprint.status)}`} />
            <span className="flex flex-col items-start flex-1 min-w-0">
              <span className="truncate w-full text-left">{sprint.name}</span>
              {range && <span className="text-[9px] text-slate-500">{range}</span>}
            </span>
            {currentSprint?.id === sprint.id && <span className="text-[9px] text-emerald-400 flex-shrink-0">current</span>}
            {activeSprint?.id === sprint.id && <Check size={12} className="text-violet-400 flex-shrink-0" />}
          </button>
          );
        })}
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
