'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Shield, Users, Crown, Eye, Wrench, Check, X, ChevronDown, ChevronUp,
  Lock, Activity, BarChart3, GitPullRequest, Bug, Sparkles, Database,
  FlaskConical, ClipboardCheck, ShieldAlert, Microscope, CreditCard,
  FileText, Settings, ArrowRight, Info, Briefcase,
} from 'lucide-react';

/**
 * Roles & Permissions Reference (READ-ONLY)
 * ------------------------------------------------------------------
 * This page documents what each role is allowed to do. It is purely a
 * reference — adding, editing, removing members and assigning roles is done
 * on the User Management page (/admin/users), which is backed by the real
 * /api/users API. Keeping the two concerns separate removes the previous
 * confusion where this page duplicated User Management with mock data.
 *
 * The per-role user counts shown on the role cards are pulled live from
 * /api/users so the reference reflects the real team composition.
 */

interface Role {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  permissions: Record<string, boolean>;
}

interface ApiUser {
  id: number;
  role: string;
  is_active?: boolean;
}

const PERMISSION_CATEGORIES = [
  {
    category: 'Core Operations',
    permissions: [
      { key: 'healing_run', label: 'Run healing jobs', icon: Sparkles },
      { key: 'healing_view', label: 'View healing results', icon: Eye },
      { key: 'script_gen', label: 'Generate scripts', icon: FlaskConical },
      { key: 'coverage_gen', label: 'Generate coverage', icon: Shield },
      { key: 'rca_run', label: 'Run RCA analysis', icon: Microscope },
    ],
  },
  {
    category: 'Intelligence',
    permissions: [
      { key: 'release_risk', label: 'View release risk', icon: ShieldAlert },
      { key: 'release_signoff', label: 'Approve signoff', icon: ClipboardCheck },
      { key: 'learning_view', label: 'View learning engine', icon: Database },
      { key: 'dom_memory', label: 'Access DOM memory', icon: Database },
      { key: 'similarity', label: 'Use similarity engine', icon: Bug },
    ],
  },
  {
    category: 'Administration',
    permissions: [
      { key: 'user_manage', label: 'Manage users', icon: Users },
      { key: 'role_manage', label: 'Manage roles', icon: Shield },
      { key: 'billing_manage', label: 'Manage billing', icon: CreditCard },
      { key: 'audit_view', label: 'View audit logs', icon: Activity },
      { key: 'integrations', label: 'Manage own integrations', icon: Settings },
      { key: 'api_keys', label: 'Manage API keys', icon: Lock },
      { key: 'company_settings', label: 'Company settings', icon: Settings },
    ],
  },
  {
    category: 'Reporting',
    permissions: [
      { key: 'analytics_view', label: 'View analytics', icon: BarChart3 },
      { key: 'roi_view', label: 'View ROI dashboard', icon: BarChart3 },
      { key: 'reports_export', label: 'Export reports', icon: FileText },
      { key: 'pr_create', label: 'Create PRs', icon: GitPullRequest },
    ],
  },
];

const ALL_TRUE = Object.fromEntries(
  PERMISSION_CATEGORIES.flatMap((c) => c.permissions).map((p) => [p.key, true]),
);

// Role IDs are aligned with the backend's VALID_ROLES:
// ['admin', 'qa_manager', 'qa_engineer', 'viewer', 'client']
const ROLES: Role[] = [
  {
    id: 'admin',
    name: 'Admin',
    description: 'Full access to all features, billing, and administration',
    icon: Crown,
    color: 'amber',
    permissions: ALL_TRUE,
  },
  {
    id: 'qa_manager',
    name: 'QA Manager',
    description: 'Analytics, approvals, and team oversight',
    icon: Shield,
    color: 'emerald',
    permissions: {
      healing_run: true, healing_view: true, script_gen: true, coverage_gen: true, rca_run: true,
      release_risk: true, release_signoff: true, learning_view: true, dom_memory: true, similarity: true,
      user_manage: false, role_manage: false, billing_manage: false, audit_view: true, integrations: true, api_keys: false, company_settings: false,
      analytics_view: true, roi_view: true, reports_export: true, pr_create: true,
    },
  },
  {
    id: 'qa_engineer',
    name: 'QA Engineer',
    description: 'Run healings, generate scripts, view results',
    icon: Wrench,
    color: 'blue',
    permissions: {
      healing_run: true, healing_view: true, script_gen: true, coverage_gen: true, rca_run: true,
      release_risk: true, release_signoff: false, learning_view: true, dom_memory: true, similarity: true,
      user_manage: false, role_manage: false, billing_manage: false, audit_view: false, integrations: true, api_keys: false, company_settings: false,
      analytics_view: true, roi_view: false, reports_export: false, pr_create: true,
    },
  },
  {
    id: 'viewer',
    name: 'Viewer',
    description: 'Read-only access to dashboards and reports',
    icon: Eye,
    color: 'slate',
    permissions: {
      healing_run: false, healing_view: true, script_gen: false, coverage_gen: false, rca_run: false,
      release_risk: true, release_signoff: false, learning_view: true, dom_memory: false, similarity: false,
      user_manage: false, role_manage: false, billing_manage: false, audit_view: false, integrations: false, api_keys: false, company_settings: false,
      analytics_view: true, roi_view: true, reports_export: false, pr_create: false,
    },
  },
  {
    id: 'client',
    name: 'Client',
    description: 'Limited external stakeholder access to shared reports',
    icon: Briefcase,
    color: 'purple',
    permissions: {
      healing_run: false, healing_view: true, script_gen: false, coverage_gen: false, rca_run: false,
      release_risk: false, release_signoff: false, learning_view: false, dom_memory: false, similarity: false,
      user_manage: false, role_manage: false, billing_manage: false, audit_view: false, integrations: false, api_keys: false, company_settings: false,
      analytics_view: true, roi_view: false, reports_export: true, pr_create: false,
    },
  },
];

export default function RolesClient() {
  const [showPermissions, setShowPermissions] = useState(true);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loadingCounts, setLoadingCounts] = useState(true);

  // Pull real per-role active-user counts from the live users API so the
  // reference reflects the actual team (no more mock member list).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/users', { cache: 'no-store' });
        const json = await res.json();
        const users: ApiUser[] = json?.data || [];
        const tally: Record<string, number> = {};
        for (const u of users) {
          if (u.is_active === false) continue;
          tally[u.role] = (tally[u.role] || 0) + 1;
        }
        if (!cancelled) setCounts(tally);
      } catch {
        if (!cancelled) setCounts({});
      } finally {
        if (!cancelled) setLoadingCounts(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-[#0f172a] p-6 lg:p-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <Shield size={20} className="text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Roles &amp; Permissions Reference</h1>
            <p className="text-sm text-slate-400">A read-only guide to what each role can do</p>
          </div>
        </div>
      </div>

      {/* Info banner pointing to User Management for actions */}
      <div className="mb-8 rounded-xl bg-blue-500/5 border border-blue-500/20 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-start gap-3 flex-1">
          <Info size={18} className="text-blue-400 mt-0.5 shrink-0" />
          <p className="text-sm text-slate-300 leading-relaxed">
            This page is a <span className="font-semibold text-white">reference only</span>. To
            invite people, change someone&apos;s role, deactivate accounts, or otherwise manage your
            team, use <span className="font-semibold text-white">User Management</span>.
          </p>
        </div>
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold rounded-xl transition-colors whitespace-nowrap"
        >
          <Users size={15} />
          Go to User Management
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* ─── Role Cards (with live counts) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {ROLES.map((role) => {
          const Icon = role.icon;
          const count = counts[role.id] ?? 0;
          return (
            <div
              key={role.id}
              className="text-left rounded-xl p-4 border bg-[#1e293b]/60 border-slate-700/50"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-9 h-9 rounded-lg bg-${role.color}-500/10 flex items-center justify-center`}>
                  <Icon size={18} className={`text-${role.color}-400`} />
                </div>
                <span className="text-xs text-slate-500">
                  {loadingCounts ? '…' : `${count} ${count === 1 ? 'user' : 'users'}`}
                </span>
              </div>
              <h3 className="text-sm font-bold text-white mb-0.5">{role.name}</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">{role.description}</p>
            </div>
          );
        })}
      </div>

      {/* ─── Permission Matrix ─── */}
      <div className="mb-8">
        <button
          onClick={() => setShowPermissions(!showPermissions)}
          className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white transition-colors mb-4"
        >
          <Lock size={14} />
          Permission Matrix
          {showPermissions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {showPermissions && (
          <div className="rounded-2xl bg-[#1e293b]/40 border border-slate-700/50 overflow-x-auto">
            <div className="min-w-[760px]">
              {/* Header */}
              <div className="grid grid-cols-6 gap-0 text-xs font-semibold border-b border-slate-700/50 bg-[#1e293b]/80">
                <div className="p-3 text-slate-400">Permission</div>
                <div className="p-3 text-center text-amber-400">Admin</div>
                <div className="p-3 text-center text-emerald-400">QA Manager</div>
                <div className="p-3 text-center text-blue-400">QA Engineer</div>
                <div className="p-3 text-center text-slate-400">Viewer</div>
                <div className="p-3 text-center text-purple-400">Client</div>
              </div>

              {PERMISSION_CATEGORIES.map((cat) => (
                <div key={cat.category}>
                  <div className="px-3 py-2 bg-slate-800/40 border-b border-slate-700/30">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{cat.category}</span>
                  </div>
                  {cat.permissions.map((perm, idx) => {
                    const PermIcon = perm.icon;
                    return (
                      <div key={perm.key} className={`grid grid-cols-6 gap-0 text-sm border-b border-slate-800/50 ${idx % 2 === 0 ? 'bg-[#0f172a]/20' : ''}`}>
                        <div className="p-2.5 px-3 flex items-center gap-2">
                          <PermIcon size={12} className="text-slate-500" />
                          <span className="text-xs text-slate-300">{perm.label}</span>
                        </div>
                        {ROLES.map((role) => (
                          <div key={role.id} className="p-2.5 flex items-center justify-center">
                            {role.permissions[perm.key] ? (
                              <Check size={15} className="text-emerald-400" />
                            ) : (
                              <X size={15} className="text-slate-700" />
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footnote re: per-user tools/integrations */}
      <div className="rounded-xl bg-[#1e293b]/40 border border-slate-700/50 p-4 flex items-start gap-3">
        <Settings size={16} className="text-slate-500 mt-0.5 shrink-0" />
        <p className="text-xs text-slate-400 leading-relaxed">
          <span className="font-semibold text-slate-300">Note on integrations:</span> tool
          connections (GitHub, Jira, Slack, Teams) are scoped to each individual user. Connecting a
          tool on the Tools page only grants access to <span className="text-slate-300">your own</span> account —
          credentials are never shared with other team members.
        </p>
      </div>
    </div>
  );
}
