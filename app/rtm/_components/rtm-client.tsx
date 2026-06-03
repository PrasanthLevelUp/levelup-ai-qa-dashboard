'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  LayoutGrid,
  AlertTriangle,
  BarChart3,
  RefreshCw,
  FileText,
  CheckCircle2,
  XCircle,
  Percent,
  ListChecks,
  TestTube2,
  Code2,
  PlayCircle,
  GitBranch,
  ShieldAlert,
} from 'lucide-react';
import { useProject, useProjectHeaders } from '@/lib/project-context';
import { toast } from 'sonner';
import TraceabilityModal from './traceability-modal';
import CoverageCharts, { RtmStatistics } from './coverage-charts';

/* ---- Shapes from backend rtm-service ---- */
interface MatrixTestCase {
  id: string;
  title: string;
  priority: string | null;
  severity: string | null;
  automation_ready: boolean | null;
  created_at: string;
}
interface MatrixScript {
  id: string;
  test_case_id: string;
  model: string | null;
  validation_status: string | null;
  reliability_score: number | null;
  created_at: string;
}
interface MatrixLatestExecution {
  id: string;
  status: string | null;
  executed_at: string | null;
  execution_time_ms: number | null;
  healing_applied: boolean | null;
}
interface MatrixRow {
  id: string;
  requirement_id: string;
  title: string;
  description: string | null;
  category: string | null;
  priority: string | null;
  status: string | null;
  coverage_percentage: number;
  acceptance_criteria: string | null;
  created_at: string;
  updated_at: string;
  test_cases: MatrixTestCase[];
  scripts: MatrixScript[];
  latest_execution: MatrixLatestExecution | null;
  test_cases_count: number;
  scripts_count: number;
  executions_count: number;
  passed_count: number;
  failed_count: number;
}

interface CoverageSummary {
  total: number;
  covered: number;
  not_covered: number;
  passed: number;
  failed: number;
  in_progress: number;
  not_tested: number;
  avg_coverage: number;
}

interface GapRequirement {
  id: string;
  requirement_id: string;
  title: string;
  category: string | null;
  priority: string | null;
  status: string | null;
  coverage_percentage: number;
  test_cases_count: number;
  scripts_count: number;
}
interface GapsData {
  no_test_cases: GapRequirement[];
  no_scripts: GapRequirement[];
  failed_tests: GapRequirement[];
  high_priority_incomplete: GapRequirement[];
  total_gaps: number;
}

const CATEGORIES = ['Functional', 'Non-Functional', 'Security', 'Performance', 'Usability', 'Compatibility'];
const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
const STATUSES = ['Not Started', 'In Progress', 'Covered', 'Verified', 'Failed'];

function coverageColor(pct: number): string {
  if (pct === 0) return 'bg-slate-500';
  if (pct <= 33) return 'bg-red-500';
  if (pct <= 66) return 'bg-yellow-500';
  if (pct < 100) return 'bg-blue-500';
  return 'bg-green-500';
}

function priorityBadge(priority: string | null): string {
  switch (priority) {
    case 'Critical':
      return 'bg-red-500/10 text-red-400 border-red-500/20';
    case 'High':
      return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
    case 'Medium':
      return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    case 'Low':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    default:
      return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  }
}

export default function RTMClient() {
  const { activeProject } = useProject();
  const projectHeaders = useProjectHeaders();

  const [matrix, setMatrix] = useState<MatrixRow[]>([]);
  const [summary, setSummary] = useState<CoverageSummary | null>(null);
  const [gaps, setGaps] = useState<GapsData | null>(null);
  const [stats, setStats] = useState<RtmStatistics | null>(null);

  const [loadingMatrix, setLoadingMatrix] = useState(true);
  const [loadingGaps, setLoadingGaps] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Traceability modal
  const [traceOpen, setTraceOpen] = useState(false);
  const [traceReqId, setTraceReqId] = useState<string | null>(null);

  const fetchMatrix = useCallback(async () => {
    try {
      setLoadingMatrix(true);
      const params = new URLSearchParams();
      if (categoryFilter) params.append('category', categoryFilter);
      if (priorityFilter) params.append('priority', priorityFilter);
      if (statusFilter) params.append('status', statusFilter);
      const res = await fetch(`/api/rtm/matrix?${params.toString()}`, { headers: projectHeaders });
      const json = await res.json();
      if (json.success) {
        setMatrix(json.data || []);
      } else {
        toast.error(json.error || 'Failed to load matrix');
      }
    } catch (e) {
      console.error('Failed to fetch matrix:', e);
      toast.error('Failed to load RTM matrix');
    } finally {
      setLoadingMatrix(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter, priorityFilter, statusFilter, activeProject?.id]);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/requirements/coverage-summary', { headers: projectHeaders });
      const json = await res.json();
      if (json.success) setSummary(json.data);
    } catch (e) {
      console.error('Failed to fetch summary:', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProject?.id]);

  const fetchGaps = useCallback(async () => {
    try {
      setLoadingGaps(true);
      const res = await fetch('/api/rtm/gaps', { headers: projectHeaders });
      const json = await res.json();
      if (json.success) setGaps(json.data);
    } catch (e) {
      console.error('Failed to fetch gaps:', e);
    } finally {
      setLoadingGaps(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProject?.id]);

  const fetchStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      const res = await fetch('/api/rtm/statistics', { headers: projectHeaders });
      const json = await res.json();
      if (json.success) setStats(json.data);
    } catch (e) {
      console.error('Failed to fetch statistics:', e);
    } finally {
      setLoadingStats(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProject?.id]);

  useEffect(() => {
    fetchMatrix();
  }, [fetchMatrix]);

  useEffect(() => {
    fetchSummary();
    fetchGaps();
    fetchStats();
  }, [fetchSummary, fetchGaps, fetchStats]);

  const refreshAll = () => {
    fetchMatrix();
    fetchSummary();
    fetchGaps();
    fetchStats();
  };

  const openTrace = (id: string) => {
    setTraceReqId(id);
    setTraceOpen(true);
  };

  const coveragePct = summary && summary.total > 0 ? Math.round((summary.covered / summary.total) * 100) : 0;
  const passRate = summary && summary.covered > 0 ? Math.round((summary.passed / summary.covered) * 100) : 0;

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
            <GitBranch className="h-6 w-6 text-violet-400" />
            RTM Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Requirements Traceability Matrix — coverage, gaps &amp; end-to-end traceability
            {activeProject?.name ? ` · ${activeProject.name}` : ''}
          </p>
        </div>
        <Button onClick={refreshAll} variant="outline" className="border-slate-700 bg-[#1a1f2e] text-slate-200 hover:bg-slate-800">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Executive Summary */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <SummaryCard
          icon={<FileText className="h-5 w-5 text-violet-400" />}
          label="Total Requirements"
          value={summary ? summary.total : '—'}
        />
        <SummaryCard
          icon={<Percent className="h-5 w-5 text-blue-400" />}
          label="Coverage"
          value={summary ? `${coveragePct}%` : '—'}
          sub={summary ? `${summary.covered}/${summary.total} covered` : undefined}
        />
        <SummaryCard
          icon={<CheckCircle2 className="h-5 w-5 text-green-400" />}
          label="Pass Rate"
          value={summary ? `${passRate}%` : '—'}
          sub={summary ? `${summary.passed} passing` : undefined}
        />
        <SummaryCard
          icon={<XCircle className="h-5 w-5 text-red-400" />}
          label="Failing"
          value={summary ? summary.failed : '—'}
        />
        <SummaryCard
          icon={<AlertTriangle className="h-5 w-5 text-amber-400" />}
          label="Coverage Gaps"
          value={gaps ? gaps.total_gaps : '—'}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="matrix" className="w-full">
        <TabsList className="bg-[#1a1f2e] border border-slate-700">
          <TabsTrigger value="matrix" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300">
            <LayoutGrid className="mr-2 h-4 w-4" />
            Matrix
          </TabsTrigger>
          <TabsTrigger value="gaps" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300">
            <AlertTriangle className="mr-2 h-4 w-4" />
            Gap Analysis
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300">
            <BarChart3 className="mr-2 h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* ---- MATRIX TAB ---- */}
        <TabsContent value="matrix" className="mt-4">
          {/* Filters */}
          <div className="mb-4 flex flex-wrap gap-3">
            <FilterSelect value={categoryFilter} onChange={setCategoryFilter} placeholder="All Categories" options={CATEGORIES} />
            <FilterSelect value={priorityFilter} onChange={setPriorityFilter} placeholder="All Priorities" options={PRIORITIES} />
            <FilterSelect value={statusFilter} onChange={setStatusFilter} placeholder="All Statuses" options={STATUSES} />
            {(categoryFilter || priorityFilter || statusFilter) && (
              <Button
                variant="ghost"
                className="text-slate-400 hover:text-white"
                onClick={() => {
                  setCategoryFilter('');
                  setPriorityFilter('');
                  setStatusFilter('');
                }}
              >
                Clear filters
              </Button>
            )}
          </div>

          <Card className="bg-[#1a1f2e] border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3 font-medium">Requirement</th>
                    <th className="px-4 py-3 font-medium">Priority</th>
                    <th className="px-4 py-3 font-medium text-center">Test Cases</th>
                    <th className="px-4 py-3 font-medium text-center">Scripts</th>
                    <th className="px-4 py-3 font-medium text-center">Executions</th>
                    <th className="px-4 py-3 font-medium">Coverage</th>
                    <th className="px-4 py-3 font-medium text-right">Trace</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingMatrix ? (
                    [0, 1, 2, 3, 4].map((i) => (
                      <tr key={i} className="border-b border-slate-800">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="h-5 w-full animate-pulse rounded bg-slate-800" />
                        </td>
                      </tr>
                    ))
                  ) : matrix.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center">
                        <ListChecks className="mx-auto h-10 w-10 text-slate-600" />
                        <p className="mt-3 text-slate-400">No requirements match the current filters.</p>
                        <p className="text-sm text-slate-500">Create requirements and link test cases to populate the matrix.</p>
                      </td>
                    </tr>
                  ) : (
                    matrix.map((row) => {
                      const pct = Math.round(row.coverage_percentage || 0);
                      return (
                        <tr key={row.id} className="border-b border-slate-800 transition-colors hover:bg-slate-800/40">
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <span className="font-mono text-xs text-violet-300">{row.requirement_id}</span>
                              <span className="font-medium text-white">{row.title}</span>
                              {row.category && <span className="mt-0.5 text-xs text-slate-500">{row.category}</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={priorityBadge(row.priority)}>{row.priority || '—'}</Badge>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center gap-1 text-slate-300">
                              <TestTube2 className="h-3.5 w-3.5 text-blue-400" />
                              {row.test_cases_count}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center gap-1 text-slate-300">
                              <Code2 className="h-3.5 w-3.5 text-emerald-400" />
                              {row.scripts_count}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center gap-2 text-slate-300">
                              <PlayCircle className="h-3.5 w-3.5 text-slate-400" />
                              {row.executions_count}
                              {row.passed_count > 0 && <span className="text-xs text-green-400">{row.passed_count}✓</span>}
                              {row.failed_count > 0 && <span className="text-xs text-red-400">{row.failed_count}✗</span>}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-700/60">
                                <div className={`h-full rounded-full ${coverageColor(pct)}`} style={{ width: `${pct}%` }} />
                              </div>
                              <span className="w-9 text-right text-xs text-slate-400">{pct}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-slate-700 bg-transparent text-violet-300 hover:bg-violet-500/10"
                              onClick={() => openTrace(row.id)}
                            >
                              <GitBranch className="mr-1.5 h-3.5 w-3.5" />
                              View chain
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ---- GAPS TAB ---- */}
        <TabsContent value="gaps" className="mt-4">
          {loadingGaps ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <Card key={i} className="h-48 animate-pulse bg-[#1a1f2e] border-slate-700" />
              ))}
            </div>
          ) : !gaps || gaps.total_gaps === 0 ? (
            <Card className="bg-[#1a1f2e] border-slate-700 p-10 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-green-400" />
              <p className="mt-3 font-medium text-white">No coverage gaps detected</p>
              <p className="text-sm text-slate-500">All requirements have test cases, scripts and passing executions.</p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <GapBucket
                title="No Test Cases"
                description="Requirements without any linked test cases"
                icon={<TestTube2 className="h-5 w-5 text-red-400" />}
                accent="red"
                items={gaps.no_test_cases}
                onTrace={openTrace}
              />
              <GapBucket
                title="No Scripts"
                description="Have test cases but no generated automation scripts"
                icon={<Code2 className="h-5 w-5 text-orange-400" />}
                accent="orange"
                items={gaps.no_scripts}
                onTrace={openTrace}
              />
              <GapBucket
                title="Failing Tests"
                description="Requirements with failing latest executions"
                icon={<XCircle className="h-5 w-5 text-red-400" />}
                accent="red"
                items={gaps.failed_tests}
                onTrace={openTrace}
              />
              <GapBucket
                title="High-Priority Incomplete"
                description="Critical / High priority requirements below full coverage"
                icon={<ShieldAlert className="h-5 w-5 text-amber-400" />}
                accent="amber"
                items={gaps.high_priority_incomplete}
                onTrace={openTrace}
              />
            </div>
          )}
        </TabsContent>

        {/* ---- ANALYTICS TAB ---- */}
        <TabsContent value="analytics" className="mt-4">
          <CoverageCharts stats={stats} loading={loadingStats} />
        </TabsContent>
      </Tabs>

      <TraceabilityModal
        open={traceOpen}
        onClose={() => setTraceOpen(false)}
        requirementId={traceReqId}
        projectHeaders={projectHeaders}
      />
    </div>
  );
}

/* ---------- Sub-components ---------- */

function SummaryCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: string;
}) {
  return (
    <Card className="bg-[#1a1f2e] border-slate-700 p-4">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-bold text-white">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
    </Card>
  );
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-slate-700 bg-[#1a1f2e] px-3 py-2 text-sm text-slate-200 focus:border-violet-500 focus:outline-none"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function GapBucket({
  title,
  description,
  icon,
  accent,
  items,
  onTrace,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  accent: 'red' | 'orange' | 'amber';
  items: GapRequirement[];
  onTrace: (id: string) => void;
}) {
  const accentBorder =
    accent === 'red' ? 'border-l-red-500' : accent === 'orange' ? 'border-l-orange-500' : 'border-l-amber-500';
  return (
    <Card className={`bg-[#1a1f2e] border-slate-700 border-l-4 ${accentBorder} p-5`}>
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <h3 className="font-semibold text-white">{title}</h3>
            <p className="text-xs text-slate-500">{description}</p>
          </div>
        </div>
        <Badge className="bg-slate-700 text-slate-200 border-slate-600">{items.length}</Badge>
      </div>
      {items.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-600">None 🎉</p>
      ) : (
        <ul className="max-h-56 space-y-1.5 overflow-y-auto">
          {items.map((it) => (
            <li
              key={it.id}
              className="flex items-center justify-between gap-2 rounded-md bg-slate-800/40 px-3 py-2"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-violet-300">{it.requirement_id}</span>
                  <Badge className={`${priorityBadge(it.priority)} text-[10px]`}>{it.priority || '—'}</Badge>
                </div>
                <p className="truncate text-sm text-slate-200">{it.title}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0 text-violet-300 hover:bg-violet-500/10"
                onClick={() => onTrace(it.id)}
              >
                <GitBranch className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
