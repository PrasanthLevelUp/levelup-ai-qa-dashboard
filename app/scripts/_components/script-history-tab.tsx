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
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

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
        const list = data.data || data.scripts || (Array.isArray(data) ? data : []);
        setScripts(list);
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

      // Determine extension from framework or content-disposition
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
                        {script.projectContext?.name && (
                          <span className="text-[10px] text-slate-500">
                            {script.projectContext.name}
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-white truncate">
                        {script.name || script.instructions || script.url}
                      </p>

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

                {/* Expanded code view */}
                {isExpanded && hasCode && (
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
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
