'use client';

import { useCallback, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  TestTube2,
  Code2,
  PlayCircle,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Loader2,
  Wrench,
  ListChecks,
} from 'lucide-react';

/* ---- Shapes from backend rtm-service getTraceability() ---- */
interface TraceScript {
  id: string;
  model: string | null;
  validation_status: string | null;
  reliability_score: number | null;
  created_at: string;
}
interface TraceTestCase {
  id: string;
  title: string;
  priority: string | null;
  severity: string | null;
  automation_ready: boolean | null;
  created_at: string;
  scripts: TraceScript[];
}
interface TraceExecution {
  id: string;
  status: string | null;
  executed_at: string | null;
  execution_time_ms: number | null;
  healing_applied: boolean | null;
  test_case_title: string | null;
  script_model: string | null;
}
interface TraceRequirement {
  id: string;
  requirement_id: string;
  title: string;
  description: string | null;
  category: string | null;
  priority: string | null;
  status: string | null;
  coverage_percentage: number;
  acceptance_criteria: string | null;
}
interface TraceStats {
  total_test_cases: number;
  total_scripts: number;
  total_executions: number;
  passed_executions: number;
  failed_executions: number;
}
interface TraceabilityData {
  requirement: TraceRequirement;
  test_cases: TraceTestCase[];
  executions: TraceExecution[];
  coverage_timeline: { date: string; total_runs: number; passed: number; failed: number }[];
  stats: TraceStats;
}

interface TraceabilityModalProps {
  open: boolean;
  onClose: () => void;
  requirementId: string | null;
  projectHeaders: Record<string, string>;
}

function statusBadge(status: string | null) {
  const s = (status || '').toLowerCase();
  if (s === 'passed') return 'bg-green-500/10 text-green-400 border-green-500/20';
  if (s === 'failed') return 'bg-red-500/10 text-red-400 border-red-500/20';
  if (s === 'running' || s === 'pending') return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
}

function validationColor(status: string | null) {
  const s = (status || '').toLowerCase();
  if (s === 'valid' || s === 'validated' || s === 'passed') return 'bg-green-500/10 text-green-400 border-green-500/20';
  if (s === 'invalid' || s === 'failed') return 'bg-red-500/10 text-red-400 border-red-500/20';
  return 'bg-slate-500/10 text-slate-300 border-slate-600';
}

export default function TraceabilityModal({ open, onClose, requirementId, projectHeaders }: TraceabilityModalProps) {
  const [data, setData] = useState<TraceabilityData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrace = useCallback(async () => {
    if (!requirementId) return;
    try {
      setLoading(true);
      setError(null);
      setData(null);
      const res = await fetch(`/api/rtm/traceability/${requirementId}`, { headers: projectHeaders });
      const json = await res.json();
      if (res.ok && json.success) {
        setData(json.data);
      } else {
        setError(json.error || 'Failed to load traceability detail');
      }
    } catch (e) {
      console.error('Failed to fetch traceability:', e);
      setError('Failed to load traceability detail');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requirementId]);

  useEffect(() => {
    if (open && requirementId) fetchTrace();
  }, [open, requirementId, fetchTrace]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[88vh] overflow-y-auto bg-[#1a1f2e] border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <ListChecks className="h-5 w-5 text-violet-400" />
            Traceability Chain
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
            <p className="mt-3 text-sm">Loading traceability chain…</p>
          </div>
        )}

        {error && !loading && (
          <div className="py-12 text-center">
            <XCircle className="mx-auto h-10 w-10 text-red-400" />
            <p className="mt-3 text-slate-300">{error}</p>
          </div>
        )}

        {data && !loading && (
          <div className="space-y-6">
            {/* Requirement */}
            <section className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-md bg-violet-500/15 p-2">
                  <FileText className="h-5 w-5 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-violet-300">{data.requirement.requirement_id}</span>
                    {data.requirement.priority && (
                      <Badge className="bg-slate-700 text-slate-200 border-slate-600">{data.requirement.priority}</Badge>
                    )}
                    {data.requirement.category && (
                      <Badge className="bg-slate-700 text-slate-200 border-slate-600">{data.requirement.category}</Badge>
                    )}
                    {data.requirement.status && (
                      <Badge className={statusBadge(data.requirement.status)}>{data.requirement.status}</Badge>
                    )}
                  </div>
                  <h3 className="mt-1.5 text-lg font-semibold text-white">{data.requirement.title}</h3>
                  {data.requirement.description && (
                    <p className="mt-1 text-sm text-slate-400">{data.requirement.description}</p>
                  )}
                  {data.requirement.acceptance_criteria && (
                    <div className="mt-3 rounded-md bg-slate-800/50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Acceptance Criteria</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">{data.requirement.acceptance_criteria}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats strip */}
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                <StatChip label="Test Cases" value={data.stats.total_test_cases} />
                <StatChip label="Scripts" value={data.stats.total_scripts} />
                <StatChip label="Executions" value={data.stats.total_executions} />
                <StatChip label="Passed" value={data.stats.passed_executions} tone="green" />
                <StatChip label="Failed" value={data.stats.failed_executions} tone="red" />
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Coverage</span>
                  <span>{Math.round(data.requirement.coverage_percentage)}%</span>
                </div>
                <div className="mt-1 h-2 w-full rounded-full bg-slate-700/60 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-violet-500"
                    style={{ width: `${Math.min(100, Math.round(data.requirement.coverage_percentage))}%` }}
                  />
                </div>
              </div>
            </section>

            {/* Chain connector */}
            <div className="flex items-center gap-2 pl-2 text-xs font-medium text-slate-500">
              <ChevronRight className="h-4 w-4" /> Test Cases &amp; Generated Scripts
            </div>

            {/* Test Cases → Scripts */}
            <section className="space-y-3">
              {data.test_cases.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">
                  No test cases linked to this requirement.
                </div>
              ) : (
                data.test_cases.map((tc) => (
                  <div key={tc.id} className="rounded-lg border border-slate-700 bg-slate-800/30 p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-md bg-blue-500/15 p-2">
                        <TestTube2 className="h-4 w-4 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-white">{tc.title}</span>
                          {tc.priority && <Badge className="bg-slate-700 text-slate-200 border-slate-600 text-[10px]">{tc.priority}</Badge>}
                          {tc.severity && <Badge className="bg-slate-700 text-slate-200 border-slate-600 text-[10px]">{tc.severity}</Badge>}
                          {tc.automation_ready && (
                            <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px]">Automation Ready</Badge>
                          )}
                        </div>

                        {/* Scripts */}
                        <div className="mt-3 space-y-2 border-l-2 border-slate-700 pl-4">
                          {tc.scripts.length === 0 ? (
                            <p className="text-xs text-slate-500">No scripts generated for this test case.</p>
                          ) : (
                            tc.scripts.map((s) => (
                              <div key={s.id} className="flex flex-wrap items-center gap-2 text-sm">
                                <Code2 className="h-3.5 w-3.5 text-emerald-400" />
                                <span className="text-slate-300">{s.model || 'unknown model'}</span>
                                {s.validation_status && (
                                  <Badge className={`${validationColor(s.validation_status)} text-[10px]`}>{s.validation_status}</Badge>
                                )}
                                {s.reliability_score != null && (
                                  <span className="text-xs text-slate-500">
                                    reliability {Math.round((s.reliability_score || 0) * (s.reliability_score <= 1 ? 100 : 1))}%
                                  </span>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </section>

            {/* Chain connector */}
            <div className="flex items-center gap-2 pl-2 text-xs font-medium text-slate-500">
              <ChevronRight className="h-4 w-4" /> Latest Executions
            </div>

            {/* Executions */}
            <section className="space-y-2">
              {data.executions.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">
                  No executions recorded yet.
                </div>
              ) : (
                data.executions.map((ex) => {
                  const passed = (ex.status || '').toLowerCase() === 'passed';
                  return (
                    <div key={ex.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-700 bg-slate-800/30 p-3">
                      {passed ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-400" />
                      ) : (
                        <XCircle className="h-4 w-4 shrink-0 text-red-400" />
                      )}
                      <PlayCircle className="h-4 w-4 shrink-0 text-slate-500" />
                      <span className="text-sm text-slate-200">{ex.test_case_title || 'Execution'}</span>
                      {ex.script_model && <span className="text-xs text-slate-500">· {ex.script_model}</span>}
                      <Badge className={`${statusBadge(ex.status)} text-[10px]`}>{ex.status || 'unknown'}</Badge>
                      {ex.healing_applied && (
                        <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]">
                          <Wrench className="mr-1 h-3 w-3" /> Healed
                        </Badge>
                      )}
                      {ex.execution_time_ms != null && (
                        <span className="ml-auto text-xs text-slate-500">{ex.execution_time_ms} ms</span>
                      )}
                      {ex.executed_at && (
                        <span className="text-xs text-slate-600">{new Date(ex.executed_at).toLocaleString()}</span>
                      )}
                    </div>
                  );
                })
              )}
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatChip({ label, value, tone }: { label: string; value: number; tone?: 'green' | 'red' }) {
  const valueColor = tone === 'green' ? 'text-green-400' : tone === 'red' ? 'text-red-400' : 'text-white';
  return (
    <div className="rounded-md bg-slate-800/60 px-3 py-2 text-center">
      <div className={`text-lg font-semibold ${valueColor}`}>{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}
