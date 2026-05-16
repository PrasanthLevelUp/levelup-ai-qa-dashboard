'use client';

import {
  FileCode,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import type { GeneratedScriptRecord } from './scripts-client';

interface ScriptHistoryProps {
  scripts: GeneratedScriptRecord[];
}

function formatTime(dateStr: string | null) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

function getStatusConfig(status: string | null) {
  switch (status) {
    case 'passed':
      return { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', label: 'Passed' };
    case 'needs_review':
      return { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', label: 'Review' };
    default:
      return { icon: Clock, color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20', label: 'Pending' };
  }
}

export function ScriptHistory({ scripts }: ScriptHistoryProps) {
  if (scripts.length === 0) return null;

  return (
    <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#2a3040] flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <FileCode size={14} className="text-violet-400" />
          Generation History
        </h3>
        <span className="text-xs text-slate-500">{scripts.length} scripts</span>
      </div>

      <div className="divide-y divide-[#2a3040]">
        {scripts.map((script) => {
          const status = getStatusConfig(script.validationStatus);
          const StatusIcon = status.icon;
          const filesCount = Array.isArray(script.filesGenerated) ? script.filesGenerated.length : 0;

          return (
            <div key={script.id} className="px-4 py-3 hover:bg-[#0c1222]/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${status.bg} ${status.color}`}>
                    <StatusIcon size={12} />
                    {status.label}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white truncate">
                      {script.instructions || script.url}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[10px] text-slate-500">{script.url}</span>
                      {script.projectContext && (
                        <span className="text-[10px] text-violet-400/60">
                          {script.projectContext.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 ml-3">
                  {filesCount > 0 && (
                    <span className="text-xs text-slate-500 hidden md:flex items-center gap-1">
                      <FileCode size={10} />
                      {filesCount} files
                    </span>
                  )}
                  {script.reliabilityScore != null && script.reliabilityScore > 0 && (
                    <span className={`text-xs font-medium hidden md:block ${
                      script.reliabilityScore >= 80
                        ? 'text-emerald-400'
                        : script.reliabilityScore >= 60
                          ? 'text-amber-400'
                          : 'text-red-400'
                    }`}>
                      {script.reliabilityScore}%
                    </span>
                  )}
                  {script.tokensUsed != null && script.tokensUsed > 0 && (
                    <span className="text-xs text-slate-500 hidden lg:flex items-center gap-1">
                      <Sparkles size={10} />
                      {script.tokensUsed.toLocaleString()}
                    </span>
                  )}
                  <span className="text-xs text-slate-500 hidden md:block">
                    {formatTime(script.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
