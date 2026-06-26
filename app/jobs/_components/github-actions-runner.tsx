'use client';

/* ═══════════════════════════════════════════════════════════════
   GitHub Actions Runner  —  Execution Mode 2
   ───────────────────────────────────────────────────────────────
   Self-contained UI for the "Run via GitHub Actions" execution mode.
   It deliberately lives in its own file so the (large) jobs-client.tsx
   only needs a single import + one <GitHubActionsRunner/> render, keeping
   the existing Local-Runner healing flow completely untouched.

   Flow:
     1. List the workflows defined in the repo's .github/workflows
        (GET /api/github/actions/workflows?repoUrl=…). We DO NOT recreate
        the customer's CI — we trigger what they already have.
     2. Dispatch the chosen workflow on a ref
        (POST /api/github/actions/dispatch).
     3. Poll the correlated run until it completes
        (GET /api/github/actions/runs/:runId?repoUrl=…).
     4. If the run concludes in failure, offer a one-click hand-off to the
        EXISTING LevelUp healing pipeline via the parent's onTriggerHeal().

   Backward compatible: renders nothing intrusive when GitHub isn't
   connected — it simply surfaces a friendly hint.
   ═══════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Play, Loader2, RefreshCw, Github, ExternalLink, CheckCircle2,
  XCircle, Clock, Wrench, AlertTriangle,
} from 'lucide-react';

/* ─── Minimal types (mirror backend github-service shapes) ─── */
interface GHWorkflow {
  id: number;
  name: string;
  path: string;
  state: string;
}
interface GHRun {
  id: number;
  status: string;            // queued | in_progress | completed
  conclusion: string | null; // success | failure | cancelled | …
  htmlUrl?: string;
  headBranch?: string;
  runNumber?: number;
  event?: string;
}

interface Props {
  /** The repo clone URL currently selected in the parent (e.g. github.com/org/repo.git). */
  repoUrl: string;
  /** Branch/ref selected in the parent — used as the default dispatch ref. */
  defaultRef?: string;
  /**
   * Hand-off to the parent's healing trigger. When the runner has dispatched a
   * specific workflow, it passes `{ workflowId, ref }` so the heal job runs via
   * the GitHubActionsExecutionProvider and heals from the REAL CI failure (the
   * run the user just saw fail) — not a separate Local Runner execution.
   */
  onTriggerHeal?: (opts?: { workflowId: string; ref: string }) => void;
  /** Whether a heal job is currently being triggered by the parent. */
  healLoading?: boolean;
}

const POLL_MS = 5000;

export function GitHubActionsRunner({ repoUrl, defaultRef, onTriggerHeal, healLoading }: Props) {
  const [workflows, setWorkflows] = useState<GHWorkflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('');
  const [ref, setRef] = useState<string>(defaultRef || 'main');
  const [loadingWorkflows, setLoadingWorkflows] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [run, setRun] = useState<GHRun | null>(null);
  const [polling, setPolling] = useState(false);
  const [notice, setNotice] = useState<{ type: 'info' | 'error'; message: string } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep ref input in sync when parent branch changes.
  useEffect(() => { if (defaultRef) setRef(defaultRef); }, [defaultRef]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    setPolling(false);
  }, []);

  /* ── Load workflows whenever the selected repo changes ── */
  const fetchWorkflows = useCallback(async () => {
    if (!repoUrl) { setWorkflows([]); return; }
    setLoadingWorkflows(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/github/actions/workflows?repoUrl=${encodeURIComponent(repoUrl)}`);
      const data = await res.json();
      if (!res.ok || data.success === false) {
        const msg: string = data.error || 'Could not list workflows';
        // Friendly hint for the most common cause.
        if (/not connected|token|credential|404/i.test(msg)) {
          setNotice({ type: 'info', message: 'Connect GitHub (Settings → Integrations) and ensure the PAT can read this repo to enable GitHub Actions execution.' });
        } else {
          setNotice({ type: 'error', message: msg });
        }
        setWorkflows([]);
        return;
      }
      const list: GHWorkflow[] = (data.workflows || []).filter((w: GHWorkflow) => w.state === 'active');
      setWorkflows(list);
      setSelectedWorkflow(prev => (prev && list.some(w => String(w.id) === prev)) ? prev : (list[0] ? String(list[0].id) : ''));
      if (list.length === 0) {
        setNotice({ type: 'info', message: 'No active workflows found in .github/workflows for this repository.' });
      }
    } catch {
      setNotice({ type: 'error', message: 'Network error while listing workflows.' });
      setWorkflows([]);
    } finally {
      setLoadingWorkflows(false);
    }
  }, [repoUrl]);

  useEffect(() => {
    // Reset run state when repo changes, then (re)load workflows.
    stopPolling();
    setRun(null);
    fetchWorkflows();
    return stopPolling;
  }, [repoUrl, fetchWorkflows, stopPolling]);

  /* ── Poll a run until it completes ── */
  const pollRun = useCallback(async (runId: number) => {
    try {
      const res = await fetch(`/api/github/actions/runs/${runId}?repoUrl=${encodeURIComponent(repoUrl)}`);
      const data = await res.json();
      if (res.ok && data.run) {
        setRun(data.run as GHRun);
        if ((data.run as GHRun).status === 'completed') {
          stopPolling();
        }
      }
    } catch {
      /* transient — keep polling */
    }
  }, [repoUrl, stopPolling]);

  const startPolling = useCallback((runId: number) => {
    stopPolling();
    setPolling(true);
    pollRun(runId);
    pollRef.current = setInterval(() => pollRun(runId), POLL_MS);
  }, [pollRun, stopPolling]);

  /* ── Dispatch the chosen workflow ── */
  const dispatch = async () => {
    if (!repoUrl || !selectedWorkflow) return;
    setDispatching(true);
    setNotice(null);
    setRun(null);
    try {
      const res = await fetch('/api/github/actions/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl, workflowId: Number(selectedWorkflow), ref: ref.trim() || 'main' }),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        setNotice({ type: 'error', message: data.error || 'Failed to dispatch workflow.' });
        return;
      }
      if (data.run?.id) {
        setRun(data.run as GHRun);
        startPolling(data.run.id);
      } else {
        // Dispatch accepted but the run hasn't surfaced yet — inform the user.
        setNotice({ type: 'info', message: 'Workflow dispatched. The run is starting on GitHub — refresh in a moment to track it.' });
      }
    } catch {
      setNotice({ type: 'error', message: 'Network error while dispatching workflow.' });
    } finally {
      setDispatching(false);
    }
  };

  const isFailure = run?.status === 'completed' && run?.conclusion === 'failure';
  const isSuccess = run?.status === 'completed' && run?.conclusion === 'success';
  const inProgress = !!run && run.status !== 'completed';

  return (
    <div className="mt-4 border-t border-[#2a3040] pt-4">
      <div className="flex items-center gap-2 mb-3">
        <Github size={14} className="text-slate-400" />
        <p className="text-xs font-semibold text-slate-300">Run via GitHub Actions</p>
        <span className="text-[10px] text-slate-500 normal-case">— trigger your existing CI, then heal failures with LevelUp AI</span>
        <button
          onClick={fetchWorkflows}
          disabled={loadingWorkflows || !repoUrl}
          title="Reload workflows"
          className="ml-auto flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 disabled:opacity-40 transition-colors"
        >
          {loadingWorkflows ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
          Refresh
        </button>
      </div>

      {/* Workflow selector + ref + run */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1">
          <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Workflow</label>
          <select
            value={selectedWorkflow}
            onChange={e => setSelectedWorkflow(e.target.value)}
            disabled={loadingWorkflows || workflows.length === 0}
            className="w-full px-3 py-2 rounded-lg bg-[#0c1222] border border-[#334155] text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-60"
          >
            {workflows.length === 0 && <option value="">{loadingWorkflows ? 'Loading…' : 'No workflows available'}</option>}
            {workflows.map(w => (
              <option key={w.id} value={String(w.id)}>{w.name} — {w.path.replace('.github/workflows/', '')}</option>
            ))}
          </select>
        </div>
        <div className="w-full md:w-36">
          <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Ref / Branch</label>
          <input
            value={ref}
            onChange={e => setRef(e.target.value)}
            placeholder="main"
            className="w-full px-3 py-2 rounded-lg bg-[#0c1222] border border-[#334155] text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={dispatch}
            disabled={dispatching || !selectedWorkflow || !repoUrl}
            className="flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:bg-slate-700/50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
          >
            {dispatching ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            {dispatching ? 'Dispatching…' : 'Run Workflow'}
          </button>
        </div>
      </div>

      {/* Notices */}
      {notice && (
        <div className={`mt-3 px-3 py-2 rounded-lg text-xs ${
          notice.type === 'error'
            ? 'bg-red-500/10 border border-red-500/20 text-red-400'
            : 'bg-sky-500/10 border border-sky-500/20 text-sky-300'
        }`}>{notice.message}</div>
      )}

      {/* Run status */}
      {run && (
        <div className="mt-3 bg-[#0c1222] border border-[#2a3040] rounded-lg px-3 py-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            {inProgress && <Loader2 size={13} className="animate-spin text-amber-400" />}
            {isSuccess && <CheckCircle2 size={13} className="text-emerald-400" />}
            {isFailure && <XCircle size={13} className="text-red-400" />}
            {run.status === 'completed' && !isSuccess && !isFailure && <Clock size={13} className="text-slate-400" />}
            <span className="text-xs text-slate-300">
              Run #{run.runNumber ?? run.id}
              {run.headBranch ? ` · ${run.headBranch}` : ''}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider ${
              isSuccess ? 'bg-emerald-500/15 text-emerald-400'
              : isFailure ? 'bg-red-500/15 text-red-400'
              : 'bg-amber-500/15 text-amber-400'
            }`}>
              {run.status === 'completed' ? (run.conclusion || 'completed') : run.status.replace('_', ' ')}
            </span>
            {polling && <span className="text-[10px] text-slate-500">polling…</span>}
            {run.htmlUrl && (
              <a
                href={run.htmlUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto flex items-center gap-1 text-[10px] text-slate-400 hover:text-emerald-400 transition-colors"
              >
                View on GitHub <ExternalLink size={10} />
              </a>
            )}
          </div>

          {/* On failure → hand off to the existing LevelUp healing pipeline */}
          {isFailure && onTriggerHeal && (
            <div className="mt-2.5 flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-[11px] text-amber-300">
                <AlertTriangle size={12} /> Workflow failed — let LevelUp AI heal it.
              </div>
              <button
                onClick={() => onTriggerHeal(selectedWorkflow ? { workflowId: selectedWorkflow, ref } : undefined)}
                disabled={healLoading}
                className="ml-auto flex items-center gap-2 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors"
              >
                {healLoading ? <Loader2 size={12} className="animate-spin" /> : <Wrench size={12} />}
                {healLoading ? 'Triggering…' : 'Heal failures with LevelUp AI'}
              </button>
            </div>
          )}
          {isSuccess && (
            <p className="mt-2 text-[11px] text-emerald-400/80">Workflow passed — no healing needed.</p>
          )}
        </div>
      )}
    </div>
  );
}
