'use client';

import { useState, useEffect, useCallback } from 'react';
import { useProject } from '@/lib/project-context';
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
  Eye,
  Zap,
  Search,
  ChevronUp,
  Brain,
  FolderOpen,
  X,
  Plus,
  Lightbulb,
  ArrowRight,
  Info,
  Link2,
  Shield,
  FileSearch,
  Pencil,
  KeyRound,
  Network,
  Sparkles,
} from 'lucide-react';
import { ProfileEditDialog, type EditableProfile } from './profile-edit-dialog';
import { ProfileAuthDialog, type AuthDialogProfile } from './profile-auth-dialog';
import { ProfileDetail } from './profile-detail';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface ApplicationProfile {
  id: string;
  base_url: string;
  app_fingerprint: string | null;
  crawl_data: any;
  auth_required: boolean;
  /** Sanitized auth summary from backend (no password). */
  auth_config?: {
    loginUrl?: string;
    hasCredentials?: boolean;
    username?: string;
    customSelectors?: { usernameField?: string; passwordField?: string; submitButton?: string };
  } | null;
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
  /* Rich, human-editable fields */
  name?: string | null;
  description?: string | null;
  notes?: string | null;
  business_flows?: any[] | null;
  url_patterns?: any | null;
  form_fields?: any[] | null;
  screenshots?: any[] | null;
  tags?: string[] | null;
  /**
   * How the profile was created:
   *  - 'manual' → explicitly created by you via the Profiles UI
   *  - 'auto'   → created automatically by a background flow (opt-in URL script generation)
   * Used to render an "Auto" badge so it's clear which profiles you didn't create by hand.
   */
  source?: 'manual' | 'auto' | string | null;
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
  const isExpiringSoon = expDiff > 0 && expDiff < 7 * 24 * 60 * 60 * 1000;

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
  const { activeProject, loading: projectLoading } = useProject();
  const [profiles, setProfiles] = useState<ApplicationProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  /* -- Crawl URL dialog state -- */
  const [showCrawlDialog, setShowCrawlDialog] = useState(false);
  const [crawlUrl, setCrawlUrl] = useState('');
  const [crawlStatus, setCrawlStatus] = useState<'idle' | 'checking' | 'done' | 'error'>('idle');
  const [crawlMessage, setCrawlMessage] = useState('');

  /* -- Create / Edit profile dialog state -- */
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<EditableProfile | null>(null);

  /* -- Configure Auth dialog state -- */
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authProfile, setAuthProfile] = useState<AuthDialogProfile | null>(null);

  const getHeaders = useCallback((): Record<string, string> => {
    if (!activeProject) return {};
    return { 'x-project-id': String(activeProject.id) };
  }, [activeProject]);

  const fetchProfiles = useCallback(async () => {
    if (projectLoading) return;
    setLoading(true);
    try {
      const qs = filterStatus ? `?status=${filterStatus}` : '';
      const headers = getHeaders();
      const res = await fetch(`/api/intelligence/profiles${qs}`, { headers });
      const data = await res.json();
      if (data.success) {
        setProfiles(data.data || []);
        setTotal(data.total || 0);
      }
    } catch {
      // silent
    }
    setLoading(false);
  }, [filterStatus, activeProject?.id, projectLoading, getHeaders]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  useEffect(() => {
    setProfiles([]);
    setTotal(0);
    setExpandedId(null);
  }, [activeProject?.id]);

  const handleInvalidate = async (profile: ApplicationProfile) => {
    setActionLoading(prev => ({ ...prev, [profile.id]: true }));
    try {
      await fetch('/api/intelligence/profiles/invalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getHeaders() },
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
        headers: { ...getHeaders() },
      });
      await fetchProfiles();
    } catch {
      // silent
    }
    setActionLoading(prev => ({ ...prev, [profile.id]: false }));
  };

  /* -- Manually trigger a deep crawl ("Crawl Now") -- */
  const handleCrawlNow = async (profile: ApplicationProfile) => {
    setActionLoading(prev => ({ ...prev, [profile.id]: true }));
    try {
      const res = await fetch(`/api/intelligence/profiles/${profile.id}/crawl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getHeaders() },
        body: JSON.stringify({ maxPages: 12, maxDepth: 2 }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(`Failed to start crawl: ${data.error || 'unknown error'}`);
      } else {
        // Optimistically mark the row as crawling; polling will refresh real status.
        setProfiles(prev => prev.map(p => p.id === profile.id ? { ...p, status: 'crawling' } : p));
      }
      await fetchProfiles();
    } catch (e: any) {
      alert(`Failed to start crawl: ${e.message}`);
    }
    setActionLoading(prev => ({ ...prev, [profile.id]: false }));
  };

  /* -- Poll while any profile is mid-crawl so the UI shows live progress -- */
  useEffect(() => {
    const anyCrawling = profiles.some(p => p.status === 'crawling');
    if (!anyCrawling) return;
    const interval = setInterval(() => { fetchProfiles(); }, 4000);
    return () => clearInterval(interval);
  }, [profiles, fetchProfiles]);

  /* -- Check profile status for a URL -- */
  const handleCheckUrl = async () => {
    if (!crawlUrl.trim()) return;
    setCrawlStatus('checking');
    setCrawlMessage('');
    try {
      const res = await fetch(
        `/api/intelligence/profiles/status?url=${encodeURIComponent(crawlUrl.trim())}`,
        { headers: getHeaders() },
      );
      const data = await res.json();
      if (data.success && data.data) {
        const d = data.data;
        if (d.hasProfile && d.status === 'fresh') {
          setCrawlMessage(
            `✅ A fresh profile already exists for this URL. It was crawled ${timeAgo(d.crawledAt)} and expires in ${expiresIn(d.expiresAt)}. No re-crawl needed — your next script generation will use the cached data instantly.`,
          );
        } else if (d.hasProfile && d.status === 'expired') {
          setCrawlMessage(
            `⚠️ A profile exists but has expired. The next script generation for this URL will refresh this existing profile's cached data automatically.`,
          );
        } else {
          setCrawlMessage(
            `ℹ️ No profile exists for this URL yet. Generating a script will NOT create one automatically — use "Create Profile" above to add it explicitly. Once created, future generations reuse its cached data for 30× faster performance.`,
          );
        }
        setCrawlStatus('done');
      } else {
        setCrawlMessage(
          `ℹ️ No profile exists for this URL. Use "Create Profile" above to add one explicitly — script generation will not create profiles on its own.`,
        );
        setCrawlStatus('done');
      }
    } catch {
      setCrawlMessage('Failed to check profile status. Please try again.');
      setCrawlStatus('error');
    }
  };

  const filteredProfiles = profiles.filter(p =>
    !search || p.base_url.toLowerCase().includes(search.toLowerCase()),
  );

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
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setSelectedProfile(null); setEditDialogOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
          >
            <Plus size={14} />
            Create Profile
          </button>
          <button
            onClick={() => { setShowCrawlDialog(true); setCrawlUrl(''); setCrawlStatus('idle'); setCrawlMessage(''); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1e293b] border border-[#334155] text-slate-300 hover:text-white hover:bg-[#334155] transition-colors text-sm"
          >
            <FileSearch size={14} />
            Check / Crawl URL
          </button>
          <button
            onClick={fetchProfiles}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1e293b] border border-[#334155] text-slate-300 hover:text-white hover:bg-[#334155] transition-colors text-sm"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Crawl URL Dialog */}
      {showCrawlDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a3040]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-violet-500/10 rounded-lg">
                  <FileSearch size={18} className="text-violet-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Check URL Profile</h2>
                  <p className="text-xs text-slate-500">See if a cached profile exists for your application URL</p>
                </div>
              </div>
              <button
                onClick={() => setShowCrawlDialog(false)}
                className="p-1.5 rounded-lg hover:bg-[#2a3040] text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Application URL</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="url"
                      value={crawlUrl}
                      onChange={e => { setCrawlUrl(e.target.value); setCrawlStatus('idle'); setCrawlMessage(''); }}
                      placeholder="https://your-app.com"
                      className="w-full pl-9 pr-3 py-2.5 bg-[#0f172a] border border-[#334155] rounded-lg text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50 transition-colors"
                      onKeyDown={e => e.key === 'Enter' && handleCheckUrl()}
                    />
                  </div>
                  <button
                    onClick={handleCheckUrl}
                    disabled={!crawlUrl.trim() || crawlStatus === 'checking'}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors whitespace-nowrap"
                  >
                    {crawlStatus === 'checking' ? (
                      <><Loader2 size={14} className="animate-spin" /> Checking...</>
                    ) : (
                      <><Search size={14} /> Check Status</>
                    )}
                  </button>
                </div>
              </div>

              {/* Result */}
              {crawlMessage && (
                <div className={`p-4 rounded-lg border text-sm leading-relaxed ${
                  crawlStatus === 'error'
                    ? 'bg-red-500/5 border-red-500/20 text-red-300'
                    : 'bg-[#0f172a] border-[#334155] text-slate-300'
                }`}>
                  {crawlMessage}
                </div>
              )}

              {/* Tip */}
              <div className="flex items-start gap-2.5 p-3 bg-violet-500/5 border border-violet-500/15 rounded-lg">
                <Info size={14} className="text-violet-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-violet-300/80 leading-relaxed">
                  Profiles are automatically created when you generate test scripts. The first generation
                  crawls your app (~30s), and all subsequent generations reuse the cached data instantly.
                </p>
              </div>

              {/* Action */}
              {crawlStatus === 'done' && (
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowCrawlDialog(false)}
                    className="px-4 py-2 rounded-lg bg-[#0f172a] border border-[#334155] text-slate-300 hover:text-white text-sm transition-colors"
                  >
                    Close
                  </button>
                  <a
                    href="/scripts"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
                  >
                    <Zap size={14} />
                    Generate Script
                    <ArrowRight size={14} />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {total > 0 && (
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
      )}

      {/* Main content */}
      {loading || projectLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-violet-400" />
          <span className="ml-3 text-slate-400">
            {projectLoading ? 'Loading project context...' : 'Loading profiles...'}
          </span>
        </div>
      ) : total === 0 ? (
        /* ─── Enhanced Empty State ─── */
        <div className="text-center py-12">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-violet-500/20 to-violet-600/20 border border-violet-500/30 rounded-2xl flex items-center justify-center mb-6">
            <Globe className="h-9 w-9 text-violet-400" />
          </div>

          <h3 className="text-xl font-semibold text-white mb-2">
            {activeProject
              ? `No Application Profiles for "${activeProject.name}"`
              : 'No Application Profiles Yet'}
          </h3>

          <p className="text-sm text-slate-400 mb-8 max-w-lg mx-auto leading-relaxed">
            Application Profiles are automatically created when you generate test scripts.
            They cache your app&apos;s structure, forms, and interactive elements — making
            repeat generations <span className="text-violet-400 font-medium">30× faster</span>.
          </p>

          {/* Quick Start Guide */}
          <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-6 max-w-lg mx-auto mb-8 text-left">
            <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-400" />
              How It Works
            </h4>
            <ol className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-xs font-bold text-violet-400">1</span>
                <div>
                  <p className="text-sm text-slate-200">Go to the Script Generator</p>
                  <p className="text-xs text-slate-500">Enter your app URL and describe what to test</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-xs font-bold text-violet-400">2</span>
                <div>
                  <p className="text-sm text-slate-200">AI crawls your application</p>
                  <p className="text-xs text-slate-500">The first generation takes ~30s to analyze your app&apos;s structure</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-xs font-bold text-violet-400">3</span>
                <div>
                  <p className="text-sm text-slate-200">Profile is cached automatically</p>
                  <p className="text-xs text-slate-500">Subsequent generations use cached data (instant). Profiles refresh every 30 days.</p>
                </div>
              </li>
            </ol>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="/scripts"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white font-medium transition-all shadow-lg shadow-violet-500/20 text-sm"
            >
              <Zap size={16} />
              Generate Your First Script
              <ArrowRight size={16} />
            </a>
            <button
              onClick={() => { setShowCrawlDialog(true); setCrawlUrl(''); setCrawlStatus('idle'); setCrawlMessage(''); }}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#1e293b] border border-[#334155] text-slate-300 hover:text-white hover:bg-[#334155] transition-colors text-sm"
            >
              <Search size={16} />
              Check URL Status
            </button>
          </div>

          <p className="text-xs text-slate-600 mt-6">
            💡 Profiles are per-URL — each URL you test gets its own cached intelligence profile.
          </p>
        </div>
      ) : (
        /* ─── Profile List (with search/filter) ─── */
        <>
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

          {/* Profile Cards */}
          {filteredProfiles.length === 0 ? (
            <div className="text-center py-12">
              <Search size={32} className="mx-auto text-slate-600 mb-3" />
              <p className="text-sm text-slate-400">No profiles match your search or filter.</p>
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
                        {profile.name ? (
                          <span className="flex items-center gap-2 min-w-0">
                            <span className="text-sm font-medium text-white truncate">{profile.name}</span>
                            <span className="text-xs text-slate-500 truncate">{profile.base_url}</span>
                          </span>
                        ) : (
                          <span className="text-sm font-medium text-white truncate">{profile.base_url}</span>
                        )}
                        {statusBadge(profile.status, profile.expires_at)}
                        {profile.auth_required && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded border border-amber-500/20">
                            <Shield size={8} />
                            Auth
                          </span>
                        )}
                        {profile.source === 'auto' && (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-sky-500/10 text-sky-400 rounded border border-sky-500/20"
                            title="Created automatically by a background flow (e.g. URL script generation), not added manually."
                          >
                            <Sparkles size={8} />
                            Auto
                          </span>
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

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => setExpandedId(expandedId === profile.id ? null : profile.id)}
                        className="p-2 rounded-lg hover:bg-[#2a3040] text-slate-400 hover:text-white transition-colors"
                        title="View details"
                      >
                        {expandedId === profile.id ? <ChevronUp size={16} /> : <Eye size={16} />}
                      </button>
                      <button
                        onClick={() => { setSelectedProfile(profile as EditableProfile); setEditDialogOpen(true); }}
                        className="p-2 rounded-lg hover:bg-violet-500/10 text-slate-400 hover:text-violet-400 transition-colors"
                        title="Edit profile"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => { setAuthProfile(profile as AuthDialogProfile); setAuthDialogOpen(true); }}
                        className={`p-2 rounded-lg hover:bg-amber-500/10 transition-colors ${
                          profile.auth_required ? 'text-amber-400' : 'text-slate-400 hover:text-amber-400'
                        }`}
                        title={profile.auth_required ? 'Edit authentication' : 'Configure authentication'}
                      >
                        <KeyRound size={16} />
                      </button>
                      <button
                        onClick={() => handleCrawlNow(profile)}
                        disabled={!!actionLoading[profile.id] || profile.status === 'crawling'}
                        className="p-2 rounded-lg hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-400 transition-colors disabled:opacity-50"
                        title="Crawl now — run a real deep crawl of this app"
                      >
                        {profile.status === 'crawling'
                          ? <Loader2 size={16} className="animate-spin text-violet-400" />
                          : <Network size={16} />}
                      </button>
                      <button
                        onClick={() => handleInvalidate(profile)}
                        disabled={!!actionLoading[profile.id]}
                        className="p-2 rounded-lg hover:bg-amber-500/10 text-slate-400 hover:text-amber-400 transition-colors"
                        title="Re-crawl on next generation"
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
                    <ProfileDetail
                      profile={profile}
                      crawlBusy={!!actionLoading[profile.id]}
                      onCrawlNow={() => handleCrawlNow(profile)}
                      onConfigureAuth={() => { setAuthProfile(profile as AuthDialogProfile); setAuthDialogOpen(true); }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create / Edit Profile Dialog */}
      <ProfileEditDialog
        open={editDialogOpen}
        profile={selectedProfile}
        projectHeaders={getHeaders()}
        onClose={(shouldRefresh) => {
          setEditDialogOpen(false);
          setSelectedProfile(null);
          if (shouldRefresh) fetchProfiles();
        }}
      />

      {/* Configure Auth Dialog */}
      <ProfileAuthDialog
        open={authDialogOpen}
        profile={authProfile}
        projectHeaders={getHeaders()}
        onClose={(shouldRefresh) => {
          setAuthDialogOpen(false);
          setAuthProfile(null);
          if (shouldRefresh) fetchProfiles();
        }}
      />
    </div>
  );
}
