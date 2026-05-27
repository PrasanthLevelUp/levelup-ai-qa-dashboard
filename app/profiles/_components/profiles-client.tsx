'use client';

import { useState, useEffect, useCallback } from 'react';
import { useProject, useProjectHeaders } from '@/lib/project-context';
import {
  Globe,
  RefreshCw,
  Trash2,
  Clock,
  Database,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  Eye,
  Zap,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Brain,
  FileCode,
  FolderOpen,
  X,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface ApplicationProfile {
  id: string;
  base_url: string;
  app_fingerprint: string | null;
  crawl_data: any;
  auth_required: boolean;
  crawled_at: string;
  expires_at: string;
  page_count: number;
  total_elements: number;
  total_forms: number;
  total_interactive: number;
  status: 'fresh' | 'expiring' | 'expired' | 'crawling' | 'error';
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function expiresIn(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 1) return `${days} days`;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  return `${hours}h`;
}

function statusBadge(status: string, expiresAt: string) {
  const expDiff = new Date(expiresAt).getTime() - Date.now();
  const isExpiringSoon = expDiff > 0 && expDiff < 7 * 24 * 60 * 60 * 1000; // < 7 days

  if (status === 'fresh' && !isExpiringSoon) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        Fresh
      </span>
    );
  }
  if (status === 'fresh' && isExpiringSoon) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        Expiring Soon
      </span>
    );
  }
  if (status === 'expired') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
        Expired
      </span>
    );
  }
  if (status === 'crawling') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20">
        <Loader2 size={10} className="animate-spin" />
        Crawling
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
        <XCircle size={10} />
        Error
      </span>
    );
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export function ProfilesClient() {
  const { activeProject } = useProject();
  const projectHeaders = useProjectHeaders();
  const [profiles, setProfiles] = useState<ApplicationProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const qs = filterStatus ? `?status=${filterStatus}` : '';
      const res = await fetch(`/api/intelligence/profiles${qs}`, {
        headers: { ...projectHeaders },
      });
      const data = await res.json();
      if (data.success) {
        setProfiles(data.data || []);
        setTotal(data.total || 0);
      }
    } catch {
      // silent
    }
    setLoading(false);
  }, [filterStatus, activeProject?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const handleInvalidate = async (profile: ApplicationProfile) => {
    setActionLoading(prev => ({ ...prev, [profile.id]: true }));
    try {
      await fetch('/api/intelligence/profiles/invalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...projectHeaders },
        body: JSON.stringify({ url: profile.base_url }),
      });
      await fetchProfiles();
    } catch {
      // silent
    }
    setActionLoading(prev => ({ ...prev, [profile.id]: false }));
  };

  const handleDelete = async (profile: ApplicationProfile) => {
    if (!confirm(`Delete profile for ${profile.base_url}? This cannot be undone.`)) return;
    setActionLoading(prev => ({ ...prev, [profile.id]: true }));
    try {
      await fetch(`/api/intelligence/profiles/${profile.id}`, {
        method: 'DELETE',
        headers: { ...projectHeaders },
      });
      await fetchProfiles();
    } catch {
      // silent
    }
    setActionLoading(prev => ({ ...prev, [profile.id]: false }));
  };

  const filteredProfiles = profiles.filter(p =>
    !search || p.base_url.toLowerCase().includes(search.toLowerCase()),
  );

  // Stats
  const freshCount = profiles.filter(p => p.status === 'fresh').length;
  const expiredCount = profiles.filter(p => p.status === 'expired').length;
  const errorCount = profiles.filter(p => p.status === 'error').length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Brain className="text-violet-400" size={28} />
            Application Profiles
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Cached application intelligence — crawl data reused for 30× faster script generation
          </p>
          {activeProject && (
            <div className="flex items-center gap-1.5 mt-2">
              <FolderOpen size={12} className="text-violet-400" />
              <span className="text-xs text-violet-300/80">
                Project: <span className="font-medium text-violet-300">{activeProject.name}</span>
              </span>
            </div>
          )}
        </div>
        <button
          onClick={fetchProfiles}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1e293b] border border-[#334155] text-slate-300 hover:text-white hover:bg-[#334155] transition-colors text-sm"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-500/10 rounded-lg">
              <Database size={18} className="text-violet-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{total}</p>
              <p className="text-xs text-slate-500">Total Profiles</p>
            </div>
          </div>
        </div>
        <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <CheckCircle2 size={18} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-400">{freshCount}</p>
              <p className="text-xs text-slate-500">Fresh (Cached)</p>
            </div>
          </div>
        </div>
        <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <AlertTriangle size={18} className="text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-400">{expiredCount}</p>
              <p className="text-xs text-slate-500">Expired</p>
            </div>
          </div>
        </div>
        <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <XCircle size={18} className="text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-400">{errorCount}</p>
              <p className="text-xs text-slate-500">Errors</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by URL..."
            className="w-full pl-9 pr-3 py-2 bg-[#1a1f2e] border border-[#2a3040] rounded-lg text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-[#1a1f2e] border border-[#2a3040] rounded-lg text-sm text-slate-300 focus:outline-none focus:border-violet-500/50"
        >
          <option value="">All Statuses</option>
          <option value="fresh">🟢 Fresh</option>
          <option value="expired">🔴 Expired</option>
          <option value="error">⚠️ Error</option>
          <option value="crawling">🔄 Crawling</option>
        </select>
      </div>

      {/* Profile List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-violet-400" />
          <span className="ml-3 text-slate-400">Loading profiles...</span>
        </div>
      ) : filteredProfiles.length === 0 ? (
        <div className="text-center py-16">
          <Database size={48} className="mx-auto text-slate-600 mb-4" />
          <h3 className="text-lg font-semibold text-slate-300 mb-2">No Application Profiles Yet</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Application profiles are automatically created when you generate test scripts.
            Each URL is crawled once and cached for 30 days — making repeat generations 30× faster.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProfiles.map(profile => (
            <div
              key={profile.id}
              className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl overflow-hidden hover:border-[#3a4060] transition-colors"
            >
              {/* Row Header */}
              <div className="px-5 py-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <Globe size={14} className="text-violet-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-white truncate">{profile.base_url}</span>
                    {statusBadge(profile.status, profile.expires_at)}
                    {profile.auth_required && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded border border-amber-500/20">Auth</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      Crawled {timeAgo(profile.crawled_at)}
                    </span>
                    <span>Expires: {expiresIn(profile.expires_at)}</span>
                    <span>{profile.page_count} page{profile.page_count !== 1 ? 's' : ''}</span>
                    <span>{profile.total_elements} elements</span>
                    <span>{profile.total_forms} forms</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setExpandedId(expandedId === profile.id ? null : profile.id)}
                    className="p-2 rounded-lg hover:bg-[#2a3040] text-slate-400 hover:text-white transition-colors"
                    title="View details"
                  >
                    {expandedId === profile.id ? <ChevronUp size={16} /> : <Eye size={16} />}
                  </button>
                  <button
                    onClick={() => handleInvalidate(profile)}
                    disabled={!!actionLoading[profile.id]}
                    className="p-2 rounded-lg hover:bg-amber-500/10 text-slate-400 hover:text-amber-400 transition-colors"
                    title="Re-crawl (invalidate)"
                  >
                    {actionLoading[profile.id] ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                  </button>
                  <button
                    onClick={() => handleDelete(profile)}
                    disabled={!!actionLoading[profile.id]}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
                    title="Delete profile"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Expanded Detail */}
              {expandedId === profile.id && (
                <div className="px-5 py-4 border-t border-[#2a3040] bg-[#0f172a]/50">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Fingerprint</p>
                      <p className="text-xs text-slate-300 font-mono">{profile.app_fingerprint || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Interactive Elements</p>
                      <p className="text-xs text-slate-300">{profile.total_interactive}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Created</p>
                      <p className="text-xs text-slate-300">{new Date(profile.created_at).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Last Updated</p>
                      <p className="text-xs text-slate-300">{timeAgo(profile.updated_at)}</p>
                    </div>
                  </div>
                  {profile.error_message && (
                    <div className="flex items-start gap-2 p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                      <AlertTriangle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-red-300">{profile.error_message}</p>
                    </div>
                  )}
                  <div className="mt-3 flex items-center gap-2">
                    <Zap size={12} className="text-violet-400" />
                    <p className="text-[10px] text-slate-500">
                      Next script generation for this URL will use cached data (instant) instead of re-crawling (~30s).
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
