'use client';

import { useCallback, useEffect, useState } from 'react';
import { useProject } from '@/lib/project-context';
import { useProjectSprints, ProjectSprint } from '@/lib/workspace-context';
import { toast } from 'sonner';
import {
  Rocket, Plus, Edit, Trash2, Play, CheckCircle2, RefreshCw, X, FolderOpen,
  Settings2, Calendar, Target, Flag, CircleDot, BarChart3, TrendingUp, Info,
} from 'lucide-react';

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  planned: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  completed: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
};

interface SprintForm {
  id?: number;
  name: string;
  start_date: string;
  end_date: string;
  goals: string;
}
const emptyForm: SprintForm = { name: '', start_date: '', end_date: '', goals: '' };

interface ProjectSettings {
  sprint_duration_weeks: number;
  auto_create_sprints: boolean;
  sprint_naming_pattern: string;
}

export default function SprintsClient() {
  const { activeProject } = useProject();
  const { sprints, currentSprint, progress, loading, refresh } = useProjectSprints();
  const projectId = activeProject?.id ?? null;

  const [settings, setSettings] = useState<ProjectSettings>({ sprint_duration_weeks: 2, auto_create_sprints: false, sprint_naming_pattern: 'Sprint {n}' });
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<SprintForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [metrics, setMetrics] = useState<Record<number, any>>({});

  /* Load project sprint settings */
  const loadSettings = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await fetch(`/api/projects/${projectId}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const p = data.project || data;
        setSettings({
          sprint_duration_weeks: p.sprint_duration_weeks ?? 2,
          auto_create_sprints: !!p.auto_create_sprints,
          sprint_naming_pattern: p.sprint_naming_pattern || 'Sprint {n}',
        });
        setSettingsDirty(false);
      }
    } catch { /* ignore */ }
  }, [projectId]);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const loadMetrics = useCallback(async (sprintId: number) => {
    if (!projectId) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/sprints/${sprintId}/metrics`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setMetrics((prev) => ({ ...prev, [sprintId]: data.metrics || data }));
      }
    } catch { /* ignore */ }
  }, [projectId]);

  useEffect(() => {
    if (currentSprint) loadMetrics(currentSprint.id);
  }, [currentSprint, loadMetrics]);

  const saveSettings = async () => {
    if (!projectId) return;
    setSavingSettings(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sprint_duration_weeks: Number(settings.sprint_duration_weeks),
          auto_create_sprints: settings.auto_create_sprints,
          sprint_naming_pattern: settings.sprint_naming_pattern,
        }),
      });
      if (!res.ok) throw new Error('Failed to save settings');
      toast.success('Sprint settings saved');
      setSettingsDirty(false);
    } catch (e: any) {
      toast.error(e.message || 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const openCreate = () => { setForm(emptyForm); setModalOpen(true); };
  const openEdit = (s: ProjectSprint) => {
    setForm({
      id: s.id, name: s.name,
      start_date: s.start_date ? s.start_date.slice(0, 10) : '',
      end_date: s.end_date ? s.end_date.slice(0, 10) : '',
      goals: s.goals || '',
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
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        goals: form.goals.trim() || null,
      };
      const url = form.id ? `/api/projects/${projectId}/sprints/${form.id}` : `/api/projects/${projectId}/sprints`;
      const res = await fetch(url, {
        method: form.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save sprint');
      }
      toast.success(form.id ? 'Sprint updated' : 'Sprint created');
      setModalOpen(false);
      await refresh();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save sprint');
    } finally {
      setSaving(false);
    }
  };

  const action = async (s: ProjectSprint, kind: 'activate' | 'complete' | 'delete') => {
    if (!projectId) return;
    if (kind === 'delete' && !confirm(`Delete sprint "${s.name}"?`)) return;
    if (kind === 'complete' && !confirm(`Mark sprint "${s.name}" as completed?`)) return;
    setBusyId(s.id);
    try {
      let res: Response;
      if (kind === 'delete') {
        res = await fetch(`/api/projects/${projectId}/sprints/${s.id}`, { method: 'DELETE' });
      } else {
        res = await fetch(`/api/projects/${projectId}/sprints/${s.id}/${kind}`, { method: 'POST' });
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to ${kind} sprint`);
      }
      toast.success(kind === 'activate' ? 'Sprint activated' : kind === 'complete' ? 'Sprint completed' : 'Sprint deleted');
      await refresh();
    } catch (e: any) {
      toast.error(e.message || `Failed to ${kind} sprint`);
    } finally {
      setBusyId(null);
    }
  };

  const createNext = async () => {
    if (!projectId) return;
    setBusyId(-1);
    try {
      const res = await fetch(`/api/projects/${projectId}/sprints/next`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create next sprint');
      }
      toast.success('Next sprint created');
      await refresh();
    } catch (e: any) {
      toast.error(e.message || 'Failed to create next sprint');
    } finally {
      setBusyId(null);
    }
  };

  if (!activeProject) {
    return (
      <div className="p-8">
        <EmptyShell icon={<FolderOpen size={40} className="text-slate-600" />} title="No project selected" subtitle="Select a project from the sidebar to manage its sprints." />
      </div>
    );
  }

  const curMetrics = currentSprint ? metrics[currentSprint.id] : null;

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
            <Rocket className="text-violet-400" size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Sprints</h1>
            <p className="text-sm text-slate-400">Plan & track sprints for <span className="text-slate-300">{activeProject.name}</span></p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { refresh(); loadSettings(); }} className="p-2 rounded-lg bg-[#1e293b] border border-[#334155] text-slate-300 hover:bg-[#283548] transition-all">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={createNext} disabled={busyId === -1} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all disabled:opacity-50">
            {busyId === -1 ? <RefreshCw size={16} className="animate-spin" /> : <TrendingUp size={16} />} Auto Next
          </button>
          <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-violet-400 bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/20 transition-all">
            <Plus size={16} /> New Sprint
          </button>
        </div>
      </div>

      {/* Help banner */}
      <div className="flex items-start gap-2.5 mb-6 p-3 rounded-lg bg-violet-500/5 border border-violet-500/15">
        <Info size={16} className="text-violet-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-slate-400 leading-relaxed">
          <span className="text-slate-200 font-medium">Sprints are WHEN — time-based cycles</span> (typically 2 weeks) used to
          filter dashboards and track test execution &amp; healing metrics over time. Set your cadence below, then create
          sprints (or use <span className="text-slate-300">Auto Next</span>). Switch the active sprint any time from the
          workspace bar. For WHERE you test, see{' '}
          <a href="/settings/environments" className="text-violet-400 hover:underline">Settings → Environments</a>.
        </p>
      </div>

      {/* Current sprint card */}
      {currentSprint && (
        <div className="rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-transparent p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CircleDot size={16} className="text-emerald-400" />
              <span className="text-sm font-bold text-white">{currentSprint.name}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">current</span>
            </div>
            <span className="text-xs text-slate-400">
              {currentSprint.start_date ? new Date(currentSprint.start_date).toLocaleDateString() : '—'} → {currentSprint.end_date ? new Date(currentSprint.end_date).toLocaleDateString() : '—'}
            </span>
          </div>
          {progress && progress.percentComplete != null && (
            <div className="mb-3">
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                <span>{Math.round(progress.percentComplete)}% complete</span>
                <span>{progress.isOverdue ? <span className="text-red-400">overdue</span> : `${progress.remainingDays ?? 0} days left`}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#1e293b] overflow-hidden">
                <div className={`h-full rounded-full ${progress.isOverdue ? 'bg-red-500' : 'bg-violet-500'}`} style={{ width: `${Math.min(100, Math.max(0, progress.percentComplete))}%` }} />
              </div>
            </div>
          )}
          {currentSprint.goals && <p className="text-xs text-slate-300 flex items-start gap-1.5"><Target size={13} className="text-violet-400 mt-0.5 flex-shrink-0" /> {currentSprint.goals}</p>}
          {curMetrics && (
            <div className="grid grid-cols-3 gap-3 mt-4">
              <Metric label="Executions" value={curMetrics.testExecutions ?? curMetrics.executions ?? 0} />
              <Metric label="Passed" value={curMetrics.passed ?? 0} accent="text-emerald-400" />
              <Metric label="Failed" value={curMetrics.failed ?? 0} accent="text-red-400" />
            </div>
          )}
        </div>
      )}

      {/* Settings */}
      <div className="rounded-xl border border-[#1e293b] bg-[#131c2e] p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings2 size={16} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-white">Sprint Configuration</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Duration (weeks)">
            <input type="number" min={1} max={12} value={settings.sprint_duration_weeks}
              onChange={(e) => { setSettings({ ...settings, sprint_duration_weeks: parseInt(e.target.value || '1', 10) }); setSettingsDirty(true); }}
              className={inputCls} />
          </Field>
          <Field label="Naming pattern">
            <input value={settings.sprint_naming_pattern}
              onChange={(e) => { setSettings({ ...settings, sprint_naming_pattern: e.target.value }); setSettingsDirty(true); }}
              placeholder="Sprint {n}" className={inputCls} />
          </Field>
          <Field label="Auto-create next sprint">
            <button
              onClick={() => { setSettings({ ...settings, auto_create_sprints: !settings.auto_create_sprints }); setSettingsDirty(true); }}
              className={`w-full px-3 py-2 rounded-lg text-sm border transition-all ${settings.auto_create_sprints ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-[#1e293b] text-slate-400 border-[#334155]'}`}>
              {settings.auto_create_sprints ? 'Enabled' : 'Disabled'}
            </button>
          </Field>
        </div>
        <p className="text-[11px] text-slate-500 mt-3">Use <code className="text-slate-400">{'{n}'}</code> in the pattern as the sprint number placeholder (e.g. <span className="text-slate-400">Sprint {'{n}'}</span> → Sprint 5).</p>
        {settingsDirty && (
          <div className="flex justify-end mt-4">
            <button onClick={saveSettings} disabled={savingSettings} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all disabled:opacity-50">
              {savingSettings ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Save Configuration
            </button>
          </div>
        )}
      </div>

      {/* Sprint list / timeline */}
      <div className="flex items-center gap-2 mb-3">
        <Calendar size={15} className="text-slate-400" />
        <h2 className="text-sm font-semibold text-white">Sprint Timeline</h2>
      </div>
      {loading && sprints.length === 0 ? (
        <div className="space-y-3">{[0, 1].map((i) => <div key={i} className="h-20 rounded-xl bg-[#1e293b] animate-pulse" />)}</div>
      ) : sprints.length === 0 ? (
        <EmptyShell
          icon={<Rocket size={40} className="text-slate-600" />}
          title="No sprints yet"
          subtitle="Create your first sprint to start tracking test execution and healing metrics over time."
          action={<button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-violet-400 bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/20 transition-all"><Plus size={16} /> New Sprint</button>}
        />
      ) : (
        <div className="space-y-3">
          {sprints.map((s) => (
            <div key={s.id} className={`rounded-xl border p-4 ${currentSprint?.id === s.id ? 'border-violet-500/40 bg-violet-500/5' : 'border-[#1e293b] bg-[#131c2e]'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white truncate">{s.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${STATUS_BADGE[(s.status || '').toLowerCase()] || STATUS_BADGE.planned}`}>{s.status}</span>
                    {currentSprint?.id === s.id && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">current</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                    <Calendar size={11} />
                    <span>{s.start_date ? new Date(s.start_date).toLocaleDateString() : '—'} → {s.end_date ? new Date(s.end_date).toLocaleDateString() : '—'}</span>
                  </div>
                  {s.goals && <p className="text-xs text-slate-400 mt-1.5 flex items-start gap-1.5"><Flag size={11} className="text-violet-400 mt-0.5 flex-shrink-0" /> {s.goals}</p>}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {s.status !== 'active' && s.status !== 'completed' && <IconBtn title="Activate" onClick={() => action(s, 'activate')} busy={busyId === s.id}><Play size={15} /></IconBtn>}
                  {s.status !== 'completed' && <IconBtn title="Complete" onClick={() => action(s, 'complete')} busy={busyId === s.id}><CheckCircle2 size={15} /></IconBtn>}
                  <IconBtn title="Edit" onClick={() => openEdit(s)}><Edit size={15} /></IconBtn>
                  <IconBtn title="Delete" onClick={() => action(s, 'delete')} busy={busyId === s.id} danger><Trash2 size={15} /></IconBtn>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !saving && setModalOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-[#334155] bg-[#0f1729] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">{form.id ? 'Edit Sprint' : 'New Sprint'}</h2>
              <button onClick={() => !saving && setModalOpen(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <Field label="Name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Sprint 5" className={inputCls} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start date"><input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className={inputCls} /></Field>
                <Field label="End date"><input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className={inputCls} /></Field>
              </div>
              <Field label="Goals"><textarea value={form.goals} onChange={(e) => setForm({ ...form, goals: e.target.value })} rows={2} placeholder="Sprint goals (optional)" className={inputCls} /></Field>
            </div>
            <div className="flex items-center justify-end gap-2 mt-6">
              <button onClick={() => setModalOpen(false)} disabled={saving} className="px-4 py-2 rounded-lg text-sm text-slate-300 bg-[#1e293b] hover:bg-[#283548] border border-[#334155] transition-all disabled:opacity-50">Cancel</button>
              <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-violet-400 bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/20 transition-all disabled:opacity-50">
                {saving ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} {form.id ? 'Save Changes' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 rounded-lg bg-[#1e293b] border border-[#334155] text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500/50';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>{children}</div>;
}

function Metric({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <div className="rounded-lg bg-[#0f1729] border border-[#1e293b] p-3 text-center">
      <div className={`text-lg font-bold ${accent || 'text-white'}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-slate-500 mt-0.5">{label}</div>
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
