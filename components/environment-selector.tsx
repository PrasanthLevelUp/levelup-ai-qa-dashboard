'use client';

import { useState } from 'react';
import { useProjectEnvironments } from '@/lib/workspace-context';
import { Server, ChevronDown, Check, Plus, Circle } from 'lucide-react';
import Link from 'next/link';

const HEALTH_COLORS: Record<string, string> = {
  healthy: 'text-emerald-400',
  degraded: 'text-amber-400',
  down: 'text-red-400',
  unknown: 'text-slate-500',
};

const TYPE_BADGE: Record<string, string> = {
  production: 'bg-red-500/10 text-red-400 border-red-500/20',
  staging: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  development: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  qa: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  test: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
};

function healthColor(status: string | null): string {
  return HEALTH_COLORS[(status || 'unknown').toLowerCase()] || HEALTH_COLORS.unknown;
}

export function EnvironmentSelector({ compact = false }: { compact?: boolean }) {
  const { environments, activeEnvironment, setActiveEnvironment, loading } = useProjectEnvironments();
  const [open, setOpen] = useState(false);

  if (loading) {
    return <div className="h-8 w-32 rounded-lg bg-[#1e293b] animate-pulse" />;
  }

  if (environments.length === 0) {
    return (
      <Link
        href="/settings/environments"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-sky-400 bg-sky-500/10 border border-sky-500/20 hover:bg-sky-500/20 transition-all"
      >
        <Plus size={13} />
        <span>{compact ? 'Env' : 'Add Environment'}</span>
      </Link>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-200 bg-[#1e293b] hover:bg-[#283548] border border-[#334155] transition-all max-w-[200px]"
      >
        <Server size={13} className="text-sky-400 flex-shrink-0" />
        <Circle size={7} className={`flex-shrink-0 fill-current ${healthColor(activeEnvironment?.health_status ?? null)}`} />
        <span className="truncate flex-1 text-left">{activeEnvironment?.name || 'Select Env'}</span>
        <ChevronDown size={13} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-50 w-64 bg-[#0f1729] border border-[#334155] rounded-lg shadow-xl max-h-72 overflow-y-auto">
            {environments.map((env) => (
              <button
                key={env.id}
                onClick={() => { setActiveEnvironment(env); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs transition-colors ${
                  activeEnvironment?.id === env.id ? 'bg-sky-500/10 text-sky-400' : 'text-slate-300 hover:bg-[#1e293b]'
                }`}
              >
                <Circle size={7} className={`flex-shrink-0 fill-current ${healthColor(env.health_status)}`} />
                <span className="truncate flex-1 text-left">{env.name}</span>
                {env.is_default && <span className="text-[9px] text-emerald-400">default</span>}
                <span className={`text-[9px] px-1.5 py-0.5 rounded border ${TYPE_BADGE[(env.environment_type || '').toLowerCase()] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                  {env.environment_type || 'env'}
                </span>
                {activeEnvironment?.id === env.id && <Check size={12} className="text-sky-400 flex-shrink-0" />}
              </button>
            ))}
            <div className="border-t border-[#1e293b]">
              <Link
                href="/settings/environments"
                onClick={() => setOpen(false)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-slate-400 hover:text-white hover:bg-[#1e293b] transition-colors"
              >
                <Plus size={12} />
                <span>Manage Environments</span>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
