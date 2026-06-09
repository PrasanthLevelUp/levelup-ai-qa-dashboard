'use client';

/**
 * Learning & Privacy settings (Priority 2 — Learning Scope Privacy Controls).
 * Enterprise-grade control over how the AI learns and what data it can access.
 * Three modes: project (isolated, recommended) · company (shared) · disabled.
 * Settings are scoped to the active project/tenant and changes take effect
 * immediately on the backend (gated in the learning services).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useProject } from '@/lib/project-context';
import { toast } from 'sonner';
import {
  ShieldCheck, Shield, ShieldAlert, Building2, FolderLock, Ban,
  RefreshCw, Save, Info, Check, Download, History, Lock, AlertTriangle,
  CheckCircle2, FileCheck, Database, Clock, Sparkles,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

type Scope = 'project' | 'company' | 'disabled';

interface ScopeOption {
  value: Scope;
  label: string;
  recommended?: boolean;
  summary: string;
  benefits: string[];
  dataUsed: string;
  isolation: string;
}

interface AuditEntry {
  id: number;
  oldScope: Scope | null;
  newScope: Scope;
  changedByUsername: string | null;
  changedByUserId: number | null;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* Static presentation metadata (icons / accents per mode)            */
/* ------------------------------------------------------------------ */

const MODE_UI: Record<Scope, {
  icon: React.ElementType;
  accent: string;        // text color
  ring: string;          // selected border
  glow: string;          // selected bg
  chip: string;          // icon chip bg
  permissiveness: number; // 0 = most private, 2 = most permissive
}> = {
  disabled: { icon: Ban, accent: 'text-slate-300', ring: 'border-slate-400/70', glow: 'bg-slate-500/10', chip: 'bg-slate-500/15', permissiveness: 0 },
  project: { icon: FolderLock, accent: 'text-emerald-400', ring: 'border-emerald-500/70', glow: 'bg-emerald-500/10', chip: 'bg-emerald-500/15', permissiveness: 1 },
  company: { icon: Building2, accent: 'text-sky-400', ring: 'border-sky-500/70', glow: 'bg-sky-500/10', chip: 'bg-sky-500/15', permissiveness: 2 },
};

// Fallback option copy (used only if the backend somehow omits options).
const FALLBACK_OPTIONS: ScopeOption[] = [
  { value: 'project', label: 'Project Learning', recommended: true, summary: "Learn only from this project's test execution data.", benefits: ['Maximum data isolation', 'Project-specific patterns only', 'No cross-project data sharing'], dataUsed: "This project's failures, healing actions and selector patterns.", isolation: 'strict' },
  { value: 'company', label: 'Company Learning', summary: 'Learn from all projects across your organization.', benefits: ['Faster learning through shared knowledge', 'Organization-wide pattern recognition', 'Higher reuse of proven fixes'], dataUsed: 'Failures, healing actions and patterns from every project in your company.', isolation: 'company' },
  { value: 'disabled', label: 'Disabled', summary: 'Disable all learning capabilities.', benefits: ['No data collected for learning', 'Static intelligence only', 'Maximum privacy posture'], dataUsed: 'Nothing — no execution data is mined or stored for learning.', isolation: 'none' },
];

// Display order: recommended first, then more permissive, then disabled.
const DISPLAY_ORDER: Scope[] = ['project', 'company', 'disabled'];

function timeAgo(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  } catch { return ''; }
}

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export default function PrivacySettingsClient() {
  const { activeProject } = useProject();
  const projectId = activeProject?.id ?? null;

  const [options, setOptions] = useState<ScopeOption[]>(FALLBACK_OPTIONS);
  const [savedScope, setSavedScope] = useState<Scope>('project');
  const [selected, setSelected] = useState<Scope>('project');
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const headers = useCallback((extra?: Record<string, string>) => {
    const h: Record<string, string> = { ...(extra || {}) };
    if (projectId) h['x-project-id'] = String(projectId);
    return h;
  }, [projectId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [scopeRes, auditRes] = await Promise.all([
        fetch('/api/learning-scope', { headers: headers(), cache: 'no-store' }),
        fetch('/api/learning-scope/audit?limit=25', { headers: headers(), cache: 'no-store' }),
      ]);
      const scopeJson = await scopeRes.json();
      const d = scopeJson?.data || scopeJson;
      if (d?.learningScope) {
        setSavedScope(d.learningScope);
        setSelected(d.learningScope);
      }
      if (Array.isArray(d?.options) && d.options.length) setOptions(d.options);
      if (auditRes.ok) {
        const aj = await auditRes.json();
        setAudit(aj?.data?.entries || []);
      }
    } catch {
      toast.error('Failed to load privacy settings');
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => { load(); }, [load]);

  const dirty = selected !== savedScope;
  const optionFor = useCallback((s: Scope) => options.find(o => o.value === s) || FALLBACK_OPTIONS.find(o => o.value === s)!, [options]);

  const orderedOptions = useMemo(
    () => DISPLAY_ORDER.map(optionFor).filter(Boolean) as ScopeOption[],
    [optionFor],
  );

  // Moving to a MORE permissive scope (more data sharing) or DISABLING → confirm.
  const needsConfirm = useMemo(() => {
    if (!dirty) return false;
    const movingMorePermissive = MODE_UI[selected].permissiveness > MODE_UI[savedScope].permissiveness;
    return movingMorePermissive || selected === 'disabled';
  }, [dirty, selected, savedScope]);

  const persist = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/learning-scope', {
        method: 'PUT',
        headers: headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ learningScope: selected }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error || `Save failed (${res.status})`);
      }
      setSavedScope(selected);
      toast.success(`Learning scope set to "${optionFor(selected).label}"`);
      // Refresh audit trail to reflect the change.
      try {
        const aj = await (await fetch('/api/learning-scope/audit?limit=25', { headers: headers(), cache: 'no-store' })).json();
        setAudit(aj?.data?.entries || []);
      } catch { /* non-fatal */ }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save privacy settings');
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  }, [headers, selected, optionFor]);

  const onSave = () => {
    if (!dirty) return;
    if (needsConfirm) setConfirmOpen(true);
    else persist();
  };

  const exportSettings = () => {
    const payload = {
      product: 'LevelUp AI QA',
      setting: 'intelligence_learning_scope',
      project: activeProject?.name || null,
      projectId,
      currentScope: savedScope,
      scopeDescription: optionFor(savedScope).summary,
      dataUsed: optionFor(savedScope).dataUsed,
      dataIsolation: optionFor(savedScope).isolation,
      auditTrail: audit,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `learning-privacy-settings-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentUi = MODE_UI[savedScope];
  const CurrentIcon = currentUi.icon;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Learning &amp; Privacy</h1>
            <p className="text-sm text-slate-400 max-w-xl">
              Control how your AI learns and what data it can access.
              {activeProject?.name ? ` Scope: ${activeProject.name}.` : ' Scope: all projects.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1f2e] hover:bg-[#232a3b] border border-[#334155] text-sm text-slate-300 rounded-lg"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button
            onClick={load}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1f2e] hover:bg-[#232a3b] border border-[#334155] text-sm text-slate-300 rounded-lg"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Current-scope status banner */}
          <div className={`relative overflow-hidden rounded-xl border ${currentUi.ring} ${currentUi.glow} p-5`}>
            <div className="absolute top-0 right-0 w-32 h-32 opacity-5"><Lock className="w-full h-full" /></div>
            <div className="relative flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${currentUi.chip} flex items-center justify-center shrink-0`}>
                <CurrentIcon className={`w-6 h-6 ${currentUi.accent}`} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs uppercase tracking-wide text-slate-400 font-medium">Active learning scope</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${currentUi.chip} ${currentUi.accent}`}>
                    {optionFor(savedScope).label}
                  </span>
                </div>
                <p className="text-sm text-slate-300 mt-1">{optionFor(savedScope).summary}</p>
              </div>
            </div>
          </div>

          {/* Intro / governance message */}
          <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <h2 className="text-base font-semibold text-white">Intelligence Learning Scope</h2>
            </div>
            <p className="text-xs text-slate-400">
              Choose the boundary the AI must stay within when it mines test failures, healing actions and selector
              patterns to get smarter. Your selection is enforced server-side and takes effect immediately.
            </p>

            {/* Mode cards */}
            <div className="grid gap-3 mt-4">
              {orderedOptions.map((opt) => {
                const ui = MODE_UI[opt.value];
                const Icon = ui.icon;
                const isSel = selected === opt.value;
                const isActive = savedScope === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSelected(opt.value)}
                    className={`text-left rounded-xl border p-4 transition-all ${
                      isSel ? `${ui.ring} ${ui.glow} ring-1 ring-inset ${ui.ring}` : 'border-[#2a3040] bg-[#0c1222] hover:border-[#3a4256]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* radio */}
                      <span className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${isSel ? ui.ring : 'border-slate-500'}`}>
                        {isSel && <span className={`w-2 h-2 rounded-full ${ui.accent.replace('text-', 'bg-')}`} />}
                      </span>
                      <div className={`w-9 h-9 rounded-lg ${ui.chip} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-5 h-5 ${ui.accent}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-white">{opt.label}</span>
                          {opt.recommended && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center gap-1">
                              <Check className="w-3 h-3" /> Recommended
                            </span>
                          )}
                          {isActive && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-600/40 text-slate-300">Current</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{opt.summary}</p>
                        <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                          {opt.benefits.map((b, i) => (
                            <li key={i} className="flex items-center gap-1.5 text-xs text-slate-300">
                              <CheckCircle2 className={`w-3.5 h-3.5 ${ui.accent} shrink-0`} /> {b}
                            </li>
                          ))}
                        </ul>
                        <div className="mt-2 flex items-start gap-1.5 text-[11px] text-slate-500">
                          <Database className="w-3 h-3 mt-0.5 shrink-0" />
                          <span><span className="text-slate-400 font-medium">Data used:</span> {opt.dataUsed}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Inline change warning */}
            {dirty && (
              <div className={`mt-4 flex items-start gap-2 rounded-lg p-3 text-xs ${
                selected === 'disabled' || MODE_UI[selected].permissiveness > MODE_UI[savedScope].permissiveness
                  ? 'bg-amber-500/10 border border-amber-500/30 text-amber-200'
                  : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-200'
              }`}>
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  {selected === 'disabled'
                    ? 'Disabling learning stops all new pattern collection. Existing intelligence is retained but will no longer improve — self-healing accuracy may plateau over time.'
                    : MODE_UI[selected].permissiveness > MODE_UI[savedScope].permissiveness
                      ? `Switching to "${optionFor(selected).label}" broadens data sharing. Patterns will be visible across ${selected === 'company' ? 'every project in your organization' : 'a wider scope'}. You will be asked to confirm.`
                      : `Switching to "${optionFor(selected).label}" tightens data isolation. Future learning will be restricted to a narrower scope.`}
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between mt-5">
              <button
                onClick={() => setSelected(savedScope)}
                disabled={!dirty || saving}
                className="px-3 py-2 text-sm text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Discard changes
              </button>
              <button
                onClick={onSave}
                disabled={!dirty || saving}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

          {/* Compliance / data governance */}
          <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <FileCheck className="w-4 h-4 text-sky-400" />
              <h2 className="text-base font-semibold text-white">Data Governance</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <GovItem icon={Shield} title="Tenant isolation" body="Every query is scoped by company and project. No data crosses tenant boundaries — ever." />
              <GovItem icon={Lock} title="Default private" body="New projects default to Project Learning, the most isolated mode. Sharing is opt-in." />
              <GovItem icon={History} title="Auditable" body="Every scope change is recorded with the user and timestamp for compliance reviews." />
            </div>
            <p className="text-[11px] text-slate-500 mt-4 flex items-start gap-1.5">
              <Info className="w-3 h-3 mt-0.5 shrink-0" />
              Learning data (failures, healing actions, selector patterns) is stored in your tenant's region and is never
              used to train shared or third-party models. Disabling learning halts all new collection immediately.
            </p>
          </div>

          {/* Audit trail */}
          <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-violet-400" />
              <h2 className="text-base font-semibold text-white">Change History</h2>
              <span className="ml-auto text-xs text-slate-500">{audit.length} {audit.length === 1 ? 'entry' : 'entries'}</span>
            </div>
            {audit.length > 0 ? (
              <ul className="space-y-2">
                {audit.map((e) => (
                  <li key={e.id} className="flex items-start gap-3 p-3 rounded-lg bg-[#0c1222] border border-[#2a3040]">
                    <div className="w-7 h-7 rounded-md bg-violet-500/15 flex items-center justify-center shrink-0">
                      <Clock className="w-3.5 h-3.5 text-violet-400" />
                    </div>
                    <div className="min-w-0 flex-1 text-xs">
                      <p className="text-slate-300">
                        Scope changed
                        {e.oldScope ? <> from <code className="px-1 rounded bg-slate-700/50 text-slate-200">{e.oldScope}</code></> : null}
                        {' '}to <code className="px-1 rounded bg-emerald-500/15 text-emerald-300">{e.newScope}</code>
                      </p>
                      <p className="text-slate-500 mt-0.5">
                        by <span className="text-slate-400">{e.changedByUsername || 'system'}</span> · {timeAgo(e.createdAt)}
                        <span className="text-slate-600"> ({new Date(e.createdAt).toLocaleString()})</span>
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500 py-4 text-center">No changes recorded yet. The current scope is the default for this project.</p>
            )}
          </div>
        </div>
      )}

      {/* Confirmation modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => !saving && setConfirmOpen(false)}>
          <div className="bg-[#141a29] border border-[#2a3040] rounded-xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selected === 'disabled' ? 'bg-red-500/15' : 'bg-amber-500/15'}`}>
                {selected === 'disabled' ? <ShieldAlert className="w-5 h-5 text-red-400" /> : <Building2 className="w-5 h-5 text-amber-400" />}
              </div>
              <h3 className="text-base font-semibold text-white">
                {selected === 'disabled' ? 'Disable all learning?' : `Switch to ${optionFor(selected).label}?`}
              </h3>
            </div>
            <p className="text-sm text-slate-400">
              {selected === 'disabled'
                ? 'The AI will stop collecting any new learning data for this scope. Existing intelligence is retained but will no longer improve. You can re-enable learning at any time.'
                : `This broadens data sharing: test failures, healing actions and selector patterns will be learned and reused across ${selected === 'company' ? 'every project in your organization' : 'a wider scope'}. This change is logged for compliance.`}
            </p>
            <div className="flex items-center justify-end gap-2 mt-5">
              <button onClick={() => setConfirmOpen(false)} disabled={saving} className="px-4 py-2 text-sm text-slate-300 hover:text-white">Cancel</button>
              <button
                onClick={persist}
                disabled={saving}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white ${selected === 'disabled' ? 'bg-red-600 hover:bg-red-500' : 'bg-amber-600 hover:bg-amber-500'} disabled:opacity-50`}
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {selected === 'disabled' ? 'Disable Learning' : 'Confirm Change'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GovItem({ icon: Icon, title, body }: { icon: React.ElementType; title: string; body: string }) {
  return (
    <div className="bg-[#0c1222] border border-[#2a3040] rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-sky-400" />
        <span className="text-xs font-semibold text-white">{title}</span>
      </div>
      <p className="text-[11px] text-slate-400 leading-relaxed">{body}</p>
    </div>
  );
}
