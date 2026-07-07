'use client';

import { useState, useEffect, useCallback } from 'react';
import { useProject } from '@/lib/project-context';
import { toast } from 'sonner';
import {
  Download,
  Trash2,
  ChevronDown,
  ChevronUp,
  ChevronRight,
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
  Github,
  X,
  XCircle,
} from 'lucide-react';
import { ScriptMaintenanceActions } from './script-maintenance-actions';

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
  // Sprint 4 — per-file breakdown parsed by the backend from the script blob.
  files?: Array<{ path: string; content: string; type?: string; size?: number }>;
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

/** Sprint 4 — trigger a client-side download of a single file's contents. */
function downloadTextFile(path: string, content: string) {
  const filename = path.split('/').pop() || 'script.txt';
  const blob = new Blob([content ?? ''], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Sprint 4 — human-readable byte size for file cards. */
function formatBytes(bytes?: number): string {
  if (bytes == null || isNaN(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Escape HTML so highlighted code can be injected safely. */
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Sprint 4 — lightweight, dependency-free syntax highlighter for the file
 * cards. Tokenises strings, comments, numbers and a shared set of keywords
 * common to JS/TS/Python/Java test scripts. Returns safe HTML (input is
 * HTML-escaped first; token classes are applied to escaped text only).
 */
const HL_KEYWORDS = [
  'import', 'from', 'export', 'default', 'const', 'let', 'var', 'function', 'return',
  'async', 'await', 'class', 'extends', 'new', 'if', 'else', 'for', 'while', 'try',
  'catch', 'finally', 'throw', 'typeof', 'instanceof', 'this', 'super', 'yield',
  'def', 'self', 'None', 'True', 'False', 'and', 'or', 'not', 'in', 'is', 'with', 'as',
  'public', 'private', 'protected', 'static', 'void', 'package', 'true', 'false', 'null', 'undefined',
];
const HL_KEYWORD_SET = new Set(HL_KEYWORDS);
/**
 * Single-pass tokeniser. A combined, ordered alternation is matched left→right
 * and each matched token is wrapped exactly once. This is critical: the previous
 * implementation chained multiple `.replace()` passes over the same string, so
 * later passes (numbers, the `class` keyword) re-matched text *inside* the
 * `<span class="...">` markup injected by earlier passes — corrupting the output
 * into things like `class=class="text-emerald-class="text-amber-300">300">`.
 * By consuming the input in a single regex pass, injected markup is never
 * re-examined, so no nesting/duplication can occur.
 */
const HL_TOKEN_RE = new RegExp(
  [
    '(\\/\\/[^\\n]*|#[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)', // 1: comments
    '("(?:\\\\.|[^"\\\\])*"|\'(?:\\\\.|[^\'\\\\])*\'|`(?:\\\\.|[^`\\\\])*`)', // 2: strings
    '\\b(\\d+(?:\\.\\d+)?)\\b', // 3: numbers
    `\\b(${HL_KEYWORDS.join('|')})\\b`, // 4: keywords
  ].join('|'),
  'g',
);
function highlightCode(code: string): string {
  const src = code ?? '';
  let out = '';
  let last = 0;
  let m: RegExpExecArray | null;
  HL_TOKEN_RE.lastIndex = 0;
  while ((m = HL_TOKEN_RE.exec(src)) !== null) {
    // Append (escaped) plain text since the previous token.
    out += escapeHtml(src.slice(last, m.index));
    const [full, comment, str, num, kw] = m;
    if (comment !== undefined) {
      out += `<span class="text-slate-500 italic">${escapeHtml(comment)}</span>`;
    } else if (str !== undefined) {
      out += `<span class="text-emerald-300">${escapeHtml(str)}</span>`;
    } else if (num !== undefined) {
      out += `<span class="text-amber-300">${escapeHtml(num)}</span>`;
    } else if (kw !== undefined && HL_KEYWORD_SET.has(kw)) {
      out += `<span class="text-violet-300 font-medium">${escapeHtml(kw)}</span>`;
    } else {
      out += escapeHtml(full);
    }
    last = m.index + full.length;
    // Guard against zero-length matches (shouldn't happen, but stay safe).
    if (full.length === 0) HL_TOKEN_RE.lastIndex++;
  }
  // Append remaining trailing plain text.
  out += escapeHtml(src.slice(last));
  return out;
}

/** Sprint 4 — derive a language label from a file path/extension. */
function langFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    ts: 'TypeScript', tsx: 'TypeScript', js: 'JavaScript', jsx: 'JavaScript',
    py: 'Python', java: 'Java', cs: 'C#', rb: 'Ruby', go: 'Go',
    json: 'JSON', yml: 'YAML', yaml: 'YAML', md: 'Markdown',
    html: 'HTML', css: 'CSS', feature: 'Gherkin', sql: 'SQL',
  };
  return map[ext] || (ext ? ext.toUpperCase() : 'Text');
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
/*  File-wise code viewer (Sprint 4)                                   */
/* ------------------------------------------------------------------ */

/** A single expandable file card — mirrors the script-gen results view. */
function FileBlock({ file }: { file: { path: string; content: string; type?: string; size?: number } }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const size = file.size ?? (file.content ? new Blob([file.content]).size : 0);
  const lang = file.type || langFromPath(file.path);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(file.content || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard unavailable — non-fatal */ }
  };

  return (
    <div className="border border-[#2a3040] rounded-lg overflow-hidden bg-[#0c1222]/60">
      <div className="flex items-center gap-2 px-3 py-2">
        <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
          {open ? <ChevronDown size={13} className="text-slate-400 shrink-0" /> : <ChevronRight size={13} className="text-slate-400 shrink-0" />}
          <FileCode size={13} className="text-violet-400 shrink-0" />
          <span className="text-xs text-slate-200 font-mono truncate">{file.path}</span>
        </button>
        <span className="text-[10px] text-slate-500 shrink-0">{lang}</span>
        {size > 0 && <span className="text-[10px] text-slate-600 shrink-0">{formatBytes(size)}</span>}
        <button
          onClick={copy}
          className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-slate-400 hover:text-white bg-[#1a1f2e] border border-[#2a3040] rounded-md transition-colors shrink-0"
          title="Copy file contents"
        >
          {copied ? <><CheckCircle2 size={10} className="text-emerald-400" /> Copied</> : <><Copy size={10} /> Copy</>}
        </button>
        <button
          onClick={() => downloadTextFile(file.path, file.content || '')}
          className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-slate-400 hover:text-white bg-[#1a1f2e] border border-[#2a3040] rounded-md transition-colors shrink-0"
          title="Download this file"
        >
          <Download size={10} /> Download
        </button>
      </div>
      {open && (
        <pre className="bg-[#0a0e1a] border-t border-[#2a3040] px-4 py-3 overflow-x-auto text-xs text-slate-300 leading-relaxed max-h-[360px] overflow-y-auto">
          <code dangerouslySetInnerHTML={{ __html: highlightCode(file.content || '') }} />
        </pre>
      )}
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

  /* ---- GitHub "Create PR" state (Bug #1: PR from history) ---- */
  const [ghConnected, setGhConnected] = useState<boolean | null>(null); // null = loading
  const [ghRepos, setGhRepos] = useState<
    Array<{ fullName: string; name: string; owner: string; defaultBranch: string; private: boolean }>
  >([]);
  const [ghReposLoading, setGhReposLoading] = useState(false);
  const [selectedGhRepo, setSelectedGhRepo] = useState('');
  // The script we're currently creating a PR for (null = dialog closed).
  const [prScript, setPrScript] = useState<HistoryScript | null>(null);
  const [prBranch, setPrBranch] = useState('');
  const [prTitle, setPrTitle] = useState('');
  const [creatingPr, setCreatingPr] = useState(false);
  const [prResult, setPrResult] = useState<
    { success: boolean; prUrl?: string; prNumber?: number; error?: string } | null
  >(null);

  const getProjectHeaders = useCallback((): Record<string, string> => {
    return activeProject?.id ? { 'x-project-id': String(activeProject.id) } : {};
  }, [activeProject?.id]);

  /* ---- Check GitHub connection status on mount ---- */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/github/status');
        const data = await res.json();
        setGhConnected(data?.success && data?.data ? !!data.data.connected : false);
      } catch {
        setGhConnected(false);
      }
    })();
  }, []);

  /* ---- Fetch the user's GitHub repos (when the PR dialog opens) ---- */
  const fetchGhRepos = useCallback(async () => {
    setGhReposLoading(true);
    try {
      const res = await fetch('/api/github/repos?per_page=50&sort=pushed');
      const data = await res.json();
      if (data.success && data.data) {
        setGhRepos(
          data.data.map((r: any) => ({
            fullName: r.fullName,
            name: r.name,
            owner: r.owner,
            defaultBranch: r.defaultBranch,
            private: r.private,
          })),
        );
      }
    } catch {
      /* silent — selector simply stays empty */
    }
    setGhReposLoading(false);
  }, []);

  /* ---- Open the PR dialog for a given history script (pre-populated) ---- */
  const openPrDialog = (script: HistoryScript) => {
    setPrScript(script);
    setPrResult(null);
    setSelectedGhRepo('');
    const slug = (script.name || script.instructions || script.url || 'tests')
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 30);
    setPrBranch(`levelup/tests-${slug}-${script.id}`);
    setPrTitle(`🧪 LevelUp: AI-Generated Test Scripts (#${script.id})`);
    fetchGhRepos();
  };

  /* ---- Create the PR (reuses the same backend endpoint as the generator) ---- */
  const handleCreatePR = async () => {
    if (!prScript || !selectedGhRepo) return;
    setCreatingPr(true);
    setPrResult(null);

    const [owner, repo] = selectedGhRepo.split('/');
    const fileList = Array.isArray(prScript.files) ? prScript.files : [];
    const filesCount =
      fileList.length ||
      (Array.isArray(prScript.filesGenerated) ? prScript.filesGenerated.length : 0);

    try {
      const res = await fetch('/api/github/create-pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getProjectHeaders() },
        body: JSON.stringify({
          repoOwner: owner,
          repoName: repo,
          branchName: prBranch || `levelup/tests-${prScript.id}-${Date.now()}`,
          title: prTitle || `🧪 LevelUp: AI-Generated Test Scripts (#${prScript.id})`,
          body: [
            '## 🤖 AI-Generated Test Scripts',
            '',
            `**Target URL:** ${prScript.url}`,
            `**Files Generated:** ${filesCount}`,
            ...(prScript.generationTimeMs
              ? [`**Generation Time:** ${(prScript.generationTimeMs / 1000).toFixed(1)}s`]
              : []),
            '',
            '### Generated Files',
            ...(fileList.length
              ? fileList.map((f) => `- \`${f.path}\`${f.type ? ` (${f.type})` : ''}`)
              : ['- (see script attachment)']),
            '',
            '---',
            '*Generated by [LevelUp AI QA](https://leveluptesting.in)*',
          ].join('\n'),
          scriptId: prScript.id,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setPrResult({ success: true, prUrl: data.data.prUrl, prNumber: data.data.prNumber });
        toast.success('Pull request created');
      } else {
        setPrResult({ success: false, error: data.error || 'Failed to create PR' });
      }
    } catch {
      setPrResult({ success: false, error: 'Network error — backend may be unavailable' });
    }
    setCreatingPr(false);
  };

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
        const list: any[] = data.data || data.scripts || (Array.isArray(data) ? data : []);
        // Map snake_case API response to camelCase component fields
        setScripts(list.map(s => ({
          ...s,
          // Map snake_case to camelCase for fields used in the UI
          tokensUsed: s.tokensUsed ?? s.tokens_used ?? null,
          createdAt: s.createdAt ?? s.created_at ?? null,
          reliabilityScore: s.reliabilityScore ?? s.reliability_score ?? null,
          validationStatus: s.validationStatus ?? s.validation_status ?? null,
          generationTimeMs: s.generationTimeMs ?? s.generation_time_ms ?? null,
          filesGenerated: s.filesGenerated ?? s.files_generated ?? null,
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
            const fileList = Array.isArray(script.files) ? script.files : [];
            const filesCount = fileList.length || (Array.isArray(script.filesGenerated) ? script.filesGenerated.length : 0);
            const hasCode = fileList.length > 0 || !!(script.script_content);
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
                        {(() => {
                          const intel: any = script.intelligence_metadata || {};
                          const attributed = intel.tokenSource === 'test-case-attributed';
                          const attr = intel.tokenAttribution;
                          if (script.tokensUsed != null && script.tokensUsed > 0) {
                            if (attributed) {
                              return (
                                <span
                                  className="flex items-center gap-1"
                                  title={
                                    attr
                                      ? `Deterministic generation spends 0 LLM tokens — this figure is this script's attributed share of its source test case's generation cost (${attr.totalTokens.toLocaleString()} tokens ÷ ${attr.testCaseCount} case${attr.testCaseCount === 1 ? '' : 's'} = ${attr.perCaseTokens.toLocaleString()}/case).`
                                      : "This script's attributed share of its source test case's generation cost. Deterministic code generation itself spends 0 LLM tokens."
                                  }
                                >
                                  <Zap size={10} />
                                  {script.tokensUsed.toLocaleString()} tokens · from test case
                                </span>
                              );
                            }
                            return (
                              <span className="flex items-center gap-1">
                                <Sparkles size={10} />
                                {script.tokensUsed.toLocaleString()} tokens
                              </span>
                            );
                          }
                          if (String(script.model || '').startsWith('deterministic')) {
                            return (
                              <span
                                className="flex items-center gap-1 text-slate-600"
                                title="Generated deterministically from a structured test case — the steps were translated directly into code, so no LLM tokens were spent."
                              >
                                <Zap size={10} />
                                0 tokens · deterministic
                              </span>
                            );
                          }
                          return null;
                        })()}
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
                      {/* Maintenance: Sync locators + Smart Regenerate */}
                      {hasCode && (
                        <ScriptMaintenanceActions
                          scriptId={script.id}
                          scriptName={script.name || script.instructions || script.url}
                          headers={getProjectHeaders()}
                          onApplied={fetchHistory}
                        />
                      )}
                      {/* Create PR — opens the same dialog used during generation,
                          pre-populated with this script's data (Bug #1 fix). */}
                      {ghConnected ? (
                        <button
                          onClick={() => openPrDialog(script)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium bg-emerald-600/15 border border-emerald-500/30 rounded-lg text-emerald-400 hover:bg-emerald-600/25 hover:text-emerald-300 transition-colors"
                          title="Create a Pull Request from this script"
                        >
                          <GitBranch size={12} />
                          Create PR
                        </button>
                      ) : ghConnected === false ? (
                        <a
                          href="/tools"
                          className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium bg-[#0c1222] border border-[#2a3040] rounded-lg text-amber-400 hover:text-amber-300 transition-colors"
                          title="Connect GitHub to create pull requests"
                        >
                          <Github size={12} />
                          Connect GitHub
                        </a>
                      ) : null}
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

                    {/* Generated Code — file-wise when the backend returns a
                        per-file breakdown; falls back to a single code block. */}
                    <div className="border-t border-[#2a3040]">
                      <div className="flex items-center justify-between px-4 py-2 bg-[#0c1222]/80">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                          {fileList.length > 0
                            ? `Generated Files (${fileList.length})`
                            : 'Generated Code'}
                        </span>
                        <div className="flex items-center gap-2">
                          {fileList.length > 0 && (
                            <button
                              onClick={() => fileList.forEach((f) => downloadTextFile(f.path, f.content || ''))}
                              className="flex items-center gap-1 px-2 py-1 text-[10px] text-slate-400 hover:text-white bg-[#1a1f2e] border border-[#2a3040] rounded-md transition-colors"
                              title="Download all files"
                            >
                              <Download size={10} /> Download all
                            </button>
                          )}
                          <button
                            onClick={() => handleCopy(script)}
                            className="flex items-center gap-1 px-2 py-1 text-[10px] text-slate-400 hover:text-white bg-[#1a1f2e] border border-[#2a3040] rounded-md transition-colors"
                            title="Copy all"
                          >
                            {copiedId === script.id
                              ? <><CheckCircle2 size={10} className="text-emerald-400" /> Copied</>
                              : <><Copy size={10} /> Copy all</>
                            }
                          </button>
                        </div>
                      </div>
                      {fileList.length > 0 ? (
                        <div className="px-4 py-3 space-y-2">
                          {fileList.map((f, i) => (
                            <FileBlock key={`${f.path}-${i}`} file={f} />
                          ))}
                        </div>
                      ) : (
                        <pre className="bg-[#0a0e1a] px-5 py-4 overflow-x-auto text-xs text-slate-300 leading-relaxed max-h-[400px] overflow-y-auto">
                          <code>{script.script_content}</code>
                        </pre>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create PR Modal (Bug #1) ──────────────────────────────────────
          Same fields/flow as the generator's PR dialog, pre-populated with the
          selected history script's data. Rendered as a centered overlay. */}
      {prScript && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => !creatingPr && setPrScript(null)}
        >
          <div
            className="w-full max-w-md bg-[#11162a] border border-[#2a3040] rounded-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a3040]">
              <div className="flex items-center gap-2">
                <GitBranch size={16} className="text-emerald-400" />
                <h4 className="text-sm font-semibold text-slate-200">Create Pull Request</h4>
              </div>
              <button
                onClick={() => setPrScript(null)}
                disabled={creatingPr}
                className="text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              {/* Script context */}
              <p className="text-xs text-slate-500 truncate">
                <span className="text-slate-400">Script #{prScript.id}:</span>{' '}
                {prScript.name || prScript.instructions || prScript.url}
              </p>

              {/* Repository selector */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Repository</label>
                {ghReposLoading ? (
                  <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                    <Loader2 size={12} className="animate-spin" />
                    Loading repositories…
                  </div>
                ) : (
                  <select
                    value={selectedGhRepo}
                    onChange={(e) => setSelectedGhRepo(e.target.value)}
                    className="w-full px-3 py-2 bg-[#1a1f2e] border border-[#2a3040] rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="">Select a repository…</option>
                    {ghRepos.map((r) => (
                      <option key={r.fullName} value={r.fullName}>
                        {r.fullName} {r.private ? '🔒' : ''} ({r.defaultBranch})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Branch name */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Branch Name</label>
                <input
                  type="text"
                  value={prBranch}
                  onChange={(e) => setPrBranch(e.target.value)}
                  placeholder="levelup/tests-..."
                  className="w-full px-3 py-2 bg-[#1a1f2e] border border-[#2a3040] rounded-lg text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              {/* PR title */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">PR Title</label>
                <input
                  type="text"
                  value={prTitle}
                  onChange={(e) => setPrTitle(e.target.value)}
                  placeholder="🧪 LevelUp: AI-Generated Test Scripts"
                  className="w-full px-3 py-2 bg-[#1a1f2e] border border-[#2a3040] rounded-lg text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              {/* Result messages */}
              {prResult?.success && (
                <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
                  <div className="text-xs">
                    <span className="text-emerald-400 font-medium">PR created!</span>
                    {prResult.prUrl && (
                      <a
                        href={prResult.prUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-emerald-300 hover:text-emerald-200 underline inline-flex items-center gap-1"
                      >
                        #{prResult.prNumber} <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
              )}
              {prResult && !prResult.success && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <XCircle size={14} className="text-red-400 flex-shrink-0" />
                  <span className="text-xs text-red-300">{prResult.error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleCreatePR}
                disabled={creatingPr || !selectedGhRepo}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium transition-all"
              >
                {creatingPr ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Creating Pull Request…
                  </>
                ) : (
                  <>
                    <Github size={14} />
                    Create Pull Request
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
