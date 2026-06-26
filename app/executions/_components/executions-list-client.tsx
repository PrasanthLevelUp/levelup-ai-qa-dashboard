'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, XCircle, Clock, MinusCircle, ChevronRight, ScrollText } from 'lucide-react';
import { useProject } from '@/lib/project-context';
import { ExecutionSummary } from '@/components/execution-summary';

interface ExecutionRow {
  executionId: string;
  testName: string;
  status: 'passed' | 'failed' | 'timedout' | 'skipped';
  result?: string | null;
  profile: string;
  durationMs: number;
  startTime: string;
  endTime: string;
  diagnosisCategory: string | null;
  confidence: number | null;
  healed: boolean;
  appliedStrategy: string | null;
}

const STATUS_META: Record<string, { cls: string; icon: any; label: string }> = {
  passed: { cls: 'text-emerald-400', icon: CheckCircle2, label: 'Passed' },
  failed: { cls: 'text-red-400', icon: XCircle, label: 'Failed' },
  timedout: { cls: 'text-amber-400', icon: Clock, label: 'Timed out' },
  skipped: { cls: 'text-slate-400', icon: MinusCircle, label: 'Skipped' },
};

function fmtDuration(ms: number): string {
  if (!ms || ms < 0) return '—';
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

export function ExecutionsListClient() {
  const { activeProject } = useProject();
  const [rows, setRows] = useState<ExecutionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const pid = activeProject?.id ? `&projectId=${activeProject.id}` : '';
    fetch(`/api/executions?limit=100${pid}`)
      .then((r: any) => r.json())
      .then((d: any) => setRows(Array.isArray(d?.executions) ? d.executions : []))
      .catch((e: any) => setError(e?.message ?? 'Failed to load'))
      .finally(() => setLoading(false));
  }, [activeProject?.id]);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <ScrollText size={20} /> Execution History
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Every test execution as a single canonical record — diagnosis, healing, validation and learning in one place.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
        </div>
      ) : error ? (
        <p className="text-red-400">{error}</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-[#1e293b] bg-[#1e293b]/30 p-10 text-center">
          <p className="text-slate-400">No execution records yet.</p>
          <p className="text-xs text-slate-500 mt-1">Records are created when the healing worker processes a failing run.</p>
        </div>
      ) : (
        <>
        {/* Most recent execution, summarised by the reusable ExecutionSummary card. */}
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-2">Most recent</p>
          <ExecutionSummary execution={rows[0]} />
        </div>

        <div className="rounded-xl border border-[#1e293b] overflow-hidden">
          {rows.map((r) => {
            const meta = STATUS_META[r.status] ?? STATUS_META.failed;
            const Icon = meta.icon;
            return (
              <Link
                key={r.executionId}
                href={`/executions/${encodeURIComponent(r.executionId)}`}
                className="flex items-center gap-4 px-5 py-4 border-b border-[#1e293b] last:border-0 bg-[#1e293b]/20 hover:bg-[#1e293b]/50 transition-colors"
              >
                <Icon size={18} className={`${meta.cls} shrink-0`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-200 truncate">{r.testName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {meta.label}
                    {r.diagnosisCategory && <span className="capitalize"> · {r.diagnosisCategory.replace(/_/g, ' ')}</span>}
                    {r.healed && <span className="text-emerald-400"> · healed{r.appliedStrategy ? ` (${r.appliedStrategy})` : ''}</span>}
                  </p>
                </div>
                <div className="hidden sm:block text-right shrink-0">
                  <p className="text-xs text-slate-400 capitalize">{r.profile}</p>
                  <p className="text-[11px] text-slate-500">{fmtDuration(r.durationMs)}</p>
                </div>
                <ChevronRight size={16} className="text-slate-600 shrink-0" />
              </Link>
            );
          })}
        </div>
        </>
      )}
    </div>
  );
}
