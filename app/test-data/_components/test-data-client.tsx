'use client';

/**
 * Test Data — dashboard UI (PR #126)
 *
 * Makes the Test Data Store visible & usable:
 *  1. Test Data page (this component, mounted by app/test-data/page.tsx)
 *  2. Dataset list / create / edit / delete
 *  3. Environment selector (shared · dev · staging · prod)
 *  4. Test Case ↔ Dataset linkage management
 *  5. Dataset usage display (which test cases consume a dataset)
 *  6. Secret reference helper (never store plaintext — reference an env var)
 *
 * All requests carry x-project-id so data stays project-scoped (same isolation
 * discipline as the backend). Backend reference: /api/test-data/*.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Database, Plus, RefreshCw, Trash2, Edit3, Save, X, Loader2, KeyRound,
  Server, Link2, AlertTriangle, CheckCircle2, ChevronLeft, Eye, EyeOff,
  ShieldAlert, ListChecks, Boxes, Hash, FileText,
} from 'lucide-react';
import { useProject } from '@/lib/project-context';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Environment = 'shared' | 'dev' | 'staging' | 'prod';
type DataType = 'string' | 'number' | 'boolean' | 'object' | 'array';

interface TestDataSet {
  id: number;
  company_id: number;
  project_id: number | null;
  name: string;
  description: string | null;
  environment: Environment;
  version: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface TestDataRecord {
  id: number;
  dataset_id: number;
  key: string;
  value_jsonb: any;
  data_type: DataType;
  is_secret: boolean;
  secret_ref: string | null;
  tags: string[];
}

interface UsageTestCase {
  id: number;
  title: string;
  scenario: string | null;
  priority: string | null;
}

interface CandidateTestCase {
  id: number;
  title: string;
  scenario: string | null;
  requirement: string | null;
  priority: string | null;
}

type Notice = { kind: 'success' | 'error'; text: string } | null;

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const ENVIRONMENTS: { value: Environment; label: string; color: string }[] = [
  { value: 'shared', label: 'Shared', color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
  { value: 'dev', label: 'Dev', color: 'bg-sky-500/20 text-sky-400 border-sky-500/30' },
  { value: 'staging', label: 'Staging', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { value: 'prod', label: 'Prod', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
];

const DATA_TYPES: DataType[] = ['string', 'number', 'boolean', 'object', 'array'];

function envBadge(env: Environment): string {
  return ENVIRONMENTS.find((e) => e.value === env)?.color ?? ENVIRONMENTS[0].color;
}

/** Best-effort parse of a free-text value into a typed JS value + inferred type. */
function parseValue(raw: string): { value: any; dataType: DataType } {
  const trimmed = raw.trim();
  if (trimmed === '') return { value: '', dataType: 'string' };
  // Try JSON first (covers numbers, booleans, objects, arrays, quoted strings).
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return { value: parsed, dataType: 'array' };
    if (parsed === null) return { value: null, dataType: 'object' };
    const t = typeof parsed;
    if (t === 'number') return { value: parsed, dataType: 'number' };
    if (t === 'boolean') return { value: parsed, dataType: 'boolean' };
    if (t === 'object') return { value: parsed, dataType: 'object' };
    if (t === 'string') return { value: parsed, dataType: 'string' };
  } catch {
    /* not JSON — treat as plain string */
  }
  return { value: trimmed, dataType: 'string' };
}

/** Render a stored JSONB value compactly for the records table. */
function displayValue(rec: TestDataRecord): string {
  if (rec.is_secret) return `secret_ref:${rec.secret_ref ?? '?'}`;
  try {
    if (typeof rec.value_jsonb === 'string') return rec.value_jsonb;
    return JSON.stringify(rec.value_jsonb);
  } catch {
    return String(rec.value_jsonb);
  }
}

/* ================================================================== */
/*  Main component                                                     */
/* ================================================================== */

export function TestDataClient() {
  const { activeProject, loading: projectLoading } = useProject();

  const getHeaders = useCallback((): Record<string, string> => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (activeProject) h['x-project-id'] = String(activeProject.id);
    return h;
  }, [activeProject]);

  const [datasets, setDatasets] = useState<TestDataSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [envFilter, setEnvFilter] = useState<'all' | Environment>('all');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mode, setMode] = useState<'view' | 'create' | 'edit'>('view');
  const [notice, setNotice] = useState<Notice>(null);

  const flash = useCallback((kind: 'success' | 'error', text: string) => {
    setNotice({ kind, text });
    window.setTimeout(() => setNotice(null), 4000);
  }, []);

  /* ---- Load datasets ---- */
  const loadDatasets = useCallback(async () => {
    if (projectLoading) return;
    setLoading(true);
    try {
      const qs = envFilter === 'all' ? '' : `?environment=${envFilter}`;
      const res = await fetch(`/api/test-data${qs}`, { cache: 'no-store', headers: getHeaders() });
      const data = await res.json();
      setDatasets(Array.isArray(data?.datasets) ? data.datasets : []);
    } catch {
      flash('error', 'Failed to load datasets');
      setDatasets([]);
    } finally {
      setLoading(false);
    }
  }, [envFilter, getHeaders, projectLoading, flash]);

  useEffect(() => {
    loadDatasets();
  }, [loadDatasets, activeProject?.id]);

  const selected = useMemo(
    () => datasets.find((d) => d.id === selectedId) ?? null,
    [datasets, selectedId],
  );

  /* ---- Delete dataset ---- */
  const handleDelete = useCallback(async (id: number) => {
    if (!window.confirm('Delete this dataset and all of its records? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/test-data/${id}`, { method: 'DELETE', headers: getHeaders() });
      if (!res.ok) throw new Error();
      flash('success', 'Dataset deleted');
      if (selectedId === id) { setSelectedId(null); setMode('view'); }
      loadDatasets();
    } catch {
      flash('error', 'Failed to delete dataset');
    }
  }, [getHeaders, loadDatasets, selectedId, flash]);

  /* ---- Empty / loading guards ---- */
  const showProjectPrompt = !projectLoading && !activeProject;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Database className="text-emerald-400" size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white font-display tracking-tight">Test Data</h1>
            <p className="text-sm text-slate-400">
              Project-scoped datasets that Script Generation references instead of hallucinating values.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadDatasets}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 bg-[#1e293b] hover:bg-[#283548] border border-[#334155] transition-all"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => { setMode('create'); setSelectedId(null); }}
            disabled={!activeProject}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Plus size={16} />
            New Dataset
          </button>
        </div>
      </div>

      {/* Notice banner */}
      {notice && (
        <div
          className={`mb-4 flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm ${
            notice.kind === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          {notice.kind === 'success' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
          {notice.text}
        </div>
      )}

      {showProjectPrompt && (
        <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-6 text-center">
          <AlertTriangle className="mx-auto text-amber-400 mb-2" size={24} />
          <p className="text-sm text-amber-300">Select or create a project to manage its test data.</p>
        </div>
      )}

      {!showProjectPrompt && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(320px,420px)_1fr] gap-6">
          {/* ---- Left: list + env filter ---- */}
          <div>
            {/* Environment filter */}
            <div className="flex items-center gap-1.5 mb-3 flex-wrap">
              <Server size={14} className="text-slate-500" />
              <button
                onClick={() => setEnvFilter('all')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                  envFilter === 'all'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-[#1e293b] text-slate-400 border-[#334155] hover:text-white'
                }`}
              >
                All
              </button>
              {ENVIRONMENTS.map((e) => (
                <button
                  key={e.value}
                  onClick={() => setEnvFilter(e.value)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                    envFilter === e.value
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-[#1e293b] text-slate-400 border-[#334155] hover:text-white'
                  }`}
                >
                  {e.label}
                </button>
              ))}
            </div>

            {/* Selected dataset preview */}
            {mode === 'view' && selected && (
              <DatasetPreview dataset={selected} getHeaders={getHeaders} />
            )}

            {/* Dataset list */}
            <div className="space-y-2">
              {loading && (
                <div className="flex items-center justify-center py-12 text-slate-500">
                  <Loader2 className="animate-spin mr-2" size={18} /> Loading datasets…
                </div>
              )}

              {!loading && datasets.length === 0 && (
                <div className="rounded-xl bg-[#111c30] border border-[#1e293b] p-8 text-center">
                  <Boxes className="mx-auto text-slate-600 mb-3" size={32} />
                  <p className="text-sm font-medium text-slate-300 mb-2">Create datasets like:</p>
                  <ul className="text-xs text-slate-400 space-y-1 mb-3">
                    <li className="flex items-center justify-center gap-1.5">
                      <span className="text-emerald-400">•</span> valid_users
                    </li>
                    <li className="flex items-center justify-center gap-1.5">
                      <span className="text-emerald-400">•</span> products
                    </li>
                    <li className="flex items-center justify-center gap-1.5">
                      <span className="text-emerald-400">•</span> test_orders
                    </li>
                  </ul>
                  <p className="text-xs text-slate-500">
                    Script Generation will automatically use linked datasets.
                  </p>
                </div>
              )}

              {!loading && datasets.map((ds) => {
                const active = ds.id === selectedId && mode === 'view';
                return (
                  <button
                    key={ds.id}
                    onClick={() => { setSelectedId(ds.id); setMode('view'); }}
                    className={`w-full text-left rounded-xl border p-3.5 transition-all group ${
                      active
                        ? 'bg-emerald-500/10 border-emerald-500/40'
                        : 'bg-[#111c30] border-[#1e293b] hover:border-[#334155]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white truncate">{ds.name}</span>
                          {!ds.is_active && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-600/30 text-slate-400 border border-slate-600/40">
                              inactive
                            </span>
                          )}
                        </div>
                        {ds.description && (
                          <p className="text-xs text-slate-500 truncate mt-0.5">{ds.description}</p>
                        )}
                      </div>
                      <span className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-medium border ${envBadge(ds.environment)}`}>
                        {ds.environment}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1"><Hash size={11} /> v{ds.version}</span>
                      {ds.project_id == null && (
                        <span className="text-amber-400/80">company-wide</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ---- Right: detail / create / edit ---- */}
          <div>
            {mode === 'create' && (
              <DatasetForm
                key="create"
                getHeaders={getHeaders}
                onCancel={() => setMode('view')}
                onSaved={(id) => { setMode('view'); setSelectedId(id); loadDatasets(); flash('success', 'Dataset created'); }}
                onError={(m) => flash('error', m)}
              />
            )}

            {mode === 'edit' && selected && (
              <DatasetForm
                key={`edit-${selected.id}`}
                existing={selected}
                getHeaders={getHeaders}
                onCancel={() => setMode('view')}
                onSaved={() => { setMode('view'); loadDatasets(); flash('success', 'Dataset updated'); }}
                onError={(m) => flash('error', m)}
              />
            )}

            {mode === 'view' && !selected && (
              <div className="rounded-xl bg-[#111c30] border border-[#1e293b] p-10 text-center h-full flex flex-col items-center justify-center">
                <Database className="text-slate-700 mb-3" size={36} />
                <p className="text-sm text-slate-400">Select a dataset to view its records, usage and linkage.</p>
              </div>
            )}

            {mode === 'view' && selected && (
              <DatasetDetail
                dataset={selected}
                getHeaders={getHeaders}
                onEdit={() => setMode('edit')}
                onDelete={() => handleDelete(selected.id)}
                onChanged={loadDatasets}
                flash={flash}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Dataset create / edit form                                         */
/* ================================================================== */

function DatasetForm({
  existing, getHeaders, onCancel, onSaved, onError,
}: {
  existing?: TestDataSet;
  getHeaders: () => Record<string, string>;
  onCancel: () => void;
  onSaved: (id: number) => void;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [environment, setEnvironment] = useState<Environment>(existing?.environment ?? 'shared');
  const [isActive, setIsActive] = useState(existing?.is_active ?? true);
  const [saving, setSaving] = useState(false);

  const editing = !!existing;

  async function handleSubmit() {
    if (!name.trim()) { onError('Dataset name is required'); return; }
    setSaving(true);
    try {
      const url = editing ? `/api/test-data/${existing!.id}` : '/api/test-data';
      const method = editing ? 'PUT' : 'POST';
      const body: any = { name: name.trim(), description: description.trim() || null, environment };
      if (editing) body.is_active = isActive;
      const res = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { onError(data?.error || 'Save failed'); return; }
      onSaved(editing ? existing!.id : data?.dataset?.id);
    } catch {
      onError('Failed to reach server');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl bg-[#111c30] border border-[#1e293b] p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-white">{editing ? 'Edit dataset' : 'New dataset'}</h2>
        <button onClick={onCancel} className="text-slate-500 hover:text-white"><X size={18} /></button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="valid_users"
            className="w-full px-3 py-2 rounded-lg bg-[#0c1222] border border-[#334155] text-sm text-white placeholder:text-slate-600 focus:border-emerald-500/50 focus:outline-none"
          />
          <p className="text-[11px] text-slate-600 mt-1">Materializes to <span className="text-slate-400">data/{name.trim() ? name.trim().replace(/[^a-zA-Z0-9_-]/g, '_') : 'name'}.json</span></p>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Description <span className="text-slate-600">(optional)</span></label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Login credentials for valid user personas"
            className="w-full px-3 py-2 rounded-lg bg-[#0c1222] border border-[#334155] text-sm text-white placeholder:text-slate-600 focus:border-emerald-500/50 focus:outline-none resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Environment</label>
          <div className="flex flex-wrap gap-1.5">
            {ENVIRONMENTS.map((e) => (
              <button
                key={e.value}
                type="button"
                onClick={() => setEnvironment(e.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                  environment === e.value ? e.color : 'bg-[#0c1222] text-slate-400 border-[#334155] hover:text-white'
                }`}
              >
                {e.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-600 mt-1.5">
            Resolution falls back to <span className="text-slate-400">shared</span> when a value isn’t found in the target environment.
          </p>
        </div>

        {editing && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="accent-emerald-500" />
            <span className="text-sm text-slate-300">Active</span>
          </label>
        )}
      </div>

      <div className="flex items-center gap-2 mt-5">
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-all"
        >
          {saving ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />}
          {editing ? 'Save changes' : 'Create dataset'}
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white border border-[#334155]">
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Dataset detail (records + usage + linkage)                         */
/* ================================================================== */

function DatasetDetail({
  dataset, getHeaders, onEdit, onDelete, onChanged, flash,
}: {
  dataset: TestDataSet;
  getHeaders: () => Record<string, string>;
  onEdit: () => void;
  onDelete: () => void;
  onChanged: () => void;
  flash: (kind: 'success' | 'error', text: string) => void;
}) {
  const [records, setRecords] = useState<TestDataRecord[]>([]);
  const [usage, setUsage] = useState<UsageTestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddRecord, setShowAddRecord] = useState(false);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    try {
      const [dRes, uRes] = await Promise.all([
        fetch(`/api/test-data/${dataset.id}`, { cache: 'no-store', headers: getHeaders() }),
        fetch(`/api/test-data/${dataset.id}/usage`, { cache: 'no-store', headers: getHeaders() }),
      ]);
      const d = await dRes.json();
      const u = await uRes.json();
      setRecords(Array.isArray(d?.records) ? d.records : []);
      setUsage(Array.isArray(u?.testCases) ? u.testCases : []);
    } catch {
      flash('error', 'Failed to load dataset detail');
    } finally {
      setLoading(false);
    }
  }, [dataset.id, getHeaders, flash]);

  useEffect(() => { loadDetail(); }, [loadDetail]);

  async function deleteRecord(recordId: number) {
    try {
      const res = await fetch(`/api/test-data/records/${recordId}`, { method: 'DELETE', headers: getHeaders() });
      if (!res.ok) throw new Error();
      flash('success', 'Record deleted');
      loadDetail();
    } catch {
      flash('error', 'Failed to delete record');
    }
  }

  return (
    <div className="space-y-5">
      {/* Header card */}
      <div className="rounded-xl bg-[#111c30] border border-[#1e293b] p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-white truncate">{dataset.name}</h2>
              <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${envBadge(dataset.environment)}`}>
                {dataset.environment}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[11px] text-slate-400 border border-[#334155]">v{dataset.version}</span>
              {!dataset.is_active && (
                <span className="px-2 py-0.5 rounded-md text-[11px] bg-slate-600/30 text-slate-400 border border-slate-600/40">inactive</span>
              )}
            </div>
            {dataset.description && <p className="text-sm text-slate-400 mt-1.5">{dataset.description}</p>}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={onEdit} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#1e293b] border border-[#334155]" title="Edit dataset">
              <Edit3 size={15} />
            </button>
            <button onClick={onDelete} className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-[#334155]" title="Delete dataset">
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-slate-500">
          <Loader2 className="animate-spin mr-2" size={18} /> Loading…
        </div>
      ) : (
        <>
          {/* Records */}
          <div className="rounded-xl bg-[#111c30] border border-[#1e293b] p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ListChecks size={16} className="text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">Records</h3>
                <span className="text-xs text-slate-500">({records.length})</span>
              </div>
              <button
                onClick={() => setShowAddRecord((v) => !v)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30"
              >
                <Plus size={13} /> Add record
              </button>
            </div>

            {showAddRecord && (
              <RecordForm
                datasetId={dataset.id}
                getHeaders={getHeaders}
                onCancel={() => setShowAddRecord(false)}
                onSaved={() => { setShowAddRecord(false); loadDetail(); flash('success', 'Record added'); }}
                onError={(m) => flash('error', m)}
              />
            )}

            {records.length === 0 && !showAddRecord && (
              <p className="text-xs text-slate-600 py-3">No records yet. Add a key/value pair, or reference a secret.</p>
            )}

            {records.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-[#1e293b]">
                      <th className="py-2 pr-3 font-medium">Key</th>
                      <th className="py-2 pr-3 font-medium">Value</th>
                      <th className="py-2 pr-3 font-medium">Type</th>
                      <th className="py-2 pr-3 font-medium w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((rec) => (
                      <tr key={rec.id} className="border-b border-[#1e293b]/60">
                        <td className="py-2 pr-3 font-medium text-slate-200 align-top">{rec.key}</td>
                        <td className="py-2 pr-3 align-top">
                          {rec.is_secret ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-mono">
                              <KeyRound size={12} /> secret_ref:{rec.secret_ref}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono text-xs break-all">{displayValue(rec)}</span>
                          )}
                        </td>
                        <td className="py-2 pr-3 align-top">
                          <span className="text-[11px] text-slate-500">{rec.is_secret ? 'secret' : rec.data_type}</span>
                        </td>
                        <td className="py-2 align-top">
                          <button onClick={() => deleteRecord(rec.id)} className="text-slate-600 hover:text-red-400" title="Delete record">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Linkage + usage */}
          <LinkagePanel dataset={dataset} usage={usage} getHeaders={getHeaders} onChanged={loadDetail} flash={flash} />
        </>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Record form (with secret reference helper)                         */
/* ================================================================== */

function RecordForm({
  datasetId, getHeaders, onCancel, onSaved, onError,
}: {
  datasetId: number;
  getHeaders: () => Record<string, string>;
  onCancel: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [key, setKey] = useState('');
  const [rawValue, setRawValue] = useState('');
  const [isSecret, setIsSecret] = useState(false);
  const [secretRef, setSecretRef] = useState('');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!key.trim()) { onError('Record key is required'); return; }
    if (isSecret && !secretRef.trim()) { onError('Enter the environment variable name for the secret'); return; }

    setSaving(true);
    try {
      const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);
      let body: any;
      if (isSecret) {
        // Never store plaintext — store a placeholder + a reference to the env var.
        const placeholder = rawValue.trim() ? parseValue(rawValue).value : { note: 'resolved at runtime from env var' };
        body = {
          key: key.trim(),
          value: placeholder,
          dataType: 'object',
          isSecret: true,
          secretRef: secretRef.trim(),
          tags: tagList,
        };
      } else {
        const { value, dataType } = parseValue(rawValue);
        body = { key: key.trim(), value, dataType, isSecret: false, tags: tagList };
      }
      const res = await fetch(`/api/test-data/${datasetId}/records`, {
        method: 'POST', headers: getHeaders(), body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { onError(data?.error || 'Failed to add record'); return; }
      onSaved();
    } catch {
      onError('Failed to reach server');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg bg-[#0c1222] border border-[#334155] p-4 mb-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">Key</label>
          <input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="admin"
            className="w-full px-2.5 py-1.5 rounded-md bg-[#0f172a] border border-[#334155] text-sm text-white placeholder:text-slate-600 focus:border-emerald-500/50 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">Tags <span className="text-slate-600">(comma-separated)</span></label>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="login, smoke"
            className="w-full px-2.5 py-1.5 rounded-md bg-[#0f172a] border border-[#334155] text-sm text-white placeholder:text-slate-600 focus:border-emerald-500/50 focus:outline-none"
          />
        </div>
      </div>

      {/* Value type selector (radio buttons) */}
      <div className="mt-3">
        <label className="block text-[11px] font-medium text-slate-400 mb-2">Value Type</label>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={!isSecret}
              onChange={() => setIsSecret(false)}
              className="accent-emerald-500"
            />
            <span className="text-sm text-slate-300">Plain Value</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={isSecret}
              onChange={() => setIsSecret(true)}
              className="accent-amber-500"
            />
            <span className="flex items-center gap-1.5 text-sm text-slate-300">
              <ShieldAlert size={14} className="text-amber-400" /> Secret Reference
            </span>
          </label>
        </div>
      </div>

      {!isSecret ? (
        <div className="mt-3">
          <label className="block text-[11px] font-medium text-slate-400 mb-1">Value</label>
          <textarea
            value={rawValue}
            onChange={(e) => setRawValue(e.target.value)}
            rows={2}
            placeholder='e.g. user@example.com  ·  42  ·  true  ·  {"role":"admin"}'
            className="w-full px-2.5 py-1.5 rounded-md bg-[#0f172a] border border-[#334155] text-sm text-white font-mono placeholder:text-slate-600 focus:border-emerald-500/50 focus:outline-none resize-none"
          />
          <p className="text-[11px] text-slate-600 mt-1">JSON is parsed automatically (numbers, booleans, objects, arrays). Anything else is stored as a string.</p>
        </div>
      ) : (
        <div className="mt-3 rounded-md bg-amber-500/5 border border-amber-500/20 p-3">
          <label className="block text-[11px] font-medium text-amber-300 mb-1">Environment variable name</label>
          <input
            value={secretRef}
            onChange={(e) => setSecretRef(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}
            placeholder="PROD_DB_PASSWORD"
            className="w-full px-2.5 py-1.5 rounded-md bg-[#0f172a] border border-amber-500/30 text-sm text-white font-mono placeholder:text-slate-600 focus:border-amber-500/60 focus:outline-none"
          />
          <p className="text-[11px] text-amber-300/70 mt-1.5">
            Plaintext is never stored. The value resolves at runtime from <span className="font-mono">process.env.{secretRef || 'ENV_VAR'}</span> and appears in data files as
            <span className="font-mono text-amber-200"> secret_ref:{secretRef || 'ENV_VAR'}</span>.
          </p>
          <label className="block text-[11px] font-medium text-slate-400 mt-3 mb-1">Non-secret placeholder <span className="text-slate-600">(optional)</span></label>
          <input
            value={rawValue}
            onChange={(e) => setRawValue(e.target.value)}
            placeholder='{"username":"admin"}'
            className="w-full px-2.5 py-1.5 rounded-md bg-[#0f172a] border border-[#334155] text-sm text-white font-mono placeholder:text-slate-600 focus:border-emerald-500/50 focus:outline-none"
          />
        </div>
      )}

      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50"
        >
          {saving ? <Loader2 className="animate-spin" size={13} /> : <Save size={13} />} Add record
        </button>
        <button onClick={onCancel} className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-400 hover:text-white border border-[#334155]">
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Linkage panel — usage display + link/unlink management             */
/* ================================================================== */

/** Dataset preview panel — shows quick stats and record keys. */
function DatasetPreview({
  dataset, getHeaders,
}: {
  dataset: TestDataSet;
  getHeaders: () => Record<string, string>;
}) {
  const [records, setRecords] = useState<TestDataRecord[]>([]);
  const [usage, setUsage] = useState<UsageTestCase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetch(`/api/test-data/${dataset.id}`, { cache: 'no-store', headers: getHeaders() }),
      fetch(`/api/test-data/${dataset.id}/usage`, { cache: 'no-store', headers: getHeaders() }),
    ])
      .then(async ([dRes, uRes]) => {
        const d = await dRes.json();
        const u = await uRes.json();
        if (!cancelled) {
          setRecords(Array.isArray(d?.records) ? d.records : []);
          setUsage(Array.isArray(u?.testCases) ? u.testCases : []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [dataset.id, getHeaders]);

  const recordKeys = records.slice(0, 5).map((r) => r.key);

  return (
    <div className="rounded-xl bg-[#111c30] border border-emerald-500/30 p-4 mb-3">
      <div className="flex items-center gap-2 mb-3">
        <Database size={15} className="text-emerald-400" />
        <h3 className="text-sm font-semibold text-white truncate">{dataset.name}</h3>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
          <Loader2 className="animate-spin" size={13} /> Loading...
        </div>
      ) : (
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Records</span>
            <span className="font-medium text-emerald-300">{records.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Environment</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${envBadge(dataset.environment)}`}>
              {dataset.environment}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Used by</span>
            <span className="font-medium text-sky-300">{usage.length} test cases</span>
          </div>
          {recordKeys.length > 0 && (
            <div className="pt-2 border-t border-[#1e293b]">
              <p className="text-slate-500 mb-1.5">Preview</p>
              <ul className="space-y-1">
                {recordKeys.map((key) => (
                  <li key={key} className="flex items-center gap-1.5 text-slate-300">
                    <ChevronLeft size={10} className="text-slate-600 rotate-180" />
                    <span className="font-mono text-[11px] truncate">{key}</span>
                  </li>
                ))}
                {records.length > 5 && (
                  <li className="text-slate-600 text-[11px]">...and {records.length - 5} more</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LinkagePanel({
  dataset, usage, getHeaders, onChanged, flash,
}: {
  dataset: TestDataSet;
  usage: UsageTestCase[];
  getHeaders: () => Record<string, string>;
  onChanged: () => void;
  flash: (kind: 'success' | 'error', text: string) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [candidates, setCandidates] = useState<CandidateTestCase[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  const linkedIds = useMemo(() => new Set(usage.map((u) => u.id)), [usage]);

  const loadCandidates = useCallback(async () => {
    setLoadingCandidates(true);
    try {
      const res = await fetch('/api/test-data/link/test-cases', { cache: 'no-store', headers: getHeaders() });
      const data = await res.json();
      setCandidates(Array.isArray(data?.testCases) ? data.testCases : []);
    } catch {
      flash('error', 'Failed to load test cases');
    } finally {
      setLoadingCandidates(false);
    }
  }, [getHeaders, flash]);

  function openPicker() {
    setShowPicker(true);
    if (candidates.length === 0) loadCandidates();
  }

  async function link(testCaseId: number) {
    setBusyId(testCaseId);
    try {
      const res = await fetch(`/api/test-data/test-case/${testCaseId}/datasets/${dataset.id}`, {
        method: 'POST', headers: getHeaders(),
      });
      if (!res.ok) throw new Error();
      flash('success', 'Test case linked');
      onChanged();
    } catch {
      flash('error', 'Failed to link test case');
    } finally {
      setBusyId(null);
    }
  }

  async function unlink(testCaseId: number) {
    setBusyId(testCaseId);
    try {
      const res = await fetch(`/api/test-data/test-case/${testCaseId}/datasets/${dataset.id}`, {
        method: 'DELETE', headers: getHeaders(),
      });
      if (!res.ok) throw new Error();
      flash('success', 'Test case unlinked');
      onChanged();
    } catch {
      flash('error', 'Failed to unlink test case');
    } finally {
      setBusyId(null);
    }
  }

  const filteredCandidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return candidates
      .filter((c) => !linkedIds.has(c.id))
      .filter((c) => !q || c.title.toLowerCase().includes(q) || String(c.id).includes(q));
  }, [candidates, linkedIds, search]);

  return (
    <div className="rounded-xl bg-[#111c30] border border-[#1e293b] p-5">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Link2 size={16} className="text-emerald-400" />
          <h3 className="text-sm font-semibold text-white">Linked test cases</h3>
          <span className="text-xs text-slate-500">({usage.length})</span>
        </div>
        <button
          onClick={openPicker}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30"
        >
          <Plus size={13} /> Link test case
        </button>
      </div>
      <p className="text-[11px] text-slate-600 mb-3">
        When a test case is linked, Script Generation uses <span className="text-slate-400">only</span> these datasets for it — deterministic selection instead of guessing.
      </p>

      {/* Linked list (usage display) */}
      {usage.length === 0 ? (
        <p className="text-xs text-slate-600 py-2">No test cases linked yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {usage.map((tc) => (
            <li key={tc.id} className="flex items-center justify-between gap-2 rounded-lg bg-[#0c1222] border border-[#1e293b] px-3 py-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <FileText size={13} className="text-slate-500 shrink-0" />
                  <span className="text-sm text-slate-200 truncate">{tc.title}</span>
                  <span className="text-[10px] text-slate-600">#{tc.id}</span>
                </div>
                {tc.scenario && <p className="text-[11px] text-slate-600 truncate mt-0.5 pl-5">{tc.scenario}</p>}
              </div>
              <button
                onClick={() => unlink(tc.id)}
                disabled={busyId === tc.id}
                className="shrink-0 text-slate-600 hover:text-red-400 disabled:opacity-50"
                title="Unlink"
              >
                {busyId === tc.id ? <Loader2 className="animate-spin" size={14} /> : <X size={15} />}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Picker */}
      {showPicker && (
        <div className="mt-4 rounded-lg bg-[#0c1222] border border-[#334155] p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-300">Add a test case</span>
            <button onClick={() => setShowPicker(false)} className="text-slate-500 hover:text-white"><X size={15} /></button>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search test cases…"
            className="w-full px-2.5 py-1.5 mb-2 rounded-md bg-[#0f172a] border border-[#334155] text-sm text-white placeholder:text-slate-600 focus:border-emerald-500/50 focus:outline-none"
          />
          {loadingCandidates ? (
            <div className="flex items-center gap-2 text-xs text-slate-500 py-3"><Loader2 className="animate-spin" size={14} /> Loading…</div>
          ) : filteredCandidates.length === 0 ? (
            <p className="text-xs text-slate-600 py-2">No more test cases to link in this project.</p>
          ) : (
            <ul className="max-h-64 overflow-y-auto space-y-1 scrollbar-thin">
              {filteredCandidates.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => link(c.id)}
                    disabled={busyId === c.id}
                    className="w-full flex items-center justify-between gap-2 text-left rounded-md px-2.5 py-2 hover:bg-[#1e293b] disabled:opacity-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-200 truncate">{c.title}</span>
                        <span className="text-[10px] text-slate-600">#{c.id}</span>
                      </div>
                      {c.requirement && <p className="text-[11px] text-slate-600 truncate">{c.requirement}</p>}
                    </div>
                    {busyId === c.id ? <Loader2 className="animate-spin text-emerald-400 shrink-0" size={14} /> : <Plus size={14} className="text-emerald-400 shrink-0" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
