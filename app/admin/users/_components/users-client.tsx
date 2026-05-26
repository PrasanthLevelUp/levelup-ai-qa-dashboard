'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users, UserPlus, Shield, Eye, Wrench, Crown, Search,
  MoreVertical, Check, X, Copy, RefreshCw, Trash2,
  KeyRound, ChevronDown, AlertCircle, CheckCircle2, Mail,
  Clock, UserCog
} from 'lucide-react';

/* ────────────────────────────────────────────────────────── */
/*  Types                                                     */
/* ────────────────────────────────────────────────────────── */

interface User {
  id: number;
  username: string;
  role: string;
  company_name: string | null;
  company_id: number | null;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

interface InviteCredentials {
  email: string;
  temporaryPassword: string;
  mustChangePassword: boolean;
}

/* ────────────────────────────────────────────────────────── */
/*  Constants                                                 */
/* ────────────────────────────────────────────────────────── */

const ROLES = [
  { value: 'admin', label: 'Admin', icon: Crown, color: 'amber', description: 'Full access to all features' },
  { value: 'qa_manager', label: 'QA Manager', icon: Shield, color: 'emerald', description: 'Analytics, approvals, team oversight' },
  { value: 'qa_engineer', label: 'QA Engineer', icon: Wrench, color: 'blue', description: 'Run healings, generate scripts' },
  { value: 'viewer', label: 'Viewer', icon: Eye, color: 'slate', description: 'Read-only dashboard access' },
];

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  qa_manager: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  qa_engineer: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  viewer: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  client: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

function getRoleIcon(role: string) {
  const r = ROLES.find(r => r.value === role);
  return r ? r.icon : UserCog;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

/* ────────────────────────────────────────────────────────── */
/*  Component                                                 */
/* ────────────────────────────────────────────────────────── */

export default function UsersClient() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');

  // Invite modal
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('qa_engineer');
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<InviteCredentials | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Action menu
  const [actionMenuId, setActionMenuId] = useState<number | null>(null);
  const [resetResult, setResetResult] = useState<{ userId: number; password: string } | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  /* ── Fetch Users ──────────────────────────────────────── */
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/users', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setUsers(data.data || []);
        setError(null);
      } else {
        setError(data.error || 'Failed to load users');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  /* ── Invite User ──────────────────────────────────────── */
  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteError(null);
    try {
      const res = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, name: inviteName, role: inviteRole }),
      });
      const data = await res.json();
      if (data.success) {
        setInviteResult(data.credentials);
        showToast(`User ${inviteEmail} created successfully!`);
        fetchUsers();
      } else {
        setInviteError(data.error || 'Failed to create user');
      }
    } catch (err: any) {
      setInviteError(err.message);
    } finally {
      setInviting(false);
    }
  };

  /* ── Change Role ──────────────────────────────────────── */
  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      const res = await fetch(`/api/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Role updated to "${newRole}"`);
        fetchUsers();
      } else {
        showToast(data.error || 'Failed to update role', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
    setActionMenuId(null);
  };

  /* ── Deactivate ───────────────────────────────────────── */
  const handleDeactivate = async (userId: number) => {
    if (!confirm('Deactivate this user? They will lose access immediately.')) return;
    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('User deactivated');
        fetchUsers();
      } else {
        showToast(data.error || 'Failed', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
    setActionMenuId(null);
  };

  /* ── Reactivate ───────────────────────────────────────── */
  const handleReactivate = async (userId: number) => {
    try {
      const res = await fetch(`/api/users/${userId}/reactivate`, { method: 'PUT' });
      const data = await res.json();
      if (data.success) {
        showToast('User reactivated');
        fetchUsers();
      } else {
        showToast(data.error || 'Failed', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
    setActionMenuId(null);
  };

  /* ── Reset Password ───────────────────────────────────── */
  const handleResetPassword = async (userId: number) => {
    try {
      const res = await fetch(`/api/users/${userId}/reset-password`, { method: 'PUT' });
      const data = await res.json();
      if (data.success) {
        setResetResult({ userId, password: data.credentials.temporaryPassword });
        showToast('Password reset! Share the new password securely.');
      } else {
        showToast(data.error || 'Failed', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
    setActionMenuId(null);
  };

  /* ── Copy to clipboard ────────────────────────────────── */
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard!`);
  };

  /* ── Filter ───────────────────────────────────────────── */
  const filtered = users.filter(u =>
    (filterRole === 'all' || u.role === filterRole) &&
    (!searchQuery || u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.company_name || '').toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const activeCount = users.filter(u => u.is_active).length;
  const inactiveCount = users.filter(u => !u.is_active).length;

  return (
    <div className="min-h-screen bg-[#0f172a] p-6 lg:p-10">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-lg transition-all ${
          toast.type === 'success' ? 'bg-emerald-500/90 text-white' : 'bg-red-500/90 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Users size={20} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">User Management</h1>
            <p className="text-sm text-slate-400">
              {activeCount} active · {inactiveCount} inactive · {users.length} total
            </p>
          </div>
        </div>
        <button
          onClick={() => { setShowInvite(true); setInviteResult(null); setInviteError(null); setInviteEmail(''); setInviteName(''); setInviteRole('qa_engineer'); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <UserPlus size={15} />
          Add User
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {ROLES.map(role => {
          const count = users.filter(u => u.role === role.value && u.is_active).length;
          const Icon = role.icon;
          return (
            <button
              key={role.value}
              onClick={() => setFilterRole(filterRole === role.value ? 'all' : role.value)}
              className={`p-4 rounded-xl border transition-all text-left ${
                filterRole === role.value
                  ? `border-${role.color}-500/50 bg-${role.color}-500/10`
                  : 'border-slate-700/50 bg-slate-800/50 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon size={14} className={`text-${role.color}-400`} />
                <span className="text-xs text-slate-400">{role.label}</span>
              </div>
              <div className="text-xl font-bold text-white">{count}</div>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by email or name..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        />
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">
          <RefreshCw size={24} className="animate-spin mx-auto mb-3" />
          Loading users...
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <AlertCircle size={24} className="text-red-400 mx-auto mb-3" />
          <p className="text-red-400">{error}</p>
          <button onClick={fetchUsers} className="mt-3 text-sm text-blue-400 hover:text-blue-300">Retry</button>
        </div>
      ) : (
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">User</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Last Login</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Joined</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-500">
                      {searchQuery || filterRole !== 'all' ? 'No users match your filters' : 'No users yet. Click "Add User" to get started.'}
                    </td>
                  </tr>
                ) : filtered.map(user => {
                  const RoleIcon = getRoleIcon(user.role);
                  return (
                    <tr key={user.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                      {/* User info */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${
                            user.is_active ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-700 text-slate-500'
                          }`}>
                            {(user.company_name || user.username).slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">{user.company_name || user.username.split('@')[0]}</div>
                            <div className="text-xs text-slate-400 flex items-center gap-1">
                              <Mail size={10} />
                              {user.username}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${ROLE_COLORS[user.role] || ROLE_COLORS.client}`}>
                          <RoleIcon size={11} />
                          {ROLES.find(r => r.value === user.role)?.label || user.role}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${user.is_active ? 'text-emerald-400' : 'text-red-400'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-emerald-400' : 'bg-red-400'}`} />
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Last Login */}
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock size={10} />
                          {timeAgo(user.last_login)}
                        </span>
                      </td>

                      {/* Joined */}
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-400">
                          {new Date(user.created_at).toLocaleDateString()}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right relative">
                        <button
                          onClick={() => setActionMenuId(actionMenuId === user.id ? null : user.id)}
                          className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {actionMenuId === user.id && (
                          <div className="absolute right-4 top-full mt-1 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-30 py-1.5">
                            {/* Role change submenu */}
                            <div className="px-3 py-1.5 text-xs text-slate-500 font-medium uppercase">Change Role</div>
                            {ROLES.map(role => (
                              <button
                                key={role.value}
                                onClick={() => handleRoleChange(user.id, role.value)}
                                className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-slate-700/50 transition-colors ${
                                  user.role === role.value ? 'text-blue-400' : 'text-slate-300'
                                }`}
                              >
                                <role.icon size={12} />
                                {role.label}
                                {user.role === role.value && <Check size={12} className="ml-auto" />}
                              </button>
                            ))}

                            <div className="border-t border-slate-700/50 my-1.5" />

                            <button
                              onClick={() => handleResetPassword(user.id)}
                              className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 text-slate-300 hover:bg-slate-700/50"
                            >
                              <KeyRound size={12} />
                              Reset Password
                            </button>

                            {user.is_active ? (
                              <button
                                onClick={() => handleDeactivate(user.id)}
                                className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 text-red-400 hover:bg-red-500/10"
                              >
                                <Trash2 size={12} />
                                Deactivate User
                              </button>
                            ) : (
                              <button
                                onClick={() => handleReactivate(user.id)}
                                className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 text-emerald-400 hover:bg-emerald-500/10"
                              >
                                <RefreshCw size={12} />
                                Reactivate User
                              </button>
                            )}
                          </div>
                        )}

                        {/* Password reset result inline */}
                        {resetResult?.userId === user.id && (
                          <div className="absolute right-4 top-full mt-1 w-72 bg-slate-800 border border-amber-500/30 rounded-xl shadow-xl z-30 p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-semibold text-amber-400">New Temporary Password</span>
                              <button onClick={() => setResetResult(null)} className="text-slate-400 hover:text-white">
                                <X size={14} />
                              </button>
                            </div>
                            <div className="flex items-center gap-2">
                              <code className="flex-1 bg-slate-900 px-3 py-2 rounded-lg text-sm text-emerald-400 font-mono break-all">
                                {resetResult.password}
                              </code>
                              <button
                                onClick={() => copyToClipboard(resetResult.password, 'Password')}
                                className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300"
                              >
                                <Copy size={14} />
                              </button>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-2">Share this password securely. User should change it after login.</p>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Invite Modal ────────────────────────────────── */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowInvite(false)}>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <UserPlus size={18} className="text-emerald-400" />
                <h2 className="text-lg font-bold text-white">Add New User</h2>
              </div>
              <button onClick={() => setShowInvite(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {inviteResult ? (
              /* ── Success: Show credentials ── */
              <div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    <span className="text-sm font-semibold text-emerald-400">User Created Successfully!</span>
                  </div>
                  <p className="text-xs text-slate-400">Share these credentials securely with the new user.</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Email</label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-slate-900 px-3 py-2 rounded-lg text-sm text-white font-mono">{inviteResult.email}</code>
                      <button onClick={() => copyToClipboard(inviteResult.email, 'Email')} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300">
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Temporary Password</label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-slate-900 px-3 py-2 rounded-lg text-sm text-amber-400 font-mono break-all">{inviteResult.temporaryPassword}</code>
                      <button onClick={() => copyToClipboard(inviteResult.temporaryPassword, 'Password')} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300">
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Login URL</label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-slate-900 px-3 py-2 rounded-lg text-sm text-blue-400 font-mono">/login</code>
                      <button onClick={() => copyToClipboard(window.location.origin + '/login', 'Login URL')} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300">
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mt-4">
                  <p className="text-xs text-amber-400">
                    ⚠️ This password won&apos;t be shown again. Copy it now and share it securely.
                  </p>
                </div>

                <button
                  onClick={() => setShowInvite(false)}
                  className="w-full mt-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              /* ── Invite Form ── */
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Email Address *</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="user@company.com"
                    className="w-full px-3 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Display Name</label>
                  <input
                    type="text"
                    value={inviteName}
                    onChange={e => setInviteName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-3 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Role</label>
                  <div className="grid grid-cols-2 gap-2">
                    {ROLES.map(role => {
                      const Icon = role.icon;
                      return (
                        <button
                          key={role.value}
                          onClick={() => setInviteRole(role.value)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-all ${
                            inviteRole === role.value
                              ? 'border-blue-500/50 bg-blue-500/10'
                              : 'border-slate-700 bg-slate-900/40 hover:border-slate-600'
                          }`}
                        >
                          <Icon size={14} className={inviteRole === role.value ? 'text-blue-400' : 'text-slate-400'} />
                          <div>
                            <div className={`text-xs font-medium ${inviteRole === role.value ? 'text-white' : 'text-slate-300'}`}>{role.label}</div>
                            <div className="text-[10px] text-slate-500">{role.description}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {inviteError && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                    <p className="text-xs text-red-400 flex items-center gap-1.5">
                      <AlertCircle size={12} />
                      {inviteError}
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowInvite(false)}
                    className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleInvite}
                    disabled={!inviteEmail.trim() || inviting}
                    className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {inviting ? <RefreshCw size={14} className="animate-spin" /> : <UserPlus size={14} />}
                    {inviting ? 'Creating...' : 'Create User'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Close action menu on click outside */}
      {actionMenuId !== null && (
        <div className="fixed inset-0 z-20" onClick={() => { setActionMenuId(null); setResetResult(null); }} />
      )}
    </div>
  );
}
