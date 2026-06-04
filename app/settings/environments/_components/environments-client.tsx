'use client';

import { useCallback, useEffect, useState } from 'react';
import { useProject } from '@/lib/project-context';
import { useProjectEnvironments, ProjectEnvironment } from '@/lib/workspace-context';
import { toast } from 'sonner';
import {
  Server, Plus, Edit, Trash2, Star, Activity, RefreshCw, X, Circle,
  FolderOpen, BarChart3, CheckCircle2, AlertTriangle, Info,
} from 'lucide-react';

const ENV_TYPES = ['development', 'qa', 'staging', 'production'];

const HEALTH_COLORS: Record<string, string> = {
  healthy: 'text-emerald-400', degraded: 'text-amber-400', down: 'text-red-400', unknown: 'text-slate-500',
};
const TYPE_BADGE: Record<string, string> = {
  production: 'bg-red-500/10 text-red-400 border-red-500/20',
  staging: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  development: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  qa: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
};

interface FormState {
  id?: number;
  name: string;
  environment_type: string;
  base_url: string;
  description: string;
}
const emptyForm: FormState = { name: '', environment_type: 'qa', base_url: '', description: '' };

export default function EnvironmentsClient() {
  const { activeProject } = useProject();
  const { environments, activeEnvironment, loading, refresh } = useProjectEnvironments();
  const projectId = activeProject?.id ?? null;

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [usage, setUsage] = useState<Record<number, any>>({});

  const loadUsage = useCallback(async (envId: number) => {
    if (!projectId) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/environments/${envId}/usage`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setUsage((prev) => ({ ...prev, [envId]: data.usage || data }));
      }
    } catch { /* ignore */ }
  }, [projectId]);

  useEffect(() => {
    environments.forEach((e) => loadUsage(e.id));
  }, [environments, loadUsage]);

  const openCreate = () => { setForm(emptyForm); setModalOpen(true); };
  const openEdit = (env: ProjectEnvironment) => {
    setForm({
      id: env.id, name: env.name, environment_type: env.environment_type || 'qa',
      base_url: env.base_url || '', description: env.description || '',
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (!projectId) return;
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        environment_type: form.environment_type,
        base_url: form.base_url.trim() || null,
        description: form.description.trim() || null,
      };
      const url = form.id
        ? `/api/projects/${projectId}/environments/${form.id}`
        : `/api/projects/${projectId}/environments`;
      const res = await fetch(url, {
        method: form.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save environment');
      }
      toast.success(form.id ? 'Environment updated' : 'Environment created');
      setModalOpen(false);
      await refresh();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save environment');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (env: ProjectEnvironment) => {
    if (!projectId) return;
    if (!confirm(`Delete environment "${env.name}"? This cannot be undone.`)) return;
    setBusyId(env.id);
    try {
      const res = await fetch(`/api/projects/${projectId}/environments/${env.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete');
      }
      toast.success('Environment deleted');
      await refresh();
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete environment');
    } finally {
      setBusyId(null);
    }
  };

  const setDefault = async (env: ProjectEnvironment) => {
    if (!projectId) return;
    setBusyId(env.id);
    try {
      const res = await fetch(`/api/projects/${projectId}/environments/${env.id}/set-default`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to set default');
      toast.success(`"${env.name}" is now the default environment`);
      await refresh();
    } catch (e: any) {
      toast.error(e.message || 'Failed to set default');
    } finally {
      setBusyId(null);
    }
  };

  const healthCheck = async (env: ProjectEnvironment) => {
    if (!projectId) return;
    setBusyId(env.id);
    try {
      const res = await fetch(`/api/projects/${projectId}/environments/${env.id}/health-check`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Health check failed');
      const status = data.health?.status || data.health_status || data.status || 'checked';
      toast.success(`Health: ${status}`);
      await refresh();
    } catch (e: any) {
      toast.error(e.message || 'Health check failed');
    } finally {
      setBusyId(null);
    }
  };

  if (!activeProject) {
    return (
      <div className="p-8">
        <EmptyShell
          icon={<FolderOpen size={40} className="text-slate-600" />}
          title="No project selected"
          subtitle="Select a project from the sidebar to manage its environments."
        />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20">
            <Server className="text-sky-400" size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Environments</h1>
            <p className="text-sm text-slate-400">Manage deployment targets for <span className="text-slate-300">{activeProject.name}</span></p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refresh()} className="p-2 rounded-lg bg-[#1e293b] border border-[#334155] text-slate-300 hover:bg-[#283548] transition-all">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-sky-400 bg-sky-500/10 border border-sky-500/20 hover:bg-sky-500/20 transition-all">
            <Plus size={16} /> New Environment
          </button>
        </div>
      </div>

      {/* Help banner */}
      <div className="flex items-start gap-2.5 mb-6 p-3 rounded-lg bg-sky-500/5 border border-sky-500/15">
        <Info size={16} className="text-sky-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-slate-400 leading-relaxed">
          <span className="text-slate-200 font-medium">Environments are WHERE your application runs</span> — the URLs you test
          against (e.g. QA, Staging, Production). Mark one as default; switch the active environment any time from the workspace
          bar at the top of every page. For time-based tracking (sprints), see{' '}
          <a href="/settings/sprints" className="text-sky-400 hover:underline">Settings → Sprints</a>.
        </p>
      </div>

      {/* List */}
      {loading && environments.length === 0 ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-24 rounded-xl bg-[#1e293b] animate-pulse" />)}</div>
      ) : environments.length === 0 ? (
        <EmptyShell
          icon={<Server size={40} className="text-slate-600" />}
          title="No environments yet"
          subtitle="Create your first environment (e.g. QA, Staging, Production) to scope test runs and metrics."
          action={<button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-sky-400 bg-sky-500/10 border border-sky-500/20 hover:bg-sky-500/20 transition-all"><Plus size={16} /> New Environment</button>}
        />
      ) : (
        <div className="space-y-3">
          {environments.map((env) => {
            const u = usage[env.id];
            return (
              <div key={env.id} className={`rounded-xl border p-4 transition-all ${activeEnvironment?.id === env.id ? 'border-sky-500/40 bg-sky-500/5' : 'border-[#1e293b] bg-[#131c2e]'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <Circle size={10} className={`mt-1.5 flex-shrink-0 fill-current ${HEALTH_COLORS[(env.health_status || 'unknown').toLowerCase()] || HEALTH_COLORS.unknown}`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white truncate">{env.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${TYPE_BADGE[(env.environment_type || '').toLowerCase()] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>{env.environment_type || 'env'}</span>
                        {env.is_default && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1"><Star size={9} className="fill-current" /> default</span>}
                      </div>
                      {env.base_url && <a href={env.base_url} target="_blank" rel="noreferrer" className="text-xs text-sky-400 hover:underline break-all">{env.base_url}</a>}
                      {env.description && <p className="text-xs text-slate-400 mt-0.5">{env.description}</p>}
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1"><Activity size={11} /> {(env.health_status || 'unknown')}</span>
                        {env.last_health_check_at && <span>checked {new Date(env.last_health_check_at).toLocaleString()}</span>}
                        {u && <span className="flex items-center gap-1"><BarChart3 size={11} /> {u.testExecutions ?? u.test_executions ?? 0} runs</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <IconBtn title="Run health check" onClick={() => healthCheck(env)} busy={busyId === env.id}><Activity size={15} /></IconBtn>
                    {!env.is_default && <IconBtn title="Set as default" onClick={() => setDefault(env)} busy={busyId === env.id}><Star size={15} /></IconBtn>}
                    <IconBtn title="Edit" onClick={() => openEdit(env)}><Edit size={15} /></IconBtn>
                    <IconBtn title="Delete" onClick={() => remove(env)} busy={busyId === env.id} danger><Trash2 size={15} /></IconBtn>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !saving && setModalOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-[#334155] bg-[#0f1729] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">{form.id ? 'Edit Environment' : 'New Environment'}</h2>
              <button onClick={() => !saving && setModalOpen(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <Field label="Name">
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. QA Environment" className={inputCls} />
              </Field>
              <Field label="Type">
                <select value={form.environment_type} onChange={(e) => setForm({ ...form, environment_type: e.target.value })} className={inputCls}>
                  {ENV_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Base URL">
                <input value={form.base_url} onChange={(e) => setForm({ ...form, base_url: e.target.value })} placeholder="https://qa.example.com" className={inputCls} />
              </Field>
              <Field label="Description">
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Optional notes" className={inputCls} />
              </Field>
            </div>
            <div className="flex items-center justify-end gap-2 mt-6">
              <button onClick={() => setModalOpen(false)} disabled={saving} className="px-4 py-2 rounded-lg text-sm text-slate-300 bg-[#1e293b] hover:bg-[#283548] border border-[#334155] transition-all disabled:opacity-50">Cancel</button>
              <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-sky-400 bg-sky-500/10 border border-sky-500/20 hover:bg-sky-500/20 transition-all disabled:opacity-50">
                {saving ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} {form.id ? 'Save Changes' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 rounded-lg bg-[#1e293b] border border-[#334155] text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500/50';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function IconBtn({ children, onClick, title, busy, danger }: { children: React.ReactNode; onClick: () => void; title: string; busy?: boolean; danger?: boolean }) {
  return (
    <button title={title} onClick={onClick} disabled={busy}
      className={`p-2 rounded-lg border transition-all disabled:opacity-50 ${danger ? 'text-red-400 bg-red-500/5 border-red-500/15 hover:bg-red-500/15' : 'text-slate-300 bg-[#1e293b] border-[#334155] hover:bg-[#283548]'}`}>
      {busy ? <RefreshCw size={15} className="animate-spin" /> : children}
    </button>
  );
}

function EmptyShell({ icon, title, subtitle, action }: { icon: React.ReactNode; title: string; subtitle: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 rounded-xl border border-dashed border-[#1e293b]">
      <div className="mb-4">{icon}</div>
      <h3 className="text-base font-semibold text-slate-200">{title}</h3>
      <p className="text-sm text-slate-500 mt-1 max-w-md">{subtitle}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
