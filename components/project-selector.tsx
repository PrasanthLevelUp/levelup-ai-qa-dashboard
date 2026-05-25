'use client';

import { useState } from 'react';
import { useProject } from '@/lib/project-context';
import { FolderKanban, ChevronDown, Plus, Check } from 'lucide-react';
import Link from 'next/link';

export function ProjectSelector() {
  const { projects, activeProject, setActiveProject, loading } = useProject();
  const [open, setOpen] = useState(false);

  if (loading) {
    return (
      <div className="px-4 py-3 border-b border-[#1e293b]">
        <div className="h-9 rounded-lg bg-[#1e293b] animate-pulse" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="px-4 py-3 border-b border-[#1e293b]">
        <Link
          href="/projects"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-all"
        >
          <Plus size={14} />
          <span>Create First Project</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 border-b border-[#1e293b] relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-200 bg-[#1e293b] hover:bg-[#283548] border border-[#334155] transition-all"
      >
        <FolderKanban size={14} className="text-emerald-400 flex-shrink-0" />
        <span className="truncate flex-1 text-left">{activeProject?.name || 'Select Project'}</span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-4 right-4 top-full mt-1 z-50 bg-[#0f1729] border border-[#334155] rounded-lg shadow-xl max-h-64 overflow-y-auto">
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => { setActiveProject(p); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors ${
                  activeProject?.id === p.id
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'text-slate-300 hover:bg-[#1e293b]'
                }`}
              >
                <FolderKanban size={13} className={activeProject?.id === p.id ? 'text-emerald-400' : 'text-slate-500'} />
                <span className="truncate flex-1 text-left">{p.name}</span>
                <span className="text-[10px] text-slate-500">{p.repo_count} repo{Number(p.repo_count) !== 1 ? 's' : ''}</span>
                {activeProject?.id === p.id && <Check size={13} className="text-emerald-400" />}
              </button>
            ))}
            <div className="border-t border-[#1e293b]">
              <Link
                href="/projects"
                onClick={() => setOpen(false)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-[#1e293b] transition-colors"
              >
                <Plus size={13} />
                <span>Manage Projects</span>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
