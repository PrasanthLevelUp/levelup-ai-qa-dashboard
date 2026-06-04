'use client';

import { useState } from 'react';
import { useProjectSprints } from '@/lib/workspace-context';
import { Rocket, ChevronDown, Check, Plus, CircleDot } from 'lucide-react';
import Link from 'next/link';

const STATUS_COLORS: Record<string, string> = {
  active: 'text-emerald-400',
  planned: 'text-sky-400',
  completed: 'text-slate-400',
  cancelled: 'text-red-400',
};

function statusColor(status: string | null): string {
  return STATUS_COLORS[(status || '').toLowerCase()] || 'text-slate-500';
}

export function SprintSelector({ compact = false }: { compact?: boolean }) {
  const { sprints, currentSprint, activeSprint, setActiveSprint, loading } = useProjectSprints();
  const [open, setOpen] = useState(false);

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
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-200 bg-[#1e293b] hover:bg-[#283548] border border-[#334155] transition-all max-w-[200px]"
      >
        <Rocket size={13} className="text-violet-400 flex-shrink-0" />
        <span className="truncate flex-1 text-left">{activeSprint?.name || 'Select Sprint'}</span>
        {activeSprint && currentSprint && activeSprint.id === currentSprint.id && (
          <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-500/15 text-emerald-400 flex-shrink-0">current</span>
        )}
        <ChevronDown size={13} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-50 w-64 bg-[#0f1729] border border-[#334155] rounded-lg shadow-xl max-h-72 overflow-y-auto">
            {sprints.map((sprint) => (
              <button
                key={sprint.id}
                onClick={() => { setActiveSprint(sprint); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs transition-colors ${
                  activeSprint?.id === sprint.id ? 'bg-violet-500/10 text-violet-400' : 'text-slate-300 hover:bg-[#1e293b]'
                }`}
              >
                <CircleDot size={10} className={`flex-shrink-0 ${statusColor(sprint.status)}`} />
                <span className="truncate flex-1 text-left">{sprint.name}</span>
                {currentSprint?.id === sprint.id && <span className="text-[9px] text-emerald-400">current</span>}
                {activeSprint?.id === sprint.id && <Check size={12} className="text-violet-400 flex-shrink-0" />}
              </button>
            ))}
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
          </div>
        </>
      )}
    </div>
  );
}
