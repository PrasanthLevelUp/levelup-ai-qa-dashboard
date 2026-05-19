'use client';

import { useState } from 'react';
import {
  Shield, Users, Crown, Eye, Wrench, Plus, Edit2, Trash2,
  Check, X, ChevronDown, ChevronUp, Lock, Unlock, Search,
  UserPlus, Settings, Activity, BarChart3, GitPullRequest,
  Bug, Sparkles, Database, FlaskConical, ClipboardCheck,
  ShieldAlert, Microscope, CreditCard, FileText
} from 'lucide-react';

interface Role {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  userCount: number;
  permissions: Record<string, boolean>;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  lastActive: string;
  status: 'active' | 'inactive' | 'invited';
  avatar: string;
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
      { key: 'integrations', label: 'Manage integrations', icon: Settings },
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

const ROLES: Role[] = [
  {
    id: 'owner',
    name: 'Owner',
    description: 'Full access to all features, billing, and administration',
    icon: Crown,
    color: 'amber',
    userCount: 1,
    permissions: Object.fromEntries(
      PERMISSION_CATEGORIES.flatMap(c => c.permissions).map(p => [p.key, true])
    ),
  },
  {
    id: 'qa_manager',
    name: 'QA Manager',
    description: 'Analytics, job management, and team oversight',
    icon: Shield,
    color: 'emerald',
    userCount: 3,
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
    userCount: 6,
    permissions: {
      healing_run: true, healing_view: true, script_gen: true, coverage_gen: true, rca_run: true,
      release_risk: true, release_signoff: false, learning_view: true, dom_memory: true, similarity: true,
      user_manage: false, role_manage: false, billing_manage: false, audit_view: false, integrations: false, api_keys: false, company_settings: false,
      analytics_view: true, roi_view: false, reports_export: false, pr_create: true,
    },
  },
  {
    id: 'viewer',
    name: 'Viewer',
    description: 'Read-only access to dashboards and reports',
    icon: Eye,
    color: 'slate',
    userCount: 2,
    permissions: {
      healing_run: false, healing_view: true, script_gen: false, coverage_gen: false, rca_run: false,
      release_risk: true, release_signoff: false, learning_view: true, dom_memory: false, similarity: false,
      user_manage: false, role_manage: false, billing_manage: false, audit_view: false, integrations: false, api_keys: false, company_settings: false,
      analytics_view: true, roi_view: true, reports_export: false, pr_create: false,
    },
  },
];

const TEAM_MEMBERS: TeamMember[] = [
  { id: '1', name: 'Prasanth Kumar', email: 'prasanth@levelup.io', role: 'owner', lastActive: '2 min ago', status: 'active', avatar: 'PK' },
  { id: '2', name: 'Ananya Sharma', email: 'ananya@levelup.io', role: 'qa_manager', lastActive: '15 min ago', status: 'active', avatar: 'AS' },
  { id: '3', name: 'Rahul Patel', email: 'rahul@levelup.io', role: 'qa_manager', lastActive: '1 hr ago', status: 'active', avatar: 'RP' },
  { id: '4', name: 'Priya Nair', email: 'priya@levelup.io', role: 'qa_manager', lastActive: '3 hrs ago', status: 'active', avatar: 'PN' },
  { id: '5', name: 'Vikram Singh', email: 'vikram@levelup.io', role: 'qa_engineer', lastActive: '30 min ago', status: 'active', avatar: 'VS' },
  { id: '6', name: 'Deepa Menon', email: 'deepa@levelup.io', role: 'qa_engineer', lastActive: '45 min ago', status: 'active', avatar: 'DM' },
  { id: '7', name: 'Arjun Das', email: 'arjun@levelup.io', role: 'qa_engineer', lastActive: '2 hrs ago', status: 'active', avatar: 'AD' },
  { id: '8', name: 'Kavita Reddy', email: 'kavita@levelup.io', role: 'qa_engineer', lastActive: '1 day ago', status: 'inactive', avatar: 'KR' },
  { id: '9', name: 'Suresh Iyer', email: 'suresh@levelup.io', role: 'qa_engineer', lastActive: '5 hrs ago', status: 'active', avatar: 'SI' },
  { id: '10', name: 'Meera Joshi', email: 'meera@levelup.io', role: 'qa_engineer', lastActive: '3 hrs ago', status: 'active', avatar: 'MJ' },
  { id: '11', name: 'John Smith', email: 'john@client.com', role: 'viewer', lastActive: '2 days ago', status: 'active', avatar: 'JS' },
  { id: '12', name: 'Sarah Chen', email: 'sarah@client.com', role: 'viewer', lastActive: 'Pending', status: 'invited', avatar: 'SC' },
];

export default function RolesClient() {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPermissions, setShowPermissions] = useState(false);

  const filteredMembers = TEAM_MEMBERS.filter(m =>
    (!selectedRole || m.role === selectedRole) &&
    (!searchQuery || m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#0f172a] p-6 lg:p-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <Shield size={20} className="text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Roles & Access Control</h1>
            <p className="text-sm text-slate-400">Manage team roles, permissions, and members</p>
          </div>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold rounded-xl transition-colors">
          <UserPlus size={15} />
          Invite Member
        </button>
      </div>

      {/* ─── Role Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {ROLES.map((role) => {
          const Icon = role.icon;
          const isSelected = selectedRole === role.id;
          return (
            <button
              key={role.id}
              onClick={() => setSelectedRole(isSelected ? null : role.id)}
              className={`text-left rounded-xl p-4 border transition-all duration-200 ${
                isSelected
                  ? `bg-${role.color}-500/10 border-${role.color}-500/30 ring-1 ring-${role.color}-500/20`
                  : 'bg-[#1e293b]/60 border-slate-700/50 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-9 h-9 rounded-lg bg-${role.color}-500/10 flex items-center justify-center`}>
                  <Icon size={18} className={`text-${role.color}-400`} />
                </div>
                <span className="text-xs text-slate-500">{role.userCount} users</span>
              </div>
              <h3 className="text-sm font-bold text-white mb-0.5">{role.name}</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">{role.description}</p>
            </button>
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
          <div className="rounded-2xl bg-[#1e293b]/40 border border-slate-700/50 overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-5 gap-0 text-xs font-semibold border-b border-slate-700/50 bg-[#1e293b]/80">
              <div className="p-3 text-slate-400">Permission</div>
              <div className="p-3 text-center text-amber-400">Owner</div>
              <div className="p-3 text-center text-emerald-400">QA Manager</div>
              <div className="p-3 text-center text-blue-400">QA Engineer</div>
              <div className="p-3 text-center text-slate-400">Viewer</div>
            </div>

            {PERMISSION_CATEGORIES.map((cat) => (
              <div key={cat.category}>
                <div className="px-3 py-2 bg-slate-800/40 border-b border-slate-700/30">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{cat.category}</span>
                </div>
                {cat.permissions.map((perm, idx) => {
                  const PermIcon = perm.icon;
                  return (
                    <div key={perm.key} className={`grid grid-cols-5 gap-0 text-sm border-b border-slate-800/50 ${idx % 2 === 0 ? 'bg-[#0f172a]/20' : ''}`}>
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
        )}
      </div>

      {/* ─── Team Members Table ─── */}
      <div className="rounded-2xl bg-[#1e293b]/60 border border-slate-700/50 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <h3 className="text-lg font-bold text-white">Team Members ({filteredMembers.length})</h3>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-[#0f172a] border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 w-64"
            />
          </div>
        </div>

        <div className="space-y-2">
          {filteredMembers.map((member) => {
            const role = ROLES.find(r => r.id === member.role);
            const RoleIcon = role?.icon || Eye;
            return (
              <div key={member.id} className="flex items-center justify-between p-3 rounded-xl bg-[#0f172a]/60 border border-slate-700/40 hover:border-slate-600/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full bg-${role?.color || 'slate'}-500/20 flex items-center justify-center text-xs font-bold text-${role?.color || 'slate'}-400`}>
                    {member.avatar}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{member.name}</span>
                      {member.status === 'invited' && (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">Invited</span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500">{member.email}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="hidden sm:flex items-center gap-1.5">
                    <RoleIcon size={12} className={`text-${role?.color || 'slate'}-400`} />
                    <span className={`text-xs font-medium text-${role?.color || 'slate'}-400`}>{role?.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 hidden md:block w-20 text-right">{member.lastActive}</span>
                  <div className={`w-2 h-2 rounded-full ${
                    member.status === 'active' ? 'bg-emerald-400' :
                    member.status === 'invited' ? 'bg-amber-400 animate-pulse' :
                    'bg-slate-600'
                  }`} />
                  <button className="text-slate-500 hover:text-white transition-colors p-1">
                    <Edit2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
