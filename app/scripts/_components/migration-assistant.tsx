'use client';

/**
 * Migration Assistant — a 3-step wizard to bulk re-point generated scripts
 * from one crawl snapshot to another after a UI change.
 *
 *   Step 1 · Select versions   — pick an app + an old/new crawl snapshot pair
 *   Step 2 · Map elements       — review/override oldSelector → newSelector
 *   Step 3 · Preview & apply    — per-script diffs, then apply with backups
 */

import { useState, useEffect, useCallback } from 'react';
import { useProject } from '@/lib/project-context';
import { toast } from 'sonner';
import {
  GitMerge,
  Loader2,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Layers,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

interface Snapshot {
  id: number;
  version: number;
  baseUrl: string;
  elementCount: number;
  formCount: number;
  selectorCount: number;
  pageCount: number;
  createdAt: string;
}

interface Mapping {
  oldSelector: string;
  newSelector: string;
  confidence: number;
  method: 'exact' | 'value-token' | 'embedding' | 'none';
  alternatives?: string[];
}

interface Preview {
  scriptId: number;
  url: string;
  changed: boolean;
  replacements: Array<{ oldSelector: string; newSelector: string; occurrences: number }>;
}

const STEPS = ['Select versions', 'Map elements', 'Preview & apply'];

export function MigrationAssistant() {
  const { activeProject } = useProject();
  const headers = useCallback(
    (): Record<string, string> => (activeProject?.id ? { 'x-project-id': String(activeProject.id) } : {}),
    [activeProject?.id],
  );

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 1
  const [baseUrls, setBaseUrls] = useState<string[]>([]);
  const [baseUrl, setBaseUrl] = useState('');
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [oldSnapId, setOldSnapId] = useState<number | null>(null);
  const [newSnapId, setNewSnapId] = useState<number | null>(null);

  // Step 2/3
  const [migrationId, setMigrationId] = useState<number | null>(null);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [affectedCount, setAffectedCount] = useState(0);
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [applying, setApplying] = useState(false);

  /* ---- Step 1 data ---- */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/migrations/base-urls', { headers: headers() });
        const data = await res.json();
        if (data?.success) setBaseUrls(data.data || []);
      } catch { /* ignore */ }
    })();
  }, [headers]);

  useEffect(() => {
    if (!baseUrl) { setSnapshots([]); return; }
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/migrations/snapshots?baseUrl=${encodeURIComponent(baseUrl)}`, { headers: headers() });
        const data = await res.json();
        if (data?.success) {
          const snaps: Snapshot[] = data.data || [];
          setSnapshots(snaps);
          // Sensible defaults: newest = new, second-newest = old.
          if (snaps.length >= 2) { setNewSnapId(snaps[0].id); setOldSnapId(snaps[1].id); }
          else { setNewSnapId(snaps[0]?.id ?? null); setOldSnapId(null); }
        }
      } catch { /* ignore */ } finally { setLoading(false); }
    })();
  }, [baseUrl, headers]);

  /* ---- Create migration → mappings ---- */
  const createMigration = async () => {
    if (!oldSnapId || !newSnapId || oldSnapId === newSnapId) {
      toast.error('Pick two different snapshots.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/migrations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers() },
        body: JSON.stringify({ oldSnapshotId: oldSnapId, newSnapshotId: newSnapId }),
      });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.error || 'Failed to create migration');
      setMigrationId(data.data.migration?.id ?? null);
      setMappings(data.data.mappings || []);
      setAffectedCount((data.data.affectedScriptIds || []).length);
      setOverrides({});
      setStep(1);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  /* ---- Load previews (dry-run) ---- */
  const loadPreviews = async () => {
    if (!migrationId) return;
    setLoading(true);
    try {
      // Persist current overrides via a dry-run apply, then fetch previews.
      const res = await fetch(`/api/migrations/${migrationId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers() },
        body: JSON.stringify({ overrides, dryRun: true }),
      });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.error || 'Preview failed');
      setPreviews(data.data.diffs || []);
      setStep(2);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  /* ---- Apply for real ---- */
  const applyMigration = async () => {
    if (!migrationId) return;
    setApplying(true);
    try {
      const res = await fetch(`/api/migrations/${migrationId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers() },
        body: JSON.stringify({ overrides, dryRun: false }),
      });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.error || 'Apply failed');
      toast.success(`Migration applied — ${data.data.updatedCount}/${data.data.totalAffected} scripts updated.`);
      // Reset wizard.
      setStep(0); setMigrationId(null); setMappings([]); setOverrides({}); setPreviews([]);
      setBaseUrl(''); setOldSnapId(null); setNewSnapId(null);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setApplying(false);
    }
  };

  const effectiveNew = (m: Mapping) => (overrides[m.oldSelector] ?? m.newSelector);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-violet-500/15 border border-violet-500/20">
          <GitMerge size={18} className="text-violet-300" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Migration Assistant</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Bulk re-point your scripts between two crawls after a UI redesign.
          </p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-colors ${
                i === step
                  ? 'bg-violet-600/20 border-violet-500/40 text-violet-200'
                  : i < step
                  ? 'bg-emerald-600/15 border-emerald-500/30 text-emerald-300'
                  : 'bg-[#0c1222] border-[#2a3040] text-slate-500'
              }`}
            >
              {i < step ? <CheckCircle2 size={12} /> : <span className="w-4 text-center">{i + 1}</span>}
              {label}
            </div>
            {i < STEPS.length - 1 && <ChevronRight size={14} className="text-slate-600" />}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-[#2a3040] bg-[#11162a] p-5">
        {/* ── Step 1 ── */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-slate-500 mb-1.5">Application</label>
              <select
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="w-full bg-[#0c1222] border border-[#2a3040] rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-violet-500/50 outline-none"
              >
                <option value="">Select an app…</option>
                {baseUrls.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
              {baseUrls.length === 0 && (
                <p className="text-[11px] text-amber-400/80 mt-1.5 flex items-center gap-1">
                  <AlertTriangle size={11} /> No crawl snapshots yet — crawl an app at least twice to enable migrations.
                </p>
              )}
            </div>

            {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}

            {snapshots.length > 0 && (
              <div className="grid grid-cols-2 gap-4">
                <SnapshotPicker label="From (old crawl)" snapshots={snapshots} value={oldSnapId} onChange={setOldSnapId} accent="red" />
                <SnapshotPicker label="To (new crawl)" snapshots={snapshots} value={newSnapId} onChange={setNewSnapId} accent="emerald" />
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={createMigration}
                disabled={!oldSnapId || !newSnapId || oldSnapId === newSnapId || loading}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-violet-600 hover:bg-violet-500 disabled:opacity-40 rounded-lg text-white transition-colors"
              >
                {loading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                Generate mappings
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2 ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400">
                <Layers size={12} className="inline mr-1 text-violet-300" />
                {mappings.length} element mapping(s) · <span className="text-slate-300">{affectedCount}</span> affected script(s)
              </p>
            </div>

            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {mappings.map((m, i) => (
                <div key={i} className="rounded-lg border border-[#2a3040] bg-[#0c1222] p-3 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono">
                    <code className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-300 break-all">{m.oldSelector}</code>
                    <ArrowRight size={12} className="text-slate-500 shrink-0" />
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${methodColor(m.method)}`}>{m.method}</span>
                    {m.method !== 'exact' && (
                      <span className="text-[10px] text-slate-500">{m.confidence}%</span>
                    )}
                  </div>
                  <input
                    value={effectiveNew(m)}
                    onChange={(e) => setOverrides((o) => ({ ...o, [m.oldSelector]: e.target.value }))}
                    placeholder="No suggestion — enter a replacement selector"
                    className="w-full bg-[#11162a] border border-[#2a3040] rounded-md px-2.5 py-1.5 text-[11px] font-mono text-emerald-300 focus:border-emerald-500/40 outline-none"
                  />
                  {m.alternatives && m.alternatives.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {m.alternatives.map((alt) => (
                        <button
                          key={alt}
                          onClick={() => setOverrides((o) => ({ ...o, [m.oldSelector]: alt }))}
                          className="px-1.5 py-0.5 rounded bg-[#1a1f2e] border border-[#2a3040] text-[10px] font-mono text-slate-400 hover:text-emerald-300 hover:border-emerald-500/30 transition-colors"
                        >
                          {alt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(0)} className="px-3 py-2 text-xs text-slate-400 hover:text-white transition-colors">
                Back
              </button>
              <button
                onClick={loadPreviews}
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-violet-600 hover:bg-violet-500 disabled:opacity-40 rounded-lg text-white transition-colors"
              >
                {loading ? <Loader2 size={13} className="animate-spin" /> : <ChevronRight size={13} />}
                Preview changes
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3 ── */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              {previews.filter((p) => p.changed).length} of {previews.length} script(s) will change.
            </p>
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {previews.map((p) => (
                <div key={p.scriptId} className="rounded-lg border border-[#2a3040] bg-[#0c1222] p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-300">Script #{p.scriptId}</span>
                    {p.changed ? (
                      <span className="text-[10px] text-emerald-300">{p.replacements.reduce((s, r) => s + r.occurrences, 0)} change(s)</span>
                    ) : (
                      <span className="text-[10px] text-slate-500">no change</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 truncate">{p.url}</p>
                  {p.replacements.map((r, j) => (
                    <div key={j} className="flex items-center gap-2 text-[10px] font-mono">
                      <code className="text-red-300/80">{r.oldSelector}</code>
                      <ArrowRight size={10} className="text-slate-600" />
                      <code className="text-emerald-300/80">{r.newSelector}</code>
                    </div>
                  ))}
                </div>
              ))}
              {previews.length === 0 && (
                <p className="text-xs text-slate-500">No affected scripts found for this mapping.</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <button onClick={() => setStep(1)} className="px-3 py-2 text-xs text-slate-400 hover:text-white transition-colors">
                Back
              </button>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <ShieldCheck size={12} className="text-emerald-400" /> Backups taken automatically
                </span>
                <button
                  onClick={applyMigration}
                  disabled={applying || previews.filter((p) => p.changed).length === 0}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 rounded-lg text-white transition-colors"
                >
                  {applying ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                  Apply migration
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SnapshotPicker({
  label, snapshots, value, onChange, accent,
}: {
  label: string;
  snapshots: Snapshot[];
  value: number | null;
  onChange: (v: number) => void;
  accent: 'red' | 'emerald';
}) {
  return (
    <div>
      <label className={`block text-[11px] uppercase tracking-wider mb-1.5 ${accent === 'red' ? 'text-red-400/80' : 'text-emerald-400/80'}`}>
        {label}
      </label>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full bg-[#0c1222] border border-[#2a3040] rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-violet-500/50 outline-none"
      >
        <option value="">Select…</option>
        {snapshots.map((s) => (
          <option key={s.id} value={s.id}>
            v{s.version} · {s.selectorCount} selectors · {new Date(s.createdAt).toLocaleDateString()}
          </option>
        ))}
      </select>
    </div>
  );
}

function methodColor(method: Mapping['method']): string {
  switch (method) {
    case 'exact': return 'bg-emerald-500/15 text-emerald-300';
    case 'embedding': return 'bg-sky-500/15 text-sky-300';
    case 'value-token': return 'bg-violet-500/15 text-violet-300';
    default: return 'bg-amber-500/15 text-amber-300';
  }
}
