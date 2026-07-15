'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  FlaskConical,
  ChevronDown,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  GitBranch,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useProject, useProjectHeaders } from '@/lib/project-context';
import { useWorkspaceHeaders } from '@/lib/workspace-context';
import { toast } from 'sonner';
import RequirementDialog from './requirement-dialog';
import JiraImportDialog from './jira-import-dialog';
import DeleteConfirmDialog from './delete-confirm-dialog';
import RequirementFlow from './requirement-flow';

/* Matches backend RtmRequirement + aggregate counts from getRequirements() */
interface Requirement {
  id: string;
  requirement_id: string;
  title: string;
  description: string | null;
  category: string | null;
  priority: string;
  status: string;
  coverage_percentage: number;
  test_case_count: number;
  script_count: number;
  execution_count: number;
  acceptance_criteria: string | null;
  created_at: string;
  tags: string[] | null;
  // Sprint 6.1 — multi-source requirements (Manual / Jira / …)
  source: string;
  source_id: string | null;
  sync_status: string;
  metadata?: {
    jira?: {
      key?: string;
      issueType?: string;
      status?: string;
      priority?: string;
      assignee?: string;
      sprint?: string;
      labels?: string[];
      updated?: string;
      url?: string;
      projectKey?: string;
    };
    [k: string]: unknown;
  } | null;
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
  // Requirements Hub header stats (added backend-side to stay accurate under filters)
  manual_count: number;
  imported_count: number;
  last_synced_at: string | null;
}

/** Compact "5 min ago" / "2 h ago" formatter for the Last Sync stat. */
function formatRelativeTime(iso: string | null): string {
  if (!iso) return 'Never';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'Never';
  const diffMs = Date.now() - then;
  if (diffMs < 0) return 'just now';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function RequirementsClient() {
  const router = useRouter();
  const { activeProject } = useProject();
  const projectHeaders = useProjectHeaders();
  // Full workspace headers (project + environment + sprint) — passed to the
  // create/edit dialog so new requirements are stamped with active env/sprint.
  const workspaceHeaders = useWorkspaceHeaders();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setTotal] = useState(0);
  const [summary, setSummary] = useState<CoverageSummary | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');

  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRequirement, setSelectedRequirement] = useState<Requirement | null>(null);

  // Keys just imported from Jira — surfaced as a "Recently Imported" banner so
  // the user gets immediate feedback on what landed.
  const [recentlyImported, setRecentlyImported] = useState<{ key: string; title: string }[]>([]);

  // Dropdown state for "New Requirement" split button
  const [newReqDropdownOpen, setNewReqDropdownOpen] = useState(false);

  const fetchRequirements = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (categoryFilter) params.append('category', categoryFilter);
      if (priorityFilter) params.append('priority', priorityFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (sourceFilter) params.append('source', sourceFilter);

      const response = await fetch(`/api/requirements?${params.toString()}`, {
        headers: projectHeaders,
      });
      const data = await response.json();
      if (data.success) {
        setRequirements(data.data || []);
        setTotal(data.total || 0);
      } else {
        toast.error(data.error || 'Failed to load requirements');
      }
    } catch (error) {
      console.error('Failed to fetch requirements:', error);
      toast.error('Failed to load requirements');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, categoryFilter, priorityFilter, statusFilter, sourceFilter, activeProject?.id]);

  const fetchSummary = useCallback(async () => {
    try {
      const response = await fetch('/api/requirements/coverage-summary', {
        headers: projectHeaders,
      });
      const data = await response.json();
      if (data.success) setSummary(data.data);
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProject?.id]);

  useEffect(() => {
    fetchRequirements();
    fetchSummary();
  }, [fetchRequirements, fetchSummary]);

  // Click-outside handler for "New Requirement" dropdown
  useEffect(() => {
    if (!newReqDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.new-req-dropdown')) {
        setNewReqDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [newReqDropdownOpen]);

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/requirements/${id}`, {
        method: 'DELETE',
        headers: projectHeaders,
      });
      if (response.ok) {
        toast.success('Requirement deleted');
        fetchRequirements();
        fetchSummary();
        setDeleteDialogOpen(false);
        setSelectedRequirement(null);
      } else {
        throw new Error('Delete failed');
      }
    } catch (error) {
      toast.error('Failed to delete requirement');
    }
  };

  const getCoverageColor = (percentage: number) => {
    if (percentage === 0) return 'bg-slate-500';
    if (percentage <= 33) return 'bg-yellow-500';
    if (percentage <= 66) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getCoverageTextColor = (percentage: number) => {
    if (percentage === 0) return 'text-slate-400';
    if (percentage <= 33) return 'text-yellow-400';
    if (percentage <= 66) return 'text-blue-400';
    return 'text-green-400';
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { color: string; icon: any }> = {
      Passed: { color: 'bg-green-500/10 text-green-400 border-green-500/20', icon: CheckCircle },
      Failed: { color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: XCircle },
      'In Progress': { color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: Clock },
      'Not Tested': { color: 'bg-slate-500/10 text-slate-400 border-slate-500/20', icon: AlertCircle },
    };
    const config = configs[status] || configs['Not Tested'];
    const Icon = config.icon;
    return (
      <Badge variant="outline" className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {status || 'Not Tested'}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      Critical: 'bg-red-500/10 text-red-400 border-red-500/20',
      High: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      Medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      Low: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    };
    return (
      <Badge variant="outline" className={colors[priority] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'}>
        {priority || '—'}
      </Badge>
    );
  };

  // Source badge: [Jira] AUTH-123 (links to Jira) or [Manual] REQ-001
  const getSourceBadge = (req: Requirement) => {
    const source = (req.source || 'manual').toLowerCase();
    if (source === 'jira') {
      const key = req.metadata?.jira?.key || req.source_id || 'Jira';
      const url = req.metadata?.jira?.url;
      const badge = (
        <Badge
          variant="outline"
          className="bg-blue-500/10 text-blue-300 border-blue-500/30 font-mono text-xs"
        >
          Jira · {key}
          {url && <ExternalLink className="h-3 w-3 ml-1" />}
        </Badge>
      );
      return url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          title="Open in Jira"
        >
          {badge}
        </a>
      ) : (
        badge
      );
    }
    return (
      <Badge variant="outline" className="bg-slate-500/10 text-slate-300 border-slate-600 text-xs">
        Manual
      </Badge>
    );
  };

  // Sync status badge — only meaningful for externally-sourced requirements.
  const getSyncBadge = (req: Requirement) => {
    if ((req.source || 'manual').toLowerCase() === 'manual') {
      return <span className="text-slate-600 text-xs">—</span>;
    }
    const status = (req.sync_status || 'synced').toLowerCase();
    const configs: Record<string, { label: string; color: string; icon: any }> = {
      synced: { label: 'Synced', color: 'bg-green-500/10 text-green-400 border-green-500/20', icon: CheckCircle },
      out_of_date: { label: 'Out of Date', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: Clock },
      modified: { label: 'Modified', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: AlertCircle },
    };
    const config = configs[status] || configs.synced;
    const Icon = config.icon;
    return (
      <Badge variant="outline" className={`${config.color} text-xs`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const coveredPct =
    summary && summary.total > 0 ? Math.round((summary.covered / summary.total) * 100) : 0;

  return (
    <div className="p-8 space-y-6">
      {/* Header — information-oriented: the page is the front door to the platform */}
      <div className="flex justify-between items-start gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-white">Requirements</h1>
          {/* Live stat strip — real numbers from the coverage summary (accurate
              under any filter because they're computed server-side). */}
          <div className="flex items-center flex-wrap gap-x-5 gap-y-1 mt-2 text-sm">
            <span className="text-slate-300">
              <span className="font-semibold text-white">{(summary?.total ?? 0).toLocaleString()}</span>{' '}
              <span className="text-slate-400">Requirements</span>
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400">
              Imported{' '}
              <span className="font-medium text-blue-300">
                {(summary?.imported_count ?? 0).toLocaleString()}
              </span>
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400">
              Manual{' '}
              <span className="font-medium text-violet-300">
                {(summary?.manual_count ?? 0).toLocaleString()}
              </span>
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400">
              Coverage{' '}
              <span className={`font-medium ${getCoverageTextColor(summary?.avg_coverage ?? 0)}`}>
                {summary?.avg_coverage ?? 0}%
              </span>
            </span>
            {summary?.imported_count ? (
              <>
                <span className="text-slate-600">·</span>
                <span className="text-slate-400 inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-slate-500" />
                  Last sync{' '}
                  <span className="font-medium text-slate-300">
                    {formatRelativeTime(summary?.last_synced_at ?? null)}
                  </span>
                </span>
              </>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              fetchRequirements();
              fetchSummary();
            }}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {/* "Add Requirements" — a Requirement Source Hub. Manual + Jira are
              live; other sources are on the roadmap and clearly marked "Soon"
              (disabled) rather than faked. */}
          <div className="relative new-req-dropdown">
            <div className="flex">
              <Button onClick={() => setCreateDialogOpen(true)} className="rounded-r-none">
                <Plus className="h-4 w-4 mr-2" />
                Add Requirements
              </Button>
              <button
                type="button"
                aria-label="More requirement sources"
                className="h-full px-2 bg-violet-600 hover:bg-violet-700 text-white rounded-r-md border-l border-violet-500/30 transition-colors"
                onClick={() => setNewReqDropdownOpen(!newReqDropdownOpen)}
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
            {newReqDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-md shadow-lg bg-[#1e293b] border border-slate-700 z-50 overflow-hidden">
                <div className="px-4 pt-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Create
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCreateDialogOpen(true);
                    setNewReqDropdownOpen(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-700/50 flex items-start gap-3 transition-colors"
                >
                  <FileText className="h-4 w-4 text-violet-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-medium text-white">Create Manually</div>
                    <div className="text-xs text-slate-400 mt-0.5">Write a new requirement from scratch</div>
                  </div>
                </button>
                <div className="px-4 pt-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 border-t border-slate-700/50 mt-1">
                  Import from source
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setImportDialogOpen(true);
                    setNewReqDropdownOpen(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-700/50 flex items-start gap-3 transition-colors"
                >
                  <Download className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-medium text-white">Import from Jira</div>
                    <div className="text-xs text-slate-400 mt-0.5">Sync existing Jira issues to this project</div>
                  </div>
                </button>
                {/* Roadmap sources — clearly disabled, not faked */}
                {[
                  { label: 'Import from Azure DevOps', desc: 'Sync work items & user stories' },
                  { label: 'Import from Linear', desc: 'Sync Linear issues' },
                  { label: 'Upload Excel / CSV', desc: 'Bulk import from a spreadsheet' },
                  { label: 'Import from API', desc: 'Push requirements programmatically' },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="w-full text-left px-4 py-2.5 text-sm flex items-start gap-3 opacity-50 cursor-not-allowed"
                    title="Coming soon"
                  >
                    <GitBranch className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <div className="font-medium text-slate-300 flex items-center gap-2">
                        {s.label}
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-400/80 bg-amber-400/10 px-1.5 py-0.5 rounded">
                          Soon
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Coverage Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-6 bg-[#1a1f2e] border-slate-700">
            <div className="text-sm text-slate-400 mb-1">Total Requirements</div>
            <div className="text-3xl font-bold text-white">{summary.total || 0}</div>
          </Card>
          <Card className="p-6 bg-[#1a1f2e] border-slate-700">
            <div className="text-sm text-slate-400 mb-1">Covered</div>
            <div className="text-3xl font-bold text-green-400">
              {summary.covered || 0}
              <span className="text-lg text-slate-400 ml-2">({coveredPct}%)</span>
            </div>
          </Card>
          <Card className="p-6 bg-[#1a1f2e] border-slate-700">
            <div className="text-sm text-slate-400 mb-1">Passed</div>
            <div className="text-3xl font-bold text-green-400">{summary.passed || 0}</div>
          </Card>
          <Card className="p-6 bg-[#1a1f2e] border-slate-700">
            <div className="text-sm text-slate-400 mb-1">Gaps</div>
            <div className="text-3xl font-bold text-orange-400">{summary.not_covered || 0}</div>
          </Card>
        </div>
      )}

      {/* Recently Imported — immediate feedback after a Jira import */}
      {recentlyImported.length > 0 && (
        <Card className="p-4 bg-green-500/5 border-green-500/30">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />
                <span className="text-sm font-semibold text-green-300">
                  Recently Imported ({recentlyImported.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {recentlyImported.map((r) => (
                  <Badge
                    key={r.key}
                    variant="outline"
                    className="text-green-200 border-green-500/40 bg-green-500/10 max-w-xs truncate"
                    title={`${r.key} ${r.title}`}
                  >
                    {r.key}
                    {r.title ? <span className="text-green-300/70"> · {r.title}</span> : null}
                  </Badge>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setRecentlyImported([])}
              className="text-slate-400 hover:text-slate-200 shrink-0"
              aria-label="Dismiss"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card className="p-4 bg-[#1a1f2e] border-slate-700">
        <div className="flex gap-4 flex-col md:flex-row">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search requirements..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-4 py-2 bg-[#0f172a] border border-slate-700 rounded-lg text-sm text-slate-200"
          >
            <option value="">All Sources</option>
            <option value="manual">Manual</option>
            <option value="jira">Jira</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 bg-[#0f172a] border border-slate-700 rounded-lg text-sm text-slate-200"
          >
            <option value="">All Categories</option>
            <option value="Authentication">Authentication</option>
            <option value="Payment">Payment</option>
            <option value="UI">UI</option>
            <option value="API">API</option>
            <option value="Performance">Performance</option>
            <option value="Security">Security</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-4 py-2 bg-[#0f172a] border border-slate-700 rounded-lg text-sm text-slate-200"
          >
            <option value="">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-[#0f172a] border border-slate-700 rounded-lg text-sm text-slate-200"
          >
            <option value="">All Statuses</option>
            <option value="Not Tested">Not Tested</option>
            <option value="In Progress">In Progress</option>
            <option value="Passed">Passed</option>
            <option value="Failed">Failed</option>
          </select>
        </div>
      </Card>

      {/* Requirements Table */}
      <Card className="bg-[#1a1f2e] border-slate-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left p-4 font-semibold text-slate-300">ID</th>
                <th className="text-left p-4 font-semibold text-slate-300">Source</th>
                <th className="text-left p-4 font-semibold text-slate-300">Title</th>
                <th className="text-left p-4 font-semibold text-slate-300">Category</th>
                <th className="text-left p-4 font-semibold text-slate-300">Priority</th>
                <th className="text-left p-4 font-semibold text-slate-300">Status</th>
                <th className="text-left p-4 font-semibold text-slate-300">Coverage</th>
                <th className="text-left p-4 font-semibold text-slate-300">Tests</th>
                <th className="text-left p-4 font-semibold text-slate-300">Sync</th>
                <th className="text-right p-4 font-semibold text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center p-8 text-slate-400">
                    Loading requirements...
                  </td>
                </tr>
              ) : requirements.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center p-8">
                    <div className="flex flex-col items-center gap-3">
                      <AlertCircle className="h-12 w-12 text-slate-500" />
                      <p className="text-slate-400">No requirements found</p>
                      <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Requirement
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                requirements.map((req) => (
                  <Fragment key={req.id}>
                  <tr className="border-b border-slate-700 hover:bg-slate-800/50">
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setExpandedId((prev) => (prev === req.id ? null : req.id))}
                          className="text-slate-500 hover:text-violet-400"
                          title="Toggle traceability flow"
                          aria-label="Toggle traceability flow"
                        >
                          {expandedId === req.id ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                        <span className="font-mono text-sm text-violet-400">{req.requirement_id}</span>
                      </div>
                    </td>
                    <td className="p-4">{getSourceBadge(req)}</td>
                    <td className="p-4">
                      <div className="font-medium text-white">{req.title}</div>
                      {req.description && (
                        <div className="text-sm text-slate-400 mt-1 truncate max-w-md">
                          {req.description}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <Badge variant="outline" className="text-slate-300 border-slate-600">
                        {req.category || 'Uncategorized'}
                      </Badge>
                    </td>
                    <td className="p-4">{getPriorityBadge(req.priority)}</td>
                    <td className="p-4">{getStatusBadge(req.status)}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getCoverageColor(req.coverage_percentage)}`}
                            style={{ width: `${req.coverage_percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-slate-200">
                          {req.coverage_percentage}%
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-slate-400">
                        {req.test_case_count} TC / {req.script_count} Scripts
                      </div>
                    </td>
                    <td className="p-4">{getSyncBadge(req)}</td>
                    <td className="p-4">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-violet-300 hover:bg-violet-500/10"
                          title="Generate test cases for this requirement"
                          onClick={() => {
                            // Stash the full requirement so the Test Case Lab can
                            // pre-fill ALL relevant fields (not just the title).
                            // sessionStorage handles long description/AC text that
                            // would be impractical to pass via the URL.
                            try {
                              sessionStorage.setItem(
                                'tcl:prefillRequirement',
                                JSON.stringify({
                                  id: req.id,
                                  requirement_id: req.requirement_id,
                                  title: req.title,
                                  description: req.description,
                                  acceptance_criteria: req.acceptance_criteria,
                                  category: req.category,
                                  priority: req.priority,
                                })
                              );
                            } catch {
                              /* sessionStorage unavailable — fall back to query params */
                            }
                            router.push(
                              `/test-coverage?requirementId=${req.id}&reqTitle=${encodeURIComponent(req.title)}`
                            );
                          }}
                        >
                          <FlaskConical className="h-4 w-4 mr-1" />
                          Generate Tests
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedRequirement(req);
                            setEditDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedRequirement(req);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === req.id && (
                    <tr className="border-b border-slate-700 bg-slate-900/40">
                      <td colSpan={10} className="px-4 pb-4 pt-1">
                        {req.source?.toLowerCase() === 'jira' && req.metadata?.jira && (
                          <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1.5 rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-xs">
                            {req.metadata.jira.key && (
                              <span className="text-slate-400">
                                Key:{' '}
                                {req.metadata.jira.url ? (
                                  <a
                                    href={req.metadata.jira.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-mono text-blue-300 hover:underline"
                                  >
                                    {req.metadata.jira.key}
                                  </a>
                                ) : (
                                  <span className="font-mono text-blue-300">{req.metadata.jira.key}</span>
                                )}
                              </span>
                            )}
                            {req.metadata.jira.issueType && (
                              <span className="text-slate-400">
                                Type: <span className="text-slate-200">{req.metadata.jira.issueType}</span>
                              </span>
                            )}
                            {req.metadata.jira.status && (
                              <span className="text-slate-400">
                                Jira Status: <span className="text-slate-200">{req.metadata.jira.status}</span>
                              </span>
                            )}
                            {req.metadata.jira.sprint && (
                              <span className="text-slate-400">
                                Sprint: <span className="text-slate-200">{req.metadata.jira.sprint}</span>
                              </span>
                            )}
                            {req.metadata.jira.assignee && (
                              <span className="text-slate-400">
                                Assignee: <span className="text-slate-200">{req.metadata.jira.assignee}</span>
                              </span>
                            )}
                            {req.metadata.jira.updated && (
                              <span className="text-slate-400">
                                Updated:{' '}
                                <span className="text-slate-200">
                                  {new Date(req.metadata.jira.updated).toLocaleDateString()}
                                </span>
                              </span>
                            )}
                          </div>
                        )}
                        <RequirementFlow
                          testCaseCount={req.test_case_count}
                          scriptCount={req.script_count}
                          executionCount={req.execution_count}
                          coveragePercentage={req.coverage_percentage}
                        />
                      </td>
                    </tr>
                  )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Dialogs */}
      <RequirementDialog
        open={createDialogOpen}
        onClose={(refresh: boolean) => {
          setCreateDialogOpen(false);
          if (refresh) {
            fetchRequirements();
            fetchSummary();
          }
        }}
        requirement={null}
        projectHeaders={workspaceHeaders}
      />

      <JiraImportDialog
        open={importDialogOpen}
        onClose={(refresh: boolean, imported) => {
          setImportDialogOpen(false);
          if (imported && imported.length) setRecentlyImported(imported);
          if (refresh) {
            fetchRequirements();
            fetchSummary();
          }
        }}
        workspaceHeaders={workspaceHeaders}
      />

      <RequirementDialog
        open={editDialogOpen}
        onClose={(refresh: boolean) => {
          setEditDialogOpen(false);
          setSelectedRequirement(null);
          if (refresh) {
            fetchRequirements();
            fetchSummary();
          }
        }}
        requirement={selectedRequirement}
        projectHeaders={projectHeaders}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setSelectedRequirement(null);
        }}
        onConfirm={() => {
          if (selectedRequirement) handleDelete(selectedRequirement.id);
        }}
        requirementId={selectedRequirement?.requirement_id}
      />
    </div>
  );
}
