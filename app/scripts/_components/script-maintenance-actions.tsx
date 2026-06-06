'use client';

/**
 * Script Maintenance Actions — per-script "Sync" and "Smart Regenerate"
 * controls plus their result/preview modals.
 *
 * - Sync: re-validate locators against the latest crawl and auto-repair
 *   outdated selectors (POST /api/scripts/:id/sync).
 * - Smart Regenerate: refresh page-objects/locators while preserving
 *   hand-written test logic (POST /api/scripts/:id/regenerate).
 *
 * Both run a dry-run preview first, then let the user apply.
 */

import { useState } from 'react';
import { toast } from 'sonner';
import {
  RefreshCw,
  Wand2,
  Loader2,
  X,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';

interface SyncChange {
  file: string;
  oldLocator: string;
  newLocator: string;
  reason: string;
  elementDescription?: string;
  confidence?: number;
  occurrences: number;
}

interface SyncData {
  changes: SyncChange[];
  outdatedCount: number;
  replacedCount: number;
  unresolved: Array<{ locator: string; elementDescription?: string; reason: string }>;
  summary: string;
  applied: boolean;
  dryRun: boolean;
  backupVersion: number | null;
}

interface RegenData {
  files: Array<{ path: string; content: string }>;
  mergeReport: Array<{
    file: string;
    testDataInjected: number;
    assertionsInjected: number;
    customRegionsInjected: number;
    notes: string[];
  }>;
  syncSummary: string;
  locatorChanges: SyncChange[];
  applied: boolean;
  dryRun: boolean;
  backupVersion: number | null;
}

export function ScriptMaintenanceActions({
  scriptId,
  scriptName,
  headers,
  onApplied,
}: {
  scriptId: number;
  scriptName: string;
  headers: Record<string, string>;
  onApplied?: () => void;
}) {
  const [mode, setMode] = useState<null | 'sync' | 'regen'>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [sync, setSync] = useState<SyncData | null>(null);
  const [regen, setRegen] = useState<RegenData | null>(null);
  // Regeneration preservation options.
  const [preserveTestData, setPreserveTestData] = useState(true);
  const [preserveAssertions, setPreserveAssertions] = useState(true);
  const [preserveCustomRegions, setPreserveCustomRegions] = useState(true);

  const close = () => {
    setMode(null);
    setSync(null);
    setRegen(null);
  };

  const runSync = async (dryRun: boolean) => {
    dryRun ? setLoading(true) : setApplying(true);
    try {
      const res = await fetch(`/api/scripts/${scriptId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ dryRun }),
      });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.error || 'Sync failed');
      setSync(data.data);
      if (!dryRun) {
        toast.success(
          data.data.applied
            ? `Synced — ${data.data.replacedCount} locator(s) repaired (backup v${data.data.backupVersion}).`
            : 'No changes were applied.',
        );
        onApplied?.();
      }
    } catch (e: any) {
      toast.error(e.message || 'Sync failed');
    } finally {
      setLoading(false);
      setApplying(false);
    }
  };

  const runRegen = async (dryRun: boolean) => {
    dryRun ? setLoading(true) : setApplying(true);
    try {
      const res = await fetch(`/api/scripts/${scriptId}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ dryRun, preserveTestData, preserveAssertions, preserveCustomRegions }),
      });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.error || 'Regeneration failed');
      setRegen(data.data);
      if (!dryRun) {
        toast.success(
          data.data.applied
            ? `Regenerated (backup v${data.data.backupVersion}).`
            : 'No changes were applied.',
        );
        onApplied?.();
      }
    } catch (e: any) {
      toast.error(e.message || 'Regeneration failed');
    } finally {
      setLoading(false);
      setApplying(false);
    }
  };

  const openSync = () => {
    setMode('sync');
    setSync(null);
    runSync(true);
  };
  const openRegen = () => {
    setMode('regen');
    setRegen(null);
    runRegen(true);
  };

  return (
    <>
      <button
        onClick={openSync}
        className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium bg-sky-600/15 border border-sky-500/30 rounded-lg text-sky-300 hover:bg-sky-600/25 transition-colors"
        title="Re-validate locators against the latest crawl and auto-repair outdated selectors"
      >
        <RefreshCw size={12} />
        Sync
      </button>
      <button
        onClick={openRegen}
        className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium bg-violet-600/15 border border-violet-500/30 rounded-lg text-violet-300 hover:bg-violet-600/25 transition-colors"
        title="Regenerate page-objects/locators while preserving your test logic"
      >
        <Wand2 size={12} />
        Regenerate
      </button>

      {mode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => !applying && close()}
        >
          <div
            className="w-full max-w-2xl bg-[#11162a] border border-[#2a3040] rounded-xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a3040]">
              <div className="flex items-center gap-2">
                {mode === 'sync' ? (
                  <RefreshCw size={16} className="text-sky-400" />
                ) : (
                  <Wand2 size={16} className="text-violet-400" />
                )}
                <h4 className="text-sm font-semibold text-slate-200">
                  {mode === 'sync' ? 'Sync Script' : 'Smart Regenerate'}
                </h4>
              </div>
              <button
                onClick={close}
                disabled={applying}
                className="text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-5 py-4 overflow-y-auto space-y-4">
              <p className="text-xs text-slate-500 truncate">
                <span className="text-slate-400">Script #{scriptId}:</span> {scriptName}
              </p>

              {loading && (
                <div className="flex items-center gap-2 text-slate-400 text-sm py-8 justify-center">
                  <Loader2 className="w-4 h-4 animate-spin" /> Analysing against latest crawl…
                </div>
              )}

              {/* ── SYNC preview ── */}
              {mode === 'sync' && sync && !loading && (
                <SyncPreview sync={sync} />
              )}

              {/* ── REGENERATE preview + options ── */}
              {mode === 'regen' && !loading && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-wider text-slate-500">Preservation options</p>
                    <Toggle label="Preserve test data" checked={preserveTestData} onChange={setPreserveTestData} />
                    <Toggle label="Preserve assertions" checked={preserveAssertions} onChange={setPreserveAssertions} />
                    <Toggle label="Preserve custom @preserve regions" checked={preserveCustomRegions} onChange={setPreserveCustomRegions} />
                    <button
                      onClick={() => runRegen(true)}
                      className="text-[11px] text-violet-300 hover:text-violet-200 underline"
                    >
                      Re-run preview with these options
                    </button>
                  </div>
                  {regen && <RegenPreview regen={regen} />}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-[#2a3040] bg-[#0c1222]/50">
              <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <ShieldCheck size={12} className="text-emerald-400" />
                A versioned backup is taken before any change.
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={close}
                  disabled={applying}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => (mode === 'sync' ? runSync(false) : runRegen(false))}
                  disabled={applying || loading || (mode === 'sync' && (!sync || sync.changes.length === 0))}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-white transition-colors"
                >
                  {applying ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                  {mode === 'sync' ? 'Apply repairs' : 'Apply regeneration'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-violet-500" />
      {label}
    </label>
  );
}

function SyncPreview({ sync }: { sync: SyncData }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm">
        {sync.outdatedCount === 0 ? (
          <CheckCircle2 size={15} className="text-emerald-400" />
        ) : (
          <AlertTriangle size={15} className="text-amber-400" />
        )}
        <span className="text-slate-300">{sync.summary}</span>
      </div>

      {sync.changes.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-wider text-slate-500">Proposed repairs ({sync.changes.length})</p>
          {sync.changes.map((c, i) => (
            <div key={i} className="rounded-lg border border-[#2a3040] bg-[#0c1222] p-3 space-y-1.5">
              {c.elementDescription && (
                <p className="text-[11px] text-slate-400">{c.elementDescription}</p>
              )}
              <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono">
                <code className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-300 line-through break-all">{c.oldLocator}</code>
                <ArrowRight size={12} className="text-slate-500 shrink-0" />
                <code className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 break-all">{c.newLocator}</code>
              </div>
              <p className="text-[10px] text-slate-500">
                {c.reason}
                {typeof c.confidence === 'number' && ` · ${c.confidence}% confidence`}
                {c.occurrences > 0 && ` · ${c.occurrences}×`}
              </p>
            </div>
          ))}
        </div>
      )}

      {sync.unresolved.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-wider text-amber-500/80">Need manual review ({sync.unresolved.length})</p>
          {sync.unresolved.map((u, i) => (
            <div key={i} className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5">
              <code className="text-[11px] font-mono text-amber-300 break-all">{u.locator}</code>
              <p className="text-[10px] text-slate-500 mt-1">{u.reason}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RegenPreview({ regen }: { regen: RegenData }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-slate-300">
        <RefreshCw size={14} className="text-sky-400" />
        {regen.syncSummary}
      </div>

      {regen.mergeReport.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-wider text-slate-500">Preserved logic</p>
          {regen.mergeReport.map((r, i) => (
            <div key={i} className="rounded-lg border border-[#2a3040] bg-[#0c1222] p-3 space-y-1">
              <p className="text-[11px] font-mono text-slate-300">{r.file}</p>
              <div className="flex flex-wrap gap-2 text-[10px]">
                <Badge n={r.testDataInjected} label="test data" />
                <Badge n={r.customRegionsInjected} label="custom regions" />
                <Badge n={r.assertionsInjected} label="assertions flagged" />
              </div>
              {r.notes.map((n, j) => (
                <p key={j} className="text-[10px] text-slate-500">• {n}</p>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-500">No preserved blocks detected — regeneration only refreshes locators.</p>
      )}
    </div>
  );
}

function Badge({ n, label }: { n: number; label: string }) {
  if (!n) return null;
  return (
    <span className="px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-300 border border-violet-500/20">
      {n} {label}
    </span>
  );
}
