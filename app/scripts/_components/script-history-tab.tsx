'use client';

import { useState, useEffect, useCallback } from 'react';
import { useProject } from '@/lib/project-context';
import { toast } from 'sonner';
import {
  Download,
  Trash2,
  ChevronDown,
  ChevronUp,
  FileCode,
  RefreshCw,
  Loader2,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ExternalLink,
  GitBranch,
  Globe,
  BookOpen,
  Code,
  Zap,
  Brain,
  Shield,
  Info,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface IntelligenceMetadata {
  repoIntelligenceUsed?: boolean;
  repoId?: string;
  repoFramework?: string;
  repoTestPattern?: string;
  repoHelperCount?: number;
  repoPageObjectCount?: number;
  repoFixtureCount?: number;
  adaptiveCodegenUsed?: boolean;
  adaptiveMode?: string;
  knowledgeItemsUsed?: number;
  profileCacheUsed?: boolean;
  crawlDecisionReason?: string;
  profileId?: string;
}

interface HistoryScript {
  id: number;
  url: string;
  instructions: string | null;
  pageType: string | null;
  validationStatus: string | null;
  reliabilityScore: number | null;
  tokensUsed: number | null;
  model: string | null;
  generationTimeMs: number | null;
  filesGenerated: any;
  createdAt: string | null;
  projectContext?: { name: string } | null;
  script_content?: string;
  framework?: string;
  name?: string;
  intelligence_metadata?: IntelligenceMetadata;
  // RTM traceability (present when the script was generated from a linked test case)
  requirement_id?: string | null;
  requirement_ref?: string | null;
  test_case_id?: number | null;
  test_case_title?: string | null;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatTime(dateStr: string | null) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('en-IN', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  } catch { return dateStr; }
}

function getStatusConfig(status: string | null) {
  switch (status) {
    case 'passed':
      return { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', label: 'Passed' };
    case 'needs_review':
      return { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', label: 'Review' };
    default:
      return { icon: Clock, color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20', label: 'Pending' };
  }
}

/** Parse intelligence_metadata from DB — handles both snake_case and camelCase */
function parseIntel(raw: any): IntelligenceMetadata | undefined {
  if (!raw) return undefined;
  const m = typeof raw === 'string' ? JSON.parse(raw) : raw;
  return {
    repoIntelligenceUsed: m.repoIntelligenceUsed ?? m.repo_intelligence_used ?? false,
    repoId: m.repoId ?? m.repo_id,
    repoFramework: m.repoFramework ?? m.repo_framework,
    repoTestPattern: m.repoTestPattern ?? m.repo_test_pattern,
    repoHelperCount: m.repoHelperCount ?? m.repo_helper_count ?? 0,
    repoPageObjectCount: m.repoPageObjectCount ?? m.repo_page_object_count ?? 0,
    repoFixtureCount: m.repoFixtureCount ?? m.repo_fixture_count ?? 0,
    adaptiveCodegenUsed: m.adaptiveCodegenUsed ?? m.adaptive_codegen_used ?? false,
    adaptiveMode: m.adaptiveMode ?? m.adaptive_mode,
    knowledgeItemsUsed: m.knowledgeItemsUsed ?? m.knowledge_items_used ?? 0,
    profileCacheUsed: m.profileCacheUsed ?? m.profile_cache_used ?? false,
    crawlDecisionReason: m.crawlDecisionReason ?? m.crawl_decision_reason,
    profileId: m.profileId ?? m.profile_id,
  };
}

function hasAnyIntelligence(m?: IntelligenceMetadata): boolean {
  if (!m) return false;
  return !!(m.repoIntelligenceUsed || m.profileCacheUsed || (m.knowledgeItemsUsed && m.knowledgeItemsUsed > 0));
}

/* ------------------------------------------------------------------ */
/*  Intelligence Badges                                                */
/* ------------------------------------------------------------------ */

function IntelligenceBadges({ intel }: { intel?: IntelligenceMetadata }) {
  if (!intel) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {intel.repoIntelligenceUsed && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <GitBranch size={9} />
          Repo Intelligence
        </span>
      )}
      {intel.profileCacheUsed && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
          <Globe size={9} />
          App Profile
        </span>
      )}
      {intel.knowledgeItemsUsed != null && intel.knowledgeItemsUsed > 0 && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <BookOpen size={9} />
          Knowledge ({intel.knowledgeItemsUsed})
        </span>
      )}
      {intel.repoFramework && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
          <Code size={9} />
          {intel.repoFramework}
        </span>
      )}
      {intel.adaptiveCodegenUsed && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <Zap size={9} />
          Adaptive
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Intelligence Detail Panel (expanded)                               */
/* ------------------------------------------------------------------ */

function IntelligenceDetail({ intel }: { intel?: IntelligenceMetadata }) {
  if (!intel) return null;

  const hasIntel = hasAnyIntelligence(intel);

  if (!hasIntel) {
    return (
      <div className="bg-amber-500/5 border border-amber-500/15 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-400 mb-1">Limited Intelligence Used</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              This script was generated without repository intelligence or a cached application profile.
              For better code alignment with your codebase:
            </p>
            <ul className="text-xs text-slate-500 mt-2 space-y-1">
              <li className="flex items-center gap-1.5">
                <GitBranch size={10} className="text-blue-400" />
                Connect a repository in Repository Intelligence
              </li>
              <li className="flex items-center gap-1.5">
                <Globe size={10} className="text-purple-400" />
                Generate a script to auto-create an Application Profile
              </li>
              <li className="flex items-center gap-1.5">
                <BookOpen size={10} className="text-emerald-400" />
                Add business rules in App Knowledge
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0c1222] border border-[#1e293b] rounded-lg p-4">
      <h4 className="text-xs font-semibold text-white mb-3 flex items-center gap-2">
        <Brain size={14} className="text-violet-400" />
        Intelligence Used in Generation
      </h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Repository Intelligence */}
        {intel.repoIntelligenceUsed && (
          <div className="bg-[#1a1f2e] rounded-lg p-3 border border-[#2a3040]">
            <div className="flex items-center gap-2 mb-2">
              <GitBranch size={12} className="text-blue-400" />
              <span className="text-xs font-medium text-white">Repository Intelligence</span>
            </div>
            <div className="space-y-1 text-[11px] text-slate-400">
              {intel.repoFramework && (
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={10} className="text-emerald-400" />
                  Framework: <span className="text-slate-300">{intel.repoFramework}</span>
                </div>
              )}
              {intel.repoTestPattern && (
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={10} className="text-emerald-400" />
                  Pattern: <span className="text-slate-300">{intel.repoTestPattern}</span>
                </div>
              )}
              {(intel.repoHelperCount ?? 0) > 0 && (
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={10} className="text-emerald-400" />
                  {intel.repoHelperCount} helper{intel.repoHelperCount !== 1 ? 's' : ''} matched
                </div>
              )}
              {(intel.repoPageObjectCount ?? 0) > 0 && (
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={10} className="text-emerald-400" />
                  {intel.repoPageObjectCount} page object{intel.repoPageObjectCount !== 1 ? 's' : ''}
                </div>
              )}
              {(intel.repoFixtureCount ?? 0) > 0 && (
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={10} className="text-emerald-400" />
                  {intel.repoFixtureCount} fixture{intel.repoFixtureCount !== 1 ? 's' : ''}
                </div>
              )}
            </div>
            <p className="text-[10px] text-emerald-500/60 mt-2">
              Code aligned with your existing codebase structure
            </p>
          </div>
        )}

        {/* Application Profile */}
        {intel.profileCacheUsed && (
          <div className="bg-[#1a1f2e] rounded-lg p-3 border border-[#2a3040]">
            <div className="flex items-center gap-2 mb-2">
              <Globe size={12} className="text-purple-400" />
              <span className="text-xs font-medium text-white">Application Profile</span>
            </div>
            <div className="space-y-1 text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={10} className="text-emerald-400" />
                Used cached crawl data
              </div>
              {intel.crawlDecisionReason && (
                <div className="flex items-center gap-1.5">
                  <Info size={10} className="text-slate-500" />
                  <span className="truncate">{intel.crawlDecisionReason}</span>
                </div>
              )}
            </div>
            <p className="text-[10px] text-purple-500/60 mt-2">
              30× faster — elements & flows pre-analyzed
            </p>
          </div>
        )}

        {/* App Knowledge */}
        {intel.knowledgeItemsUsed != null && intel.knowledgeItemsUsed > 0 && (
          <div className="bg-[#1a1f2e] rounded-lg p-3 border border-[#2a3040]">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen size={12} className="text-emerald-400" />
              <span className="text-xs font-medium text-white">App Knowledge</span>
            </div>
            <div className="space-y-1 text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={10} className="text-emerald-400" />
                {intel.knowledgeItemsUsed} knowledge item{intel.knowledgeItemsUsed !== 1 ? 's' : ''} incorporated
              </div>
            </div>
            <p className="text-[10px] text-emerald-500/60 mt-2">
              Business rules & domain knowledge included
            </p>
          </div>
        )}

        {/* Adaptive Codegen */}
        {intel.adaptiveCodegenUsed && (
          <div className="bg-[#1a1f2e] rounded-lg p-3 border border-[#2a3040]">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={12} className="text-amber-400" />
              <span className="text-xs font-medium text-white">Adaptive Code Generation</span>
            </div>
            <div className="space-y-1 text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={10} className="text-emerald-400" />
                Mode: <span className="text-slate-300">{intel.adaptiveMode || 'auto'}</span>
              </div>
            </div>
            <p className="text-[10px] text-amber-500/60 mt-2">
              Code style adapted to match your repo conventions
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ScriptHistoryTab() {
  const { activeProject } = useProject();
  const [scripts, setScripts] = useState<HistoryScript[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [expandedScripts, setExpandedScripts] = useState<Set<number>>(new Set());
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const getProjectHeaders = useCallback((): Record<string, string> => {
    return activeProject?.id ? { 'x-project-id': String(activeProject.id) } : {};
  }, [activeProject?.id]);

  /* ---- Fetch history ---- */
  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/scripts/history', { headers: getProjectHeaders() });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setFetchError(err?.error || `Backend returned ${res.status}`);
        setScripts([]);
      } else {
        const data = await res.json();
        const list: HistoryScript[] = data.data || data.scripts || (Array.isArray(data) ? data : []);
        // Parse intelligence_metadata on each script
        setScripts(list.map(s => ({
          ...s,
          intelligence_metadata: parseIntel(s.intelligence_metadata),
        })));
      }
    } catch (err: any) {
      setFetchError(err?.message || 'Could not reach backend');
      setScripts([]);
    }
    setLoading(false);
  }, [getProjectHeaders]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  /* ---- Download script ---- */
  const handleDownload = async (script: HistoryScript) => {
    setDownloadingId(script.id);
    try {
      const res = await fetch(`/api/scripts/${script.id}/download`, {
        headers: getProjectHeaders(),
      });

      if (!res.ok) throw new Error('Download failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      const disposition = res.headers.get('content-disposition') || '';
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
      if (filenameMatch) {
        a.download = filenameMatch[1];
      } else {
        const ext = script.framework === 'playwright' ? 'spec.ts' : 'spec.js';
        const safeName = (script.name || script.instructions || 'script')
          .replace(/[^a-zA-Z0-9]/g, '_')
          .substring(0, 40);
        a.download = `${safeName}.${ext}`;
      }

      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Script downloaded');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to download script');
    } finally {
      setDownloadingId(null);
    }
  };

  /* ---- Delete script ---- */
  const handleDelete = async (scriptId: number) => {
    if (!confirm('Delete this script permanently?')) return;
    try {
      const res = await fetch(`/api/scripts/${scriptId}`, {
        method: 'DELETE',
        headers: getProjectHeaders(),
      });
      const data = await res.json();
      if (data.success !== false) {
        toast.success('Script deleted');
        fetchHistory();
      } else {
        throw new Error(data.error || 'Delete failed');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete script');
    }
  };

  /* ---- Toggle code expansion ---- */
  const toggleExpand = (scriptId: number) => {
    setExpandedScripts(prev => {
      const n = new Set(prev);
      n.has(scriptId) ? n.delete(scriptId) : n.add(scriptId);
      return n;
    });
  };

  /* ---- Copy code to clipboard ---- */
  const handleCopy = async (script: HistoryScript) => {
    const code = script.script_content || script.instructions || '';
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(script.id);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  /* ---- Render ---- */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileCode size={16} className="text-violet-400" />
          <h3 className="text-sm font-semibold text-white">Script Generation History</h3>
          <span className="text-xs text-slate-500">
            {scripts.length} script{scripts.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button onClick={fetchHistory} className="p-2 hover:bg-slate-700/50 rounded-lg transition-all">
          <RefreshCw className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Error */}
      {fetchError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm text-red-400">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>Failed to load history: {fetchError}</span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {scripts.length === 0 && !fetchError && (
        <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-12 text-center">
          <FileCode className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No Scripts Generated Yet</p>
          <p className="text-xs text-slate-500 mt-1">
            Generate your first automation script using the Generate Scripts tab
          </p>
        </div>
      )}

      {/* Script list */}
      {scripts.length > 0 && (
        <div className="space-y-3">
          {scripts.map((script) => {
            const isExpanded = expandedScripts.has(script.id);
            const status = getStatusConfig(script.validationStatus);
            const StatusIcon = status.icon;
            const filesCount = Array.isArray(script.filesGenerated) ? script.filesGenerated.length : 0;
            const hasCode = !!(script.script_content);
            const intel = script.intelligence_metadata;
            const hasIntel = hasAnyIntelligence(intel);

            return (
              <div key={script.id} className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl overflow-hidden hover:border-[#3a4060] transition-all">
                {/* Card header */}
                <div className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border ${status.bg} ${status.color}`}>
                          <StatusIcon size={10} />
                          {status.label}
                        </span>
                        {script.framework && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 capitalize">
                            {script.framework}
                          </span>
                        )}
                        {/* Intelligence mini-indicator */}
                        {hasIntel && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-500/10 border border-violet-500/20 text-violet-400" title="Intelligence sources used">
                            <Brain size={9} />
                            AI-Enhanced
                          </span>
                        )}
                        {script.projectContext?.name && (
                          <span className="text-[10px] text-slate-500">
                            {script.projectContext.name}
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-white truncate">
                        {script.name || script.instructions || script.url}
                      </p>

                      {/* Intelligence Badges */}
                      <IntelligenceBadges intel={intel} />

                      {/* RTM traceability badges (only when the script is linked) */}
                      {(script.requirement_ref || script.requirement_id || script.test_case_id) && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          {(script.requirement_ref || script.requirement_id) && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-500/10 border border-violet-500/20 text-violet-300"
                              title="Linked requirement"
                            >
                              <GitBranch size={9} />
                              Req: {script.requirement_ref || script.requirement_id}
                            </span>
                          )}
                          {script.test_case_id != null && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 border border-blue-500/20 text-blue-300"
                              title={script.test_case_title || 'Linked test case'}
                            >
                              TC #{script.test_case_id}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <ExternalLink size={10} />
                          {script.url}
                        </span>
                        {filesCount > 0 && (
                          <span className="flex items-center gap-1">
                            <FileCode size={10} />
                            {filesCount} files
                          </span>
                        )}
                        {script.reliabilityScore != null && script.reliabilityScore > 0 && (
                          <span className={`font-medium ${
                            script.reliabilityScore >= 80 ? 'text-emerald-400'
                              : script.reliabilityScore >= 60 ? 'text-amber-400'
                                : 'text-red-400'
                          }`}>
                            {script.reliabilityScore}% reliable
                          </span>
                        )}
                        {script.tokensUsed != null && script.tokensUsed > 0 && (
                          <span className="flex items-center gap-1">
                            <Sparkles size={10} />
                            {script.tokensUsed.toLocaleString()} tokens
                          </span>
                        )}
                        <span>{formatTime(script.createdAt)}</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5">
                      {hasCode && (
                        <button
                          onClick={() => toggleExpand(script.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium bg-[#0c1222] border border-[#2a3040] rounded-lg text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
                        >
                          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          {isExpanded ? 'Hide' : 'Code'}
                        </button>
                      )}
                      <button
                        onClick={() => handleDownload(script)}
                        disabled={downloadingId === script.id}
                        className="p-2 hover:bg-violet-500/20 rounded-lg transition-all disabled:opacity-50"
                        title="Download script"
                      >
                        {downloadingId === script.id
                          ? <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
                          : <Download className="w-4 h-4 text-slate-400 hover:text-violet-400" />
                        }
                      </button>
                      <button
                        onClick={() => handleDelete(script.id)}
                        className="p-2 hover:bg-red-500/20 rounded-lg transition-all"
                        title="Delete script"
                      >
                        <Trash2 className="w-4 h-4 text-slate-500 hover:text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded view: Intelligence + Code */}
                {isExpanded && hasCode && (
                  <div className="border-t border-[#2a3040]">
                    {/* Intelligence Detail */}
                    <div className="px-5 py-4">
                      <IntelligenceDetail intel={intel} />
                    </div>

                    {/* Generated Code */}
                    <div className="border-t border-[#2a3040]">
                      <div className="flex items-center justify-between px-4 py-2 bg-[#0c1222]/80">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">Generated Code</span>
                        <button
                          onClick={() => handleCopy(script)}
                          className="flex items-center gap-1 px-2 py-1 text-[10px] text-slate-400 hover:text-white bg-[#1a1f2e] border border-[#2a3040] rounded-md transition-colors"
                        >
                          {copiedId === script.id
                            ? <><CheckCircle2 size={10} className="text-emerald-400" /> Copied</>
                            : <><Copy size={10} /> Copy</>
                          }
                        </button>
                      </div>
                      <pre className="bg-[#0a0e1a] px-5 py-4 overflow-x-auto text-xs text-slate-300 leading-relaxed max-h-[400px] overflow-y-auto">
                        <code>{script.script_content}</code>
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
