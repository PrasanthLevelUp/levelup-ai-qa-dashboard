'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import {
  Building2, Plus, CheckCircle2, RefreshCw, Loader2,
  Copy, Check, KeyRound, Ban, Play, CalendarPlus, ChevronDown, ChevronUp,
} from 'lucide-react';

// ── Plan catalog (labels only; authoritative values come from backend) ──────
const PLAN_OPTIONS = [
  { slug: 'free', label: 'Free POC', hint: '$0 · 50 credits · 1 user' },
  { slug: 'starter', label: 'Starter', hint: '$149/mo · 500 credits · 5 users' },
  { slug: 'growth', label: 'Growth', hint: '$999/mo · 5000 credits · 25 users' },
];

const TRIAL_PRESETS = [7, 15, 30];

interface Company {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  subscription_status?: string | null;
  period_end?: string | null;
  plan_name?: string | null;
  plan_slug?: string | null;
  credits_monthly?: number | null;
  max_users?: number | null;
  user_count?: number | null;
}

interface Credentials {
  companyName: string;
  adminEmail: string;
  temporaryPassword: string;
  planName?: string;
  trialEndsAt?: string | null;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
      }}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-[#1e293b] text-slate-300 hover:text-white border border-[#334155] transition-colors"
    >
      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function StatusBadge({ company }: { company: Company }) {
  if (!company.is_active) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400">
        <Ban size={12} /> Suspended
      </span>
    );
  }
  const s = company.subscription_status;
  if (s === 'trialing') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400">
        <CalendarPlus size={12} /> Trial
      </span>
    );
  }
  if (s === 'suspended') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400">
        <Ban size={12} /> Suspended
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400">
      <CheckCircle2 size={12} /> Active
    </span>
  );
}

export function CompaniesClient() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Create form fields
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [planSlug, setPlanSlug] = useState('free');
  const [trialDays, setTrialDays] = useState(30);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [credentials, setCredentials] = useState<Credentials | null>(null);

  // Row expansion + per-row action state
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [rowBusy, setRowBusy] = useState<number | null>(null);
  const [rowMsg, setRowMsg] = useState<{ id: number; text: string; kind: 'ok' | 'err' } | null>(null);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/companies');
      const data = await res.json();
      if (data.success) setCompanies(data.data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  // Auto-generate slug from name
  useEffect(() => {
    setSlug(name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  }, [name]);

  function resetForm() {
    setName(''); setSlug(''); setAdminName(''); setAdminEmail('');
    setPlanSlug('free'); setTrialDays(30); setError('');
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !slug.trim() || !adminName.trim() || !adminEmail.trim()) return;
    setCreating(true);
    setError('');
    setCredentials(null);
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          adminName: adminName.trim(),
          adminEmail: adminEmail.trim(),
          planSlug,
          trialDays: Number(trialDays) || 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const d = data.data;
        if (d?.admin?.temporaryPassword) {
          setCredentials({
            companyName: d.company?.name || name.trim(),
            adminEmail: d.admin.email,
            temporaryPassword: d.admin.temporaryPassword,
            planName: d.plan?.name,
            trialEndsAt: d.trialEndsAt,
          });
        }
        resetForm();
        setShowForm(false);
        fetchCompanies();
      } else {
        setError(data.error || data.message || 'Failed to create company');
      }
    } catch {
      setError('Network error');
    } finally {
      setCreating(false);
    }
  }

  // ── Per-company actions ───────────────────────────────────────────────────
  async function runAction(id: number, path: string, body: Record<string, unknown>, okText: string) {
    setRowBusy(id);
    setRowMsg(null);
    try {
      const res = await fetch(`/api/backend/companies/${id}/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.success !== false) {
        setRowMsg({ id, text: okText, kind: 'ok' });
        await fetchCompanies();
      } else {
        setRowMsg({ id, text: data.error || data.message || 'Action failed', kind: 'err' });
      }
    } catch {
      setRowMsg({ id, text: 'Network error', kind: 'err' });
    } finally {
      setRowBusy(null);
    }
  }

  const changePlan = (id: number, ps: string) => runAction(id, 'plan', { planSlug: ps }, `Plan changed to ${ps}`);
  const suspend = (id: number) => runAction(id, 'suspend', {}, 'Company suspended');
  const activate = (id: number) => runAction(id, 'activate', {}, 'Company reactivated');
  const extendTrial = (id: number, days: number) => runAction(id, 'extend-trial', { days }, `Trial extended by ${days} days`);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white font-display">Company Management</h2>
          <p className="text-sm text-slate-400 mt-1">Onboard customers, assign plans, manage trials & access</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchCompanies}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-[#1e293b] text-slate-300 hover:text-white border border-[#334155] hover:border-slate-500 transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => { setShowForm(!showForm); setCredentials(null); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
          >
            <Plus size={14} />
            Onboard Company
          </button>
        </div>
      </div>

      {/* Credentials panel (after successful onboarding) */}
      {credentials && (
        <div className="bg-emerald-500/5 border border-emerald-500/30 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <KeyRound size={18} className="text-emerald-400" />
            <h3 className="text-lg font-semibold text-white">Admin credentials — copy & share now</h3>
          </div>
          <p className="text-sm text-amber-300/90">
            This temporary password is shown once. Share it securely with the customer; they should change it on first login.
          </p>
          <div className="grid gap-3">
            <div className="flex items-center justify-between bg-[#0f1a2e] border border-[#1e293b] rounded-lg px-4 py-3">
              <div>
                <span className="block text-xs text-slate-500">Company</span>
                <span className="text-sm text-white">{credentials.companyName}</span>
              </div>
              {credentials.planName && <span className="text-xs text-slate-400">{credentials.planName}{credentials.trialEndsAt ? ` · trial ends ${new Date(credentials.trialEndsAt).toLocaleDateString()}` : ''}</span>}
            </div>
            <div className="flex items-center justify-between bg-[#0f1a2e] border border-[#1e293b] rounded-lg px-4 py-3">
              <div>
                <span className="block text-xs text-slate-500">Login email</span>
                <span className="text-sm text-white font-mono">{credentials.adminEmail}</span>
              </div>
              <CopyButton value={credentials.adminEmail} />
            </div>
            <div className="flex items-center justify-between bg-[#0f1a2e] border border-[#1e293b] rounded-lg px-4 py-3">
              <div>
                <span className="block text-xs text-slate-500">Temporary password</span>
                <span className="text-sm text-white font-mono">{credentials.temporaryPassword}</span>
              </div>
              <CopyButton value={credentials.temporaryPassword} />
            </div>
          </div>
          <button
            onClick={() => setCredentials(null)}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-[#0f1a2e] border border-[#1e293b] rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white">Onboard New Company</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Company Name</label>
              <input
                type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Corp"
                className="w-full px-3 py-2 rounded-lg bg-[#1e293b] border border-[#334155] text-white text-sm placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Slug (URL-safe)</label>
              <input
                type="text" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="acme-corp"
                className="w-full px-3 py-2 rounded-lg bg-[#1e293b] border border-[#334155] text-white text-sm placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Admin Name</label>
              <input
                type="text" value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="Jane Doe"
                className="w-full px-3 py-2 rounded-lg bg-[#1e293b] border border-[#334155] text-white text-sm placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Admin Email</label>
              <input
                type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="jane@acme.com"
                className="w-full px-3 py-2 rounded-lg bg-[#1e293b] border border-[#334155] text-white text-sm placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Plan selection */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Plan</label>
            <div className="grid grid-cols-3 gap-3">
              {PLAN_OPTIONS.map((p) => (
                <button
                  key={p.slug} type="button" onClick={() => setPlanSlug(p.slug)}
                  className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                    planSlug === p.slug
                      ? 'border-emerald-500 bg-emerald-500/10 text-white'
                      : 'border-[#334155] bg-[#1e293b] text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <span className="block font-medium">{p.label}</span>
                  <span className="block text-xs text-slate-400 mt-0.5">{p.hint}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Trial days */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Trial Days</label>
            <input
              type="number" min={0} max={365} value={trialDays}
              onChange={(e) => setTrialDays(Number(e.target.value))}
              className="w-32 px-3 py-2 rounded-lg bg-[#1e293b] border border-[#334155] text-white text-sm focus:border-emerald-500 focus:outline-none"
            />
            <span className="ml-2 text-xs text-slate-500">Set 0 for immediate paid/active access.</span>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-3">
            <button
              type="submit" disabled={creating}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
            >
              {creating && <Loader2 size={14} className="animate-spin" />}
              Create & Generate Login
            </button>
            <button
              type="button" onClick={() => { setShowForm(false); resetForm(); }}
              className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white border border-[#334155] hover:border-slate-500 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Companies Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="text-emerald-400 animate-spin" />
        </div>
      ) : companies.length === 0 ? (
        <div className="text-center py-20">
          <Building2 size={48} className="mx-auto text-slate-600 mb-4" />
          <p className="text-slate-400">No companies configured yet</p>
        </div>
      ) : (
        <div className="bg-[#0f1a2e] border border-[#1e293b] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1e293b]">
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Name</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Plan</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Users</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Trial / Period ends</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Manage</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => {
                const expanded = expandedId === c.id;
                const busy = rowBusy === c.id;
                return (
                  <Fragment key={c.id}>
                    <tr className="border-b border-[#1e293b]/50 hover:bg-[#1e293b]/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <Building2 size={14} className="text-emerald-400" />
                          </div>
                          <div>
                            <span className="block text-sm font-medium text-white">{c.name}</span>
                            <span className="block text-xs text-slate-500 font-mono">{c.slug}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300">{c.plan_name || '—'}</td>
                      <td className="px-6 py-4"><StatusBadge company={c} /></td>
                      <td className="px-6 py-4 text-sm text-slate-400">
                        {c.user_count != null ? c.user_count : '—'}{c.max_users != null ? ` / ${c.max_users}` : ''}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">
                        {c.period_end ? new Date(c.period_end).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => { setExpandedId(expanded ? null : c.id); setRowMsg(null); }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-[#1e293b] text-slate-300 hover:text-white border border-[#334155] hover:border-slate-500 transition-colors"
                        >
                          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          Manage
                        </button>
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="bg-[#0b1526]">
                        <td colSpan={6} className="px-6 py-5">
                          <div className="flex flex-wrap items-start gap-6">
                            {/* Change plan */}
                            <div>
                              <span className="block text-xs font-medium text-slate-400 mb-2">Change Plan</span>
                              <div className="flex gap-2">
                                {PLAN_OPTIONS.map((p) => (
                                  <button
                                    key={p.slug} disabled={busy || c.plan_slug === p.slug}
                                    onClick={() => changePlan(c.id, p.slug)}
                                    className={`px-3 py-1.5 rounded-lg text-xs border transition-colors disabled:opacity-40 ${
                                      c.plan_slug === p.slug
                                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                                        : 'border-[#334155] bg-[#1e293b] text-slate-300 hover:text-white hover:border-slate-500'
                                    }`}
                                  >
                                    {p.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Extend trial */}
                            <div>
                              <span className="block text-xs font-medium text-slate-400 mb-2">Extend Trial</span>
                              <div className="flex gap-2">
                                {TRIAL_PRESETS.map((d) => (
                                  <button
                                    key={d} disabled={busy}
                                    onClick={() => extendTrial(c.id, d)}
                                    className="px-3 py-1.5 rounded-lg text-xs border border-[#334155] bg-[#1e293b] text-slate-300 hover:text-white hover:border-slate-500 transition-colors disabled:opacity-40"
                                  >
                                    +{d}d
                                  </button>
                                ))}
                                <CustomExtend disabled={busy} onExtend={(d) => extendTrial(c.id, d)} />
                              </div>
                            </div>

                            {/* Access control */}
                            <div>
                              <span className="block text-xs font-medium text-slate-400 mb-2">Access</span>
                              {c.is_active ? (
                                <button
                                  disabled={busy} onClick={() => suspend(c.id)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20 transition-colors disabled:opacity-40"
                                >
                                  {busy ? <Loader2 size={12} className="animate-spin" /> : <Ban size={12} />} Suspend
                                </button>
                              ) : (
                                <button
                                  disabled={busy} onClick={() => activate(c.id)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition-colors disabled:opacity-40"
                                >
                                  {busy ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />} Reactivate
                                </button>
                              )}
                            </div>
                          </div>
                          {rowMsg && rowMsg.id === c.id && (
                            <p className={`mt-3 text-xs ${rowMsg.kind === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>{rowMsg.text}</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CustomExtend({ disabled, onExtend }: { disabled: boolean; onExtend: (days: number) => void }) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState('');
  if (!open) {
    return (
      <button
        type="button" disabled={disabled} onClick={() => setOpen(true)}
        className="px-3 py-1.5 rounded-lg text-xs border border-[#334155] bg-[#1e293b] text-slate-300 hover:text-white hover:border-slate-500 transition-colors disabled:opacity-40"
      >
        Custom
      </button>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <input
        type="number" min={1} max={365} value={val} onChange={(e) => setVal(e.target.value)} placeholder="days" autoFocus
        className="w-20 px-2 py-1.5 rounded-lg bg-[#1e293b] border border-[#334155] text-white text-xs focus:border-emerald-500 focus:outline-none"
      />
      <button
        type="button" disabled={disabled || !val}
        onClick={() => { const d = Number(val); if (d > 0) { onExtend(d); setOpen(false); setVal(''); } }}
        className="px-2 py-1.5 rounded-lg text-xs bg-emerald-600 text-white hover:bg-emerald-500 transition-colors disabled:opacity-40"
      >
        Apply
      </button>
      <button
        type="button" onClick={() => { setOpen(false); setVal(''); }}
        className="px-2 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white transition-colors"
      >
        ✕
      </button>
    </div>
  );
}
