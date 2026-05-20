'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Play, RefreshCw, Clock, CheckCircle2, XCircle, Loader2, AlertTriangle,
  GitBranch, ChevronDown, ChevronUp, Zap, FileCode, StopCircle, Plus,
  Trash2, X, FolderGit2,
} from 'lucide-react';

/* ─── Types ─── */
interface JobResult {
  totalTests?: number;
  failed?: number;
  healed?: number;
  strategy?: string;
  tokensUsed?: number;
  message?: string;
  error?: string;
  testResults?: { exitCode?: number; durationMs?: number };
  healingActions?: Array<{
    testName?: string; failedLocator?: string; healedLocator?: string;
    strategy?: string; success?: boolean;
  }>;
}

interface Job {
  id: string; repositoryId: string; repositoryUrl: string | null;
  branch: string | null; commitSha: string | null; status: string;
  progress: string | null; createdAt: string | null; startedAt: string | null;
  completedAt: string | null; result: string | null; resultData: JobResult | null;
  error: string | null;
}

interface BackendStatus {
  jobId: string; status: string; progress: string;
}

interface Repo {
  id: string; name: string; url: string; branch: string; enabled: boolean;
}

/* ─── Status config ─── */
const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; bg: string; label: string }> = {
  completed: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', label: 'Completed' },
  running:   { icon: Loader2,      color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20',    label: 'Running' },
  pending:   { icon: Clock,        color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20',  label: 'Queued' },
  queued:    { icon: Clock,        color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20',  label: 'Queued' },
  failed:    { icon: XCircle,      color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20',      label: 'Failed' },
  cancelled: { icon: StopCircle,   color: 'text-slate-400',   bg: 'bg-slate-500/10 border-slate-500/20',  label: 'Cancelled' },
  error:     { icon: AlertTriangle,color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20',      label: 'Error' },
};
function getStatusConfig(s: string) { return STATUS_CONFIG[s] || STATUS_CONFIG.error; }
function fmtDur(ms?: number) { if (!ms) return '—'; return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`; }
function fmtTime(d: string | null) {
  if (!d) return '—';
  try { return new Date(d).toLocaleString('en-IN', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:true }); } catch { return d; }
}

/* ─── Pipeline Steps (for live progress) ─── */
const PIPELINE_STEPS = [
  { key: 'clone',   label: 'Clone Repository',     match: /clon|pull/i },
  { key: 'install', label: 'Install Dependencies',  match: /install|depend/i },
  { key: 'test',    label: 'Run Tests',             match: /run.*test|execut/i },
  { key: 'collect', label: 'Collect Artifacts',      match: /collect|artifact/i },
  { key: 'analyze', label: 'Analyze & Heal',         match: /analy|heal/i },
  { key: 'verify',  label: 'Verify Fix',             match: /rerun|verif/i },
  { key: 'done',    label: 'Complete',               match: /complete|done/i },
];
function getActiveStep(progress: string | null): number {
  if (!progress) return -1;
  for (let i = PIPELINE_STEPS.length - 1; i >= 0; i--) {
    if (PIPELINE_STEPS[i].match.test(progress)) return i;
  }
  return 0;
}

/* ─── Live Progress Bar ─── */
function LiveProgressBar({ progress, status }: { progress: string | null; status: string }) {
  const activeIdx = getActiveStep(progress);
  const isRunning = status === 'running' || status === 'pending';
  if (!isRunning && status !== 'completed') return null;

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-1.5">
        {PIPELINE_STEPS.slice(0, -1).map((step, i) => {
          const isDone = i < activeIdx || status === 'completed';
          const isActive = i === activeIdx && isRunning;
          return (
            <div key={step.key} className="flex items-center gap-1.5 flex-1">
              <div className={`h-1.5 rounded-full flex-1 transition-all duration-500 ${
                isDone ? 'bg-emerald-500' : isActive ? 'bg-blue-500 animate-pulse' : 'bg-slate-700'
              }`} />
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        {isRunning && <Loader2 size={12} className="animate-spin text-blue-400" />}
        <p className="text-xs text-slate-400">
          {status === 'completed' ? '✓ Pipeline complete' : progress || 'Starting...'}
        </p>
      </div>
    </div>
  );
}

/* ─── Job Status Badge ─── */
function JobStatusBadge({ status }: { status: string }) {
  const c = getStatusConfig(status);
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${c.bg} ${c.color}`}>
      <Icon size={12} className={status === 'running' ? 'animate-spin' : ''} />
      {c.label}
    </span>
  );
}

/* ─── Result Summary ─── */
function JobResultSummary({ result, error }: { result: JobResult | null; error: string | null }) {
  if (error) return (
    <div className="flex items-center gap-2 text-red-400 text-xs">
      <AlertTriangle size={12} /><span className="truncate max-w-[300px]">{error}</span>
    </div>
  );
  if (!result) return <span className="text-slate-500 text-xs">No results yet</span>;
  if ((result.healed ?? 0) > 0) return (
    <div className="flex items-center gap-2 text-emerald-400 text-xs">
      <Zap size={12} /><span>{result.healed} healed / {result.failed} failed — {result.strategy} — {result.tokensUsed} tokens</span>
    </div>
  );
  if ((result.failed ?? 0) > 0) return (
    <div className="flex items-center gap-2 text-red-400 text-xs">
      <XCircle size={12} /><span>{result.failed} failures — healing unsuccessful</span>
    </div>
  );
  if (result.message) return (
    <div className="flex items-center gap-2 text-slate-400 text-xs">
      <CheckCircle2 size={12} /><span>{result.message}</span>
    </div>
  );
  return <span className="text-slate-500 text-xs">Tests passed — no healing needed</span>;
}

/* ─── Expanded Job Details ─── */
function ExpandedJobDetails({ job }: { job: Job }) {
  const r = job.resultData;
  return (
    <div className="px-4 pb-4 space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[{ l: 'Job ID', v: job.id }, { l: 'Started', v: fmtTime(job.startedAt) }, { l: 'Completed', v: fmtTime(job.completedAt) },
          { l: 'Duration', v: job.startedAt && job.completedAt ? fmtDur(new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime()) : '—' }
        ].map(({ l, v }) => (
          <div key={l} className="bg-[#0c1222] rounded-lg p-3">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{l}</p>
            <p className="text-xs text-slate-300 font-mono truncate">{v}</p>
          </div>
        ))}
      </div>
      {r && (
        <div className="bg-[#0c1222] rounded-lg p-3">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Execution Details</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <div><p className="text-[10px] text-slate-500">Tests</p><p className="text-sm text-white font-semibold">{r.totalTests ?? '—'}</p></div>
            <div><p className="text-[10px] text-slate-500">Failed</p><p className={`text-sm font-semibold ${(r.failed ?? 0) > 0 ? 'text-red-400' : 'text-slate-300'}`}>{r.failed ?? 0}</p></div>
            <div><p className="text-[10px] text-slate-500">Healed</p><p className={`text-sm font-semibold ${(r.healed ?? 0) > 0 ? 'text-emerald-400' : 'text-slate-300'}`}>{r.healed ?? 0}</p></div>
            <div><p className="text-[10px] text-slate-500">Strategy</p><p className="text-sm text-slate-300 font-semibold">{r.strategy || 'none'}</p></div>
            <div><p className="text-[10px] text-slate-500">Exit Code</p><p className={`text-sm font-semibold ${r.testResults?.exitCode === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>{r.testResults?.exitCode ?? '—'}</p></div>
          </div>
        </div>
      )}
      {r?.healingActions && r.healingActions.length > 0 && (
        <div className="bg-[#0c1222] rounded-lg p-3">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Healing Actions</p>
          <div className="space-y-2">
            {r.healingActions.map((a, i) => (
              <div key={i} className="flex items-center justify-between bg-[#1e293b] rounded p-2">
                <div className="flex items-center gap-2"><FileCode size={12} className="text-slate-500" /><span className="text-xs text-slate-300">{a.testName || 'Unknown'}</span></div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-500">{a.strategy}</span>
                  {a.success ? <CheckCircle2 size={12} className="text-emerald-400" /> : <XCircle size={12} className="text-red-400" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {job.error && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
          <p className="text-[10px] text-red-400 uppercase tracking-wider mb-1">Error</p>
          <p className="text-xs text-red-300 font-mono whitespace-pre-wrap">{job.error}</p>
        </div>
      )}
      {r?.message && !job.error && (
        <div className="bg-slate-500/5 border border-slate-500/20 rounded-lg p-3">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Message</p>
          <p className="text-xs text-slate-300">{r.message}</p>
        </div>
      )}
    </div>
  );
}

/* ─── Add Repo Dialog ─── */
function AddRepoDialog({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [branch, setBranch] = useState('main');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!url) { setError('Repository URL is required'); return; }
    const repoName = name || url.replace(/.*\//, '').replace(/\.git$/, '');
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/repos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, name: repoName, branch, enabled: true }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to add repo');
      }
      onAdded();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-white">Add Repository</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Repository URL *</label>
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://github.com/org/repo"
              className="w-full px-3 py-2 rounded-lg bg-[#0c1222] border border-[#334155] text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Name (auto-detected from URL)</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="my-repo"
              className="w-full px-3 py-2 rounded-lg bg-[#0c1222] border border-[#334155] text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Branch</label>
            <input value={branch} onChange={e => setBranch(e.target.value)} placeholder="main"
              className="w-full px-3 py-2 rounded-lg bg-[#0c1222] border border-[#334155] text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500" />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white transition-colors">Cancel</button>
            <button onClick={handleSubmit} disabled={saving}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium disabled:opacity-50 transition-colors">
              {saving ? 'Adding...' : 'Add Repository'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export function JobsClient() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggerLoading, setTriggerLoading] = useState(false);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [triggerResult, setTriggerResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<string>('main');
  const [showAddRepo, setShowAddRepo] = useState(false);
  const [cancellingJob, setCancellingJob] = useState<string | null>(null);
  const [liveProgress, setLiveProgress] = useState<Record<string, string>>({});
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/jobs');
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    } finally { setLoading(false); }
  }, []);

  const fetchRepos = useCallback(async () => {
    try {
      const res = await fetch('/api/repos');
      if (!res.ok) return;
      const data = await res.json();
      const list: Repo[] = data.repositories || [];
      setRepos(list);
      if (list.length > 0 && !selectedRepo) {
        setSelectedRepo(list[0].url);
        setSelectedBranch(list[0].branch || 'main');
      }
    } catch { /* backend unavailable */ }
  }, [selectedRepo]);

  /* Poll live progress for running jobs */
  const pollRunningJobs = useCallback(async () => {
    const running = jobs.filter(j => j.status === 'running' || j.status === 'pending');
    if (running.length === 0) return;

    for (const job of running) {
      try {
        const res = await fetch(`/api/jobs/${job.id}`);
        if (!res.ok) continue;
        const data = await res.json();
        const backendStatus: BackendStatus | null = data.backendStatus;
        if (backendStatus?.progress) {
          setLiveProgress(prev => ({ ...prev, [job.id]: backendStatus.progress }));
        }
        // If status changed, refresh all jobs
        if (data.job?.status && data.job.status !== job.status) {
          fetchJobs();
        }
      } catch { /* ignore */ }
    }
  }, [jobs, fetchJobs]);

  useEffect(() => {
    fetchJobs(); fetchRepos();
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, [fetchJobs, fetchRepos]);

  useEffect(() => {
    const hasRunning = jobs.some(j => j.status === 'running' || j.status === 'pending');
    if (hasRunning) {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(pollRunningJobs, 3000);
      pollRunningJobs();
    } else {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [jobs, pollRunningJobs]);

  const triggerHealing = async () => {
    if (!selectedRepo) return;
    setTriggerLoading(true); setTriggerResult(null);
    try {
      const res = await fetch('/api/jobs/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer levelup_dev_test_key_2026', 'x-api-key': 'levelup_dev_test_key_2026' },
        body: JSON.stringify({ repository: selectedRepo, branch: selectedBranch }),
      });
      const data = await res.json();
      if (res.ok) {
        setTriggerResult({ type: 'success', message: `Job ${data.jobId} triggered!` });
        setTimeout(fetchJobs, 1500);
      } else {
        setTriggerResult({ type: 'error', message: data.error || 'Failed to trigger' });
      }
    } catch { setTriggerResult({ type: 'error', message: 'Network error — backend may be unavailable' }); }
    finally { setTriggerLoading(false); }
  };

  const cancelJob = async (jobId: string) => {
    setCancellingJob(jobId);
    try {
      await fetch('/api/jobs/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
      setTimeout(fetchJobs, 1000);
    } catch { /* ignore */ }
    finally { setCancellingJob(null); }
  };

  const deleteRepo = async (repoId: string) => {
    try {
      await fetch(`/api/repos?id=${repoId}`, { method: 'DELETE' });
      fetchRepos();
    } catch { /* ignore */ }
  };

  const handleRepoChange = (url: string) => {
    setSelectedRepo(url);
    const repo = repos.find(r => r.url === url);
    setSelectedBranch(repo?.branch || 'main');
  };

  const completedJobs = jobs.filter(j => j.status === 'completed').length;
  const healedJobs = jobs.filter(j => (j.resultData?.healed ?? 0) > 0).length;
  const runningJobs = jobs.filter(j => j.status === 'running' || j.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-display">Healing Jobs</h1>
          <p className="text-sm text-slate-400 mt-1">Monitor test execution and healing pipeline</p>
        </div>
        <button onClick={fetchJobs} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1e293b] border border-[#334155] text-slate-300 hover:text-white hover:bg-[#334155] transition-colors text-sm self-start">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Trigger Panel */}
      <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
              <Play size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Trigger Healing Job</h2>
              <p className="text-xs text-slate-500">Run tests and auto-heal any failures</p>
            </div>
          </div>
          <button onClick={() => setShowAddRepo(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-[#334155] text-xs text-slate-400 hover:text-white hover:border-emerald-500/50 transition-colors">
            <Plus size={12} /> Add Repo
          </button>
        </div>

        {/* Repo selector + Branch + Run */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Repository</label>
            <select value={selectedRepo} onChange={e => handleRepoChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#0c1222] border border-[#334155] text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500">
              {repos.length === 0 && <option value="">No repositories configured</option>}
              {repos.map(r => <option key={r.id} value={r.url}>{r.name}</option>)}
            </select>
          </div>
          <div className="w-full md:w-36">
            <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Branch</label>
            <input value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#0c1222] border border-[#334155] text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
          </div>
          <div className="flex items-end">
            <button onClick={triggerHealing} disabled={triggerLoading || !selectedRepo}
              className="flex items-center justify-center gap-2 px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors">
              {triggerLoading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              {triggerLoading ? 'Triggering...' : 'Run Healing'}
            </button>
          </div>
        </div>

        {triggerResult && (
          <div className={`mt-3 px-3 py-2 rounded-lg text-xs ${
            triggerResult.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}>{triggerResult.message}</div>
        )}

        {/* Configured repos list */}
        {repos.length > 0 && (
          <div className="mt-4 border-t border-[#2a3040] pt-3">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Configured Repositories</p>
            <div className="space-y-1.5">
              {repos.map(r => (
                <div key={r.id} className="flex items-center justify-between bg-[#0c1222] rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FolderGit2 size={12} className="text-slate-500 flex-shrink-0" />
                    <span className="text-xs text-slate-300 truncate">{r.name}</span>
                    <span className="flex items-center gap-0.5 text-[10px] text-slate-500"><GitBranch size={9} />{r.branch}</span>
                  </div>
                  <button onClick={() => deleteRepo(r.id)} className="text-slate-600 hover:text-red-400 transition-colors p-1">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
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
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Running</p>
          <p className={`text-2xl font-bold ${runningJobs > 0 ? 'text-blue-400' : 'text-slate-400'}`}>{runningJobs}</p>
        </div>
        <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-4">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Completed</p>
          <p className="text-2xl font-bold text-emerald-400">{completedJobs}</p>
        </div>
        <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-4">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Healed</p>
          <p className="text-2xl font-bold text-blue-400">{healedJobs}</p>
        </div>
      </div>

      {/* Jobs List */}
      <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#2a3040]">
          <h3 className="text-sm font-semibold text-white">Job History</h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-emerald-400" /></div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-[#0c1222] flex items-center justify-center mb-3"><Zap size={20} className="text-slate-600" /></div>
            <p className="text-sm text-slate-400">No healing jobs yet</p>
            <p className="text-xs text-slate-500 mt-1">Trigger your first healing job above</p>
          </div>
        ) : (
          <div className="divide-y divide-[#2a3040]">
            {jobs.map(job => {
              const isRunning = job.status === 'running' || job.status === 'pending';
              const progress = liveProgress[job.id] || job.progress;
              return (
                <div key={job.id}>
                  <div className="px-4 py-3 hover:bg-[#0c1222]/50 transition-colors cursor-pointer"
                    onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <JobStatusBadge status={job.status} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-white font-medium truncate">
                              {job.repositoryUrl ? job.repositoryUrl.replace('https://github.com/', '') : job.repositoryId}
                            </span>
                            {job.branch && <span className="flex items-center gap-1 text-[10px] text-slate-500"><GitBranch size={10} />{job.branch}</span>}
                          </div>
                          <div className="mt-0.5"><JobResultSummary result={job.resultData} error={job.error} /></div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        {/* Cancel button for running jobs */}
                        {isRunning && (
                          <button
                            onClick={e => { e.stopPropagation(); cancelJob(job.id); }}
                            disabled={cancellingJob === job.id}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs transition-colors"
                          >
                            {cancellingJob === job.id ? <Loader2 size={10} className="animate-spin" /> : <StopCircle size={10} />}
                            Cancel
                          </button>
                        )}
                        <span className="text-xs text-slate-500 hidden md:block">{fmtTime(job.startedAt || job.createdAt)}</span>
                        {expandedJob === job.id ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
                      </div>
                    </div>
                    {/* Live progress bar for running jobs */}
                    {isRunning && <LiveProgressBar progress={progress} status={job.status} />}
                  </div>
                  {expandedJob === job.id && <ExpandedJobDetails job={job} />}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add repo dialog */}
      {showAddRepo && <AddRepoDialog onClose={() => setShowAddRepo(false)} onAdded={fetchRepos} />}
    </div>
  );
}
