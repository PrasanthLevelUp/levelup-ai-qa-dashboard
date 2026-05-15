'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Play,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  GitBranch,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Zap,
  FileCode,
} from 'lucide-react';

interface JobResult {
  totalTests?: number;
  failed?: number;
  healed?: number;
  strategy?: string;
  tokensUsed?: number;
  message?: string;
  testResults?: {
    exitCode?: number;
    durationMs?: number;
    stdout?: string;
    stderr?: string;
  };
  healingActions?: Array<{
    testName?: string;
    failedLocator?: string;
    healedLocator?: string;
    strategy?: string;
    success?: boolean;
  }>;
}

interface Job {
  id: string;
  repositoryId: string;
  repositoryUrl: string | null;
  branch: string | null;
  commitSha: string | null;
  status: string;
  progress: string | null;
  createdAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  result: string | null;
  resultData: JobResult | null;
  error: string | null;
}

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; bg: string; label: string }> = {
  completed: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', label: 'Completed' },
  running: { icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', label: 'Running' },
  queued: { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', label: 'Queued' },
  failed: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', label: 'Failed' },
  error: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', label: 'Error' },
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.error;
}

function formatDuration(ms?: number) {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
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
      second: '2-digit',
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

function JobStatusBadge({ status }: { status: string }) {
  const config = getStatusConfig(status);
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.color}`}>
      <Icon size={12} className={status === 'running' ? 'animate-spin' : ''} />
      {config.label}
    </span>
  );
}

function JobResultSummary({ result, error }: { result: JobResult | null; error: string | null }) {
  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-400 text-xs">
        <AlertTriangle size={12} />
        <span className="truncate max-w-[300px]">{error}</span>
      </div>
    );
  }
  if (!result) return <span className="text-slate-500 text-xs">No results yet</span>;

  const hasInfraIssue = result.testResults?.exitCode === 254;
  const hasHealings = (result.healed ?? 0) > 0;
  const hasFailures = (result.failed ?? 0) > 0;

  if (hasInfraIssue) {
    return (
      <div className="flex items-center gap-2 text-amber-400 text-xs">
        <AlertTriangle size={12} />
        <span>Infrastructure issue — browser dependencies may be missing (exit code 254)</span>
      </div>
    );
  }

  if (hasHealings) {
    return (
      <div className="flex items-center gap-2 text-emerald-400 text-xs">
        <Zap size={12} />
        <span>{result.healed} healed / {result.failed} failed — {result.strategy} strategy — {result.tokensUsed} tokens</span>
      </div>
    );
  }

  if (hasFailures) {
    return (
      <div className="flex items-center gap-2 text-red-400 text-xs">
        <XCircle size={12} />
        <span>{result.failed} failures — healing unsuccessful</span>
      </div>
    );
  }

  if (result.message) {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-xs">
        <CheckCircle2 size={12} />
        <span>{result.message}</span>
      </div>
    );
  }

  return <span className="text-slate-500 text-xs">Tests passed — no healing needed</span>;
}

function ExpandedJobDetails({ job }: { job: Job }) {
  const result = job.resultData;
  return (
    <div className="px-4 pb-4 space-y-3">
      {/* Timing */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#0c1222] rounded-lg p-3">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Job ID</p>
          <p className="text-xs text-slate-300 font-mono">{job.id}</p>
        </div>
        <div className="bg-[#0c1222] rounded-lg p-3">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Started</p>
          <p className="text-xs text-slate-300">{formatTime(job.startedAt)}</p>
        </div>
        <div className="bg-[#0c1222] rounded-lg p-3">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Completed</p>
          <p className="text-xs text-slate-300">{formatTime(job.completedAt)}</p>
        </div>
        <div className="bg-[#0c1222] rounded-lg p-3">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Duration</p>
          <p className="text-xs text-slate-300">
            {job.startedAt && job.completedAt
              ? formatDuration(new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime())
              : '—'}
          </p>
        </div>
      </div>

      {/* Result details */}
      {result && (
        <div className="bg-[#0c1222] rounded-lg p-3">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Execution Details</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <div>
              <p className="text-[10px] text-slate-500">Tests</p>
              <p className="text-sm text-white font-semibold">{result.totalTests ?? '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500">Failed</p>
              <p className={`text-sm font-semibold ${(result.failed ?? 0) > 0 ? 'text-red-400' : 'text-slate-300'}`}>
                {result.failed ?? 0}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500">Healed</p>
              <p className={`text-sm font-semibold ${(result.healed ?? 0) > 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                {result.healed ?? 0}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500">Strategy</p>
              <p className="text-sm text-slate-300 font-semibold">{result.strategy || 'none'}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500">Exit Code</p>
              <p className={`text-sm font-semibold ${result.testResults?.exitCode === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {result.testResults?.exitCode ?? '—'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Healing Actions */}
      {result?.healingActions && result.healingActions.length > 0 && (
        <div className="bg-[#0c1222] rounded-lg p-3">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Healing Actions</p>
          <div className="space-y-2">
            {result.healingActions.map((action, i) => (
              <div key={i} className="flex items-center justify-between bg-[#1e293b] rounded p-2">
                <div className="flex items-center gap-2">
                  <FileCode size={12} className="text-slate-500" />
                  <span className="text-xs text-slate-300">{action.testName || 'Unknown test'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-500">{action.strategy}</span>
                  {action.success ? (
                    <CheckCircle2 size={12} className="text-emerald-400" />
                  ) : (
                    <XCircle size={12} className="text-red-400" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {job.error && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
          <p className="text-[10px] text-red-400 uppercase tracking-wider mb-1">Error</p>
          <p className="text-xs text-red-300 font-mono whitespace-pre-wrap">{job.error}</p>
        </div>
      )}

      {/* Infrastructure warning */}
      {result?.testResults?.exitCode === 254 && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={12} className="text-amber-400" />
            <p className="text-[10px] text-amber-400 uppercase tracking-wider font-semibold">Infrastructure Issue Detected</p>
          </div>
          <p className="text-xs text-amber-300/80 leading-relaxed">
            Exit code 254 indicates the test runner (Playwright) could not execute. This is typically caused by missing
            Chromium browser dependencies in the deployment environment. The healing engine was never triggered because
            no test artifacts were collected.
          </p>
        </div>
      )}
    </div>
  );
}

export function JobsClient() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggerLoading, setTriggerLoading] = useState(false);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [triggerResult, setTriggerResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [repos, setRepos] = useState<Array<{ id: string; name: string; url: string; branch: string }>>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>('');

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/jobs');
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRepos = useCallback(async () => {
    try {
      const res = await fetch('/api/repos');
      if (!res.ok) return; // Backend may be unavailable
      const data = await res.json();
      const repoList = data.repositories || [];
      setRepos(repoList);
      if (repoList.length > 0 && !selectedRepo) {
        setSelectedRepo(repoList[0].url);
      }
    } catch {
      // Backend unavailable - repos won't be loaded
    }
  }, [selectedRepo]);

  useEffect(() => {
    fetchJobs();
    fetchRepos();
    const interval = setInterval(fetchJobs, 10000);
    return () => clearInterval(interval);
  }, [fetchJobs, fetchRepos]);

  const triggerHealing = async () => {
    if (!selectedRepo) return;
    setTriggerLoading(true);
    setTriggerResult(null);

    try {
      const repo = repos.find(r => r.url === selectedRepo);
      const res = await fetch('/api/jobs/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json',
          'Authorization': 'Bearer levelup_dev_test_key_2026',
          'x-api-key': 'levelup_dev_test_key_2026'
         },
        body: JSON.stringify({
          repository: selectedRepo,
          branch: repo?.branch || 'main',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setTriggerResult({ type: 'success', message: `Job ${data.jobId} triggered successfully!` });
        // Refresh jobs list after short delay
        setTimeout(fetchJobs, 2000);
      } else {
        setTriggerResult({ type: 'error', message: data.error || 'Failed to trigger job' });
      }
    } catch (err) {
      setTriggerResult({ type: 'error', message: 'Network error — backend may be unavailable' });
    } finally {
      setTriggerLoading(false);
    }
  };

  const completedJobs = jobs.filter(j => j.status === 'completed').length;
  const failedJobs = jobs.filter(j => j.status === 'failed' || j.status === 'error').length;
  const infraIssueJobs = jobs.filter(j => j.resultData?.testResults?.exitCode === 254).length;
  const healedJobs = jobs.filter(j => (j.resultData?.healed ?? 0) > 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-display">Healing Jobs</h1>
          <p className="text-sm text-slate-400 mt-1">Monitor test execution and healing job pipeline</p>
        </div>
        <button
          onClick={fetchJobs}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1e293b] border border-[#334155] text-slate-300 hover:text-white hover:bg-[#334155] transition-colors text-sm self-start"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Trigger Panel */}
      <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
            <Play size={16} className="text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Trigger Healing Job</h2>
            <p className="text-xs text-slate-500">Run tests and auto-heal any failures</p>
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <select
              value={selectedRepo}
              onChange={(e) => setSelectedRepo(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#0c1222] border border-[#334155] text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {repos.length === 0 && <option value="">No repositories configured</option>}
              {repos.map((repo) => (
                <option key={repo.id} value={repo.url}>
                  {repo.name} ({repo.branch})
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={triggerHealing}
            disabled={triggerLoading || !selectedRepo}
            className="flex items-center justify-center gap-2 px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
          >
            {triggerLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Play size={14} />
            )}
            {triggerLoading ? 'Triggering...' : 'Run Healing'}
          </button>
        </div>
        {triggerResult && (
          <div className={`mt-3 px-3 py-2 rounded-lg text-xs ${
            triggerResult.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}>
            {triggerResult.message}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-4">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Total Jobs</p>
          <p className="text-2xl font-bold text-white">{jobs.length}</p>
        </div>
        <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-4">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Completed</p>
          <p className="text-2xl font-bold text-emerald-400">{completedJobs}</p>
        </div>
        <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-4">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Healed</p>
          <p className="text-2xl font-bold text-blue-400">{healedJobs}</p>
        </div>
        <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-4">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Infra Issues</p>
          <p className={`text-2xl font-bold ${infraIssueJobs > 0 ? 'text-amber-400' : 'text-slate-400'}`}>{infraIssueJobs}</p>
        </div>
      </div>

      {/* Jobs List */}
      <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#2a3040]">
          <h3 className="text-sm font-semibold text-white">Job History</h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-emerald-400" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-[#0c1222] flex items-center justify-center mb-3">
              <Zap size={20} className="text-slate-600" />
            </div>
            <p className="text-sm text-slate-400">No healing jobs yet</p>
            <p className="text-xs text-slate-500 mt-1">Trigger your first healing job above to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-[#2a3040]">
            {jobs.map((job) => (
              <div key={job.id}>
                <div
                  className="px-4 py-3 hover:bg-[#0c1222]/50 transition-colors cursor-pointer"
                  onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <JobStatusBadge status={job.status} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-white font-medium truncate">
                            {job.repositoryUrl ? job.repositoryUrl.replace('https://github.com/', '') : job.repositoryId}
                          </span>
                          {job.branch && (
                            <span className="flex items-center gap-1 text-[10px] text-slate-500">
                              <GitBranch size={10} />
                              {job.branch}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5">
                          <JobResultSummary result={job.resultData} error={job.error} />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-3">
                      <span className="text-xs text-slate-500 hidden md:block">
                        {formatTime(job.startedAt || job.completedAt)}
                      </span>
                      {job.resultData?.testResults?.durationMs && (
                        <span className="text-xs text-slate-500 hidden md:block">
                          {formatDuration(job.resultData.testResults.durationMs)}
                        </span>
                      )}
                      {expandedJob === job.id ? (
                        <ChevronUp size={14} className="text-slate-500" />
                      ) : (
                        <ChevronDown size={14} className="text-slate-500" />
                      )}
                    </div>
                  </div>
                </div>
                {expandedJob === job.id && <ExpandedJobDetails job={job} />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
