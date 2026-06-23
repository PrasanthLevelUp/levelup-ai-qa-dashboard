'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useProject } from '@/lib/project-context';
import {
  Brain,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Code2,
  GitBranch,
  FileCode,
  Workflow,
  Search,
  Shield,
  Sparkles,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Cpu,
  Layers,
  Box,
  Folder,
  Eye,
  Zap,
  Network,
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Scan,
  Settings,
  KeyRound,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface RepoListItem {
  id: string;
  name: string;
  url: string;
  branch: string;
  enabled: boolean;
}

interface RepoProfile {
  framework: string;
  language: string;
  testPattern: string;
  locatorStrategy: string;
  folderStructure: {
    testFolder: string | null;
    pageObjectFolder: string | null;
    fixtureFolder: string | null;
    utilsFolder: string | null;
    configFiles: string[];
    supportFiles: string[];
  };
  codingStyle: {
    namingConvention: string;
    testNaming: string;
    stepStyle: string;
    tagConvention: string | null;
    indentStyle: string;
    quoteStyle: string;
    semicolons: boolean;
  };
  // NOTE: parameters/methods arrive from the backend AST as objects
  // ({ name, type }), not strings — the UI normalizes them before rendering.
  helperFunctions: Array<{ name: string; filePath: string; parameters?: Array<{ name: string; type?: string }> | string[]; category?: string }>;
  pageObjects: Array<{ name: string; filePath: string; methods?: Array<{ name: string }> | string[] }>;
  fixtures: Array<{ name: string; filePath: string }>;
  customCommands: Array<{ name: string; filePath: string }>;
  sharedConstants: Array<{ name: string; value: string; filePath: string }>;
  dataFiles?: Array<{ name: string; path: string; type: string; recordCount?: number }>;
  environment?: {
    envFiles: string[];
    usesDotenv: boolean;
    configModule: string | null;
    envVars: string[];
  };
  // Backend BusinessFlow exposes relatedFiles[]; filePath kept optional for back-compat.
  businessFlows: Array<{ name: string; filePath?: string; relatedFiles?: string[]; steps: string[]; category?: string; entryUrl?: string | null }>;
  testSuites: Array<{ name: string; filePath: string; testCount: number; tags?: string[] }>;
  preferredLocators: Array<{ pattern: string; count: number; example: string }>;
  avoidPatterns: string[];
  dependencies: Array<{ name: string; version: string; isDev: boolean }>;
  assertionLibrary: string;
  ciIntegration: string | null;
  totalFiles: number;
  totalTestFiles: number;
  totalHelperFiles: number;
  totalLineCount: number;
  hasApiLayer: boolean;
  hasCustomFixtures: boolean;
  hasMocking: boolean;
  hasVisualTesting: boolean;
}

interface ScanResult {
  success: boolean;
  contextId?: number;
  summary?: Record<string, any>;
  error?: string;
}

interface IntelligenceContext {
  id: number;
  repoId: string;
  framework: string;
  testPattern: string;
  updatedAt: string;
  version: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function computeQualityScore(profile: RepoProfile): {
  repoUnderstanding: number;
  workflowCoverage: number;
  helperReuse: number;
  overall: number;
  readiness: string;
} {
  // Understanding = how much of the framework's identity & conventions we detected.
  let understanding = 0;
  if (profile.framework && profile.framework !== 'unknown') understanding += 20;
  if (profile.testPattern && profile.testPattern !== 'unknown') understanding += 15;
  if (profile.locatorStrategy && profile.locatorStrategy !== 'unknown') understanding += 15;
  if (profile.codingStyle?.namingConvention) understanding += 10;
  if (profile.folderStructure?.testFolder) understanding += 10;
  if (profile.ciIntegration) understanding += 5;
  if (profile.preferredLocators?.length > 0) understanding += 10;
  if (profile.dependencies?.length > 0) understanding += 10;
  // Environment awareness (.env / env loader / dotenv) is part of understanding
  // how the framework is configured at runtime.
  const env = profile.environment;
  if (env && ((env.envFiles?.length || 0) > 0 || env.usesDotenv || env.configModule)) understanding += 5;
  understanding = Math.min(100, understanding);

  // Asset coverage = the reusable building blocks AI can leverage when
  // generating new tests: helpers, page objects, fixtures, commands AND
  // test-data files. Previously data files were ignored entirely, which
  // unfairly suppressed the score for data-driven frameworks.
  const assets = (profile.helperFunctions?.length || 0) + (profile.pageObjects?.length || 0) +
    (profile.fixtures?.length || 0) + (profile.customCommands?.length || 0) +
    (profile.dataFiles?.length || 0);
  const helperReuse = Math.min(100, assets * 8);

  // Workflow coverage = business flows extracted, with partial credit for test
  // suites so a repo with real tests but few distinct describe-flows isn't
  // zeroed out. Flow count is a property of how many tests exist, not of how
  // well AI understands the framework, so it carries the lowest weight.
  const flows = profile.businessFlows?.length || 0;
  const suites = profile.testSuites?.length || 0;
  const workflowCoverage = Math.min(100, flows * 20 + suites * 10);

  const overall = Math.round((understanding * 0.4) + (helperReuse * 0.35) + (workflowCoverage * 0.25));
  const readiness = overall >= 75 ? 'High' : overall >= 45 ? 'Medium' : 'Low';

  return { repoUnderstanding: understanding, workflowCoverage, helperReuse, overall, readiness };
}

/** Normalize a list that may be string[] or {name}[] (from the AST) to string[]. */
function nameList(items?: Array<{ name: string }> | string[]): string[] {
  if (!items) return [];
  return items.map((it: any) => (typeof it === 'string' ? it : it?.name)).filter(Boolean);
}

function frameworkIcon(fw: string) {
  const map: Record<string, string> = {
    playwright: '🎭', cypress: '🌲', selenium: '🌐', webdriverio: '🤖', testcafe: '☕',
  };
  return map[fw?.toLowerCase()] || '🧪';
}

function patternLabel(p: string) {
  const map: Record<string, string> = {
    pom: 'Page Object Model', bdd: 'BDD / Gherkin', hybrid: 'Hybrid', 'flat-scripts': 'Flat Scripts',
  };
  return map[p] || p;
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function RepoIntelligenceClient() {
  const { activeProject } = useProject();
  const projectId = activeProject?.id;
  const [repos, setRepos] = useState<RepoListItem[]>([]);
  const [contexts, setContexts] = useState<IntelligenceContext[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [profile, setProfile] = useState<RepoProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    profile: true, knowledge: true, helpers: true, workflows: true, quality: true,
  });
  const fetchingRef = useRef(false);

  const toggleSection = (key: string) =>
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  // Build headers from current projectId (stable — no new object each render)
  const getProjectHeaders = useCallback((): Record<string, string> => {
    if (!projectId) return {};
    return { 'x-project-id': String(projectId) };
  }, [projectId]);

  // Fetch repos + existing intelligence (project-scoped)
  const fetchData = useCallback(async () => {
    if (fetchingRef.current || !projectId) return;
    fetchingRef.current = true;
    setLoading(true);
    try {
      const [reposRes, ctxRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/repositories`).then(r => r.json()),
        fetch('/api/repo-intelligence/list', { headers: getProjectHeaders() }).then(r => r.json()),
      ]);
      // /api/projects/:id/repositories returns array or { repositories: [] }
      const repoList = Array.isArray(reposRes) ? reposRes : (reposRes.repositories || []);
      // Normalize id to string — API returns numeric id, but <select> values are strings
      setRepos(repoList.map((r: any) => ({ ...r, id: String(r.id) })));
      if (ctxRes.success && ctxRes.repositories) setContexts(ctxRes.repositories);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [projectId, getProjectHeaders]);

  // Clear state when project changes
  useEffect(() => {
    setSelectedRepo('');
    setProfile(null);
    setScanResult(null);
    setRepos([]);
    setContexts([]);
  }, [projectId]);

  // Re-fetch when project changes
  useEffect(() => { fetchData(); }, [fetchData]);

  // NOTE: No auto-select — user must explicitly choose a repo to prevent data leaks
  // across projects. The page shows an empty state until a repo is selected.

  // Load profile when repo selected — always fetch, backend returns 200 with exists:false for unscanned
  // Validate that the selected repo still belongs to the current project's repo list
  useEffect(() => {
    if (!selectedRepo) { setProfile(null); setProfileLoading(false); return; }
    // Note: cross-project guard removed — the [projectId] effect already clears
    // selectedRepo on project change, so no stale refs are possible.
    let cancelled = false;
    setProfileLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/repo-intelligence/${encodeURIComponent(selectedRepo)}`, { headers: getProjectHeaders() });
        const data = await res.json();
        if (cancelled) return;
        // Handle both new format (exists:false) and legacy 404
        if (data.success && data.profile) {
          setProfile(data.profile);
        } else {
          setProfile(null);
        }
      } catch {
        if (!cancelled) setProfile(null);
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedRepo, getProjectHeaders]);

  // Scan handler
  const handleScan = async () => {
    if (!selectedRepo) return;
    const repo = repos.find(r => r.id === selectedRepo);
    if (!repo) {
      setScanResult({ success: false, error: 'Selected repository not found. Please re-select and try again.' });
      return;
    }
    if (!repo.url) {
      setScanResult({ success: false, error: 'Repository URL not available. Please check repository configuration.' });
      return;
    }
    setScanning(true);
    setScanResult(null);
    try {
      const res = await fetch('/api/repo-intelligence/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getProjectHeaders() },
        body: JSON.stringify({
          repoId: selectedRepo,
          repoPath: repo.url,
          repoName: repo.name,
          branch: repo.branch || 'main',
        }),
      });
      const data = await res.json();
      setScanResult(data);
      if (data.success) {
        await fetchData();
      }
    } catch (err: any) {
      setScanResult({ success: false, error: err.message });
    } finally {
      setScanning(false);
    }
  };

  const quality = profile ? computeQualityScore(profile) : null;
  const scannedCtx = contexts.find(c => c.repoId === selectedRepo);
  const selectedRepoInfo = repos.find(r => r.id === selectedRepo);
  const isUnscanned = !!selectedRepo && !scannedCtx && !profile;

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30">
              <Brain className="w-6 h-6 text-violet-400" />
            </div>
            <h1 className="text-2xl font-display font-bold tracking-tight text-slate-100">
              AI Application Understanding
            </h1>
          </div>
          <p className="text-sm text-slate-400 max-w-2xl">
            The intelligence engine that learns your repository — framework, patterns, helpers, workflows.
            Every insight compounds across script generation, healing, and RCA.
          </p>
        </div>

        {/* Repo Selector + Scan */}
        <div className="flex items-center gap-3">
          <select
            value={selectedRepo}
            onChange={(e) => { setSelectedRepo(e.target.value); setScanResult(null); }}
            className="h-10 px-3 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
          >
            <option value="">Select repository…</option>
            {repos.map(r => {
              const isScanned = contexts.some(c => c.repoId === r.id);
              return (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.branch}){isScanned ? ' ✓' : ''}
                </option>
              );
            })}
          </select>
          <button
            onClick={handleScan}
            disabled={!selectedRepo || scanning}
            className="h-10 px-5 rounded-lg font-medium text-sm flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/20"
          >
            {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {scanning ? 'Scanning…' : scannedCtx ? 'Re-Scan' : 'Scan Repository'}
          </button>
        </div>
      </div>

      {/* ── Scanning in progress ─────────────────────────── */}
      {scanning && (
        <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative">
              <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
              <div className="absolute inset-0 w-8 h-8 rounded-full bg-violet-400/10 animate-ping" />
            </div>
            <div>
              <p className="font-semibold text-violet-200">Analyzing repository…</p>
              <p className="text-xs text-violet-400/80 mt-0.5">
                Cloning {selectedRepoInfo?.name || 'repository'} and scanning codebase structure
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Cloning repository', icon: GitBranch },
              { label: 'Detecting framework & patterns', icon: Cpu },
              { label: 'Indexing helpers & page objects', icon: Sparkles },
              { label: 'Extracting business workflows', icon: Workflow },
              { label: 'Building intelligence profile', icon: Brain },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <step.icon className="w-4 h-4 text-violet-500/60" />
                <span className="text-slate-400">{step.label}</span>
                <Loader2 className="w-3 h-3 animate-spin text-violet-500/40 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Scan result toast ────────────────────────────── */}
      {scanResult && !scanning && (
        <div className={`rounded-lg border p-4 text-sm flex items-start gap-3 ${
          scanResult.success
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>
          {scanResult.success ? <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" /> : <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />}
          <div className="flex-1">
            {scanResult.success ? (
              <>
                <p className="font-medium">Scan complete</p>
                <p className="text-xs mt-1 opacity-80">
                  {scanResult.summary?.framework} · {scanResult.summary?.testPattern} · {scanResult.summary?.totalFiles} files · {scanResult.summary?.helperFunctions} helpers · {scanResult.summary?.pageObjects} page objects · {scanResult.summary?.codeChunks} code chunks · {scanResult.summary?.scanDurationMs}ms
                </p>
              </>
            ) : (
              <>
                <p className="font-medium">Scan failed</p>
                <p className="text-xs mt-1 opacity-80">{scanResult.error || 'An unexpected error occurred'}</p>
                <button
                  onClick={handleScan}
                  className="mt-2 text-xs font-medium text-red-300 hover:text-red-200 underline underline-offset-2"
                >
                  Retry scan
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Loading state ────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
        </div>
      )}

      {/* ── No repo selected ─────────────────────────────── */}
      {!loading && !selectedRepo && repos.length === 0 && (
        <div className="text-center py-20">
          <Brain className="w-16 h-16 mx-auto mb-4 text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-300 mb-2">No Repositories Found</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Add a repository to your project first, then come back here to scan it and build intelligence.
          </p>
        </div>
      )}

      {!loading && !selectedRepo && repos.length > 0 && (
        <div className="text-center py-20">
          <Brain className="w-16 h-16 mx-auto mb-4 text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-300 mb-2">Select a Repository</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Choose a repository from the dropdown above to view or build its intelligence profile.
          </p>
        </div>
      )}

      {/* ── Unscanned repo — rich first-scan experience ── */}
      {!loading && isUnscanned && !scanning && !profileLoading && (
        <div className="space-y-6">
          {/* Hero card */}
          <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 via-slate-800/50 to-purple-500/5 p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 mb-4">
              <BarChart3 className="w-8 h-8 text-violet-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-100 mb-2">No Intelligence Data Yet</h3>
            <p className="text-sm text-slate-400 max-w-lg mx-auto mb-6">
              This repository hasn&apos;t been analyzed yet. Start your first scan to let the AI
              learn your framework, patterns, helpers, and workflows — which dramatically
              improves script generation quality.
            </p>
            <button
              onClick={handleScan}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-violet-500/40 hover:scale-[1.02]"
            >
              <Scan className="w-5 h-5" />
              Scan Repository
            </button>
          </div>

          {/* What the scan will discover */}
          <div className="rounded-xl bg-slate-800/40 border border-slate-700/50 p-6">
            <h4 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-violet-400" />
              What the scan will discover
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { icon: Cpu, title: 'Framework & Patterns', desc: 'Detects your test framework, assertion library, locator strategy, and coding conventions' },
                { icon: Sparkles, title: 'Reusable Assets', desc: 'Indexes helper functions, page objects, fixtures, and custom commands for AI reuse' },
                { icon: Workflow, title: 'Business Workflows', desc: 'Extracts multi-step business flows and test suites to understand your application' },
                { icon: Network, title: 'Knowledge Graph', desc: 'Maps connections between tests, helpers, pages, and flows for context-aware generation' },
                { icon: Activity, title: 'Quality Score', desc: 'Calculates how well AI understands your codebase and its readiness for generation' },
                { icon: Eye, title: 'Context Preview', desc: 'Shows exactly what context AI will inject when generating scripts for this repo' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/40">
                  <item.icon className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-slate-200">{item.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Repository info */}
          {selectedRepoInfo && (
            <div className="rounded-lg bg-slate-800/30 border border-slate-700/30 px-4 py-3 flex items-center gap-3 text-sm">
              <GitBranch className="w-4 h-4 text-slate-500" />
              <span className="text-slate-400">
                Ready to scan <span className="text-slate-200 font-medium">{selectedRepoInfo.name}</span>
                {' '}on branch <span className="text-slate-200 font-mono">{selectedRepoInfo.branch}</span>
              </span>
              <span className="text-xs text-slate-600 ml-auto truncate max-w-[300px]">{selectedRepoInfo.url}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Profile loading indicator ────────────────────── */}
      {!loading && selectedRepo && profileLoading && !scanning && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <Loader2 className="w-6 h-6 animate-spin text-violet-400 mx-auto mb-3" />
            <p className="text-sm text-slate-400">Loading intelligence profile…</p>
          </div>
        </div>
      )}

      {/* ── Profile data ─────────────────────────────────── */}
      {!loading && profile && quality && (
        <>
          {/* ── SECTION 1: Context Quality Score ───────────── */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <QualityCard label="Understanding" value={quality.repoUnderstanding} color="violet" />
            <QualityCard label="Workflow Coverage" value={quality.workflowCoverage} color="blue" />
            <QualityCard label="Asset Coverage" value={quality.helperReuse} color="emerald" />
            <QualityCard label="Overall Score" value={quality.overall} color="amber" />
            <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-4 flex flex-col items-center justify-center">
              <span className="text-xs text-slate-500 uppercase tracking-wider mb-1">Readiness</span>
              <span className={`text-xl font-bold ${
                quality.readiness === 'High' ? 'text-emerald-400' :
                quality.readiness === 'Medium' ? 'text-amber-400' : 'text-red-400'
              }`}>
                {quality.readiness}
              </span>
              <span className="text-[10px] text-slate-500 mt-1">Generation Ready</span>
            </div>
          </div>

          {/* ── SECTION 2: Repository Profile ─────────────── */}
          <CollapsibleSection
            id="profile"
            title="Repository Profile"
            subtitle="What AI learned about your application"
            icon={<Cpu className="w-5 h-5 text-violet-400" />}
            expanded={expandedSections.profile}
            onToggle={() => toggleSection('profile')}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <ProfileCard label="Framework" value={`${frameworkIcon(profile.framework)} ${profile.framework}`} />
              <ProfileCard label="Language" value={profile.language} />
              <ProfileCard label="Test Pattern" value={patternLabel(profile.testPattern)} />
              <ProfileCard label="Locator Strategy" value={profile.locatorStrategy} />
              <ProfileCard label="Assertion Library" value={profile.assertionLibrary || 'expect'} />
              <ProfileCard label="CI/CD" value={profile.ciIntegration || 'Not detected'} />
              <ProfileCard label="Total Files" value={String(profile.totalFiles)} />
              <ProfileCard label="Total Lines" value={profile.totalLineCount?.toLocaleString() || '—'} />
            </div>

            {/* Coding Style */}
            {profile.codingStyle && (
              <div className="mt-4">
                <h4 className="text-xs uppercase tracking-wider text-slate-500 mb-2 font-medium">Coding Conventions</h4>
                <div className="flex flex-wrap gap-2">
                  {profile.codingStyle.namingConvention && <StyleTag label="Naming" value={profile.codingStyle.namingConvention} />}
                  {profile.codingStyle.testNaming && <StyleTag label="Test Naming" value={profile.codingStyle.testNaming} />}
                  {profile.codingStyle.stepStyle && <StyleTag label="Step Style" value={profile.codingStyle.stepStyle} />}
                  {profile.codingStyle.quoteStyle && <StyleTag label="Quotes" value={profile.codingStyle.quoteStyle} />}
                  {profile.codingStyle.indentStyle && <StyleTag label="Indent" value={profile.codingStyle.indentStyle} />}
                  <StyleTag label="Semicolons" value={profile.codingStyle.semicolons ? 'Yes' : 'No'} />
                  {profile.codingStyle.tagConvention && <StyleTag label="Tags" value={profile.codingStyle.tagConvention} />}
                </div>
              </div>
            )}

            {/* Folder Structure */}
            {profile.folderStructure && (
              <div className="mt-4">
                <h4 className="text-xs uppercase tracking-wider text-slate-500 mb-2 font-medium">Folder Structure</h4>
                <div className="flex flex-wrap gap-2">
                  {profile.folderStructure.testFolder && <FolderTag icon={<FileCode className="w-3 h-3" />} label={`Tests: ${profile.folderStructure.testFolder}`} />}
                  {profile.folderStructure.pageObjectFolder && <FolderTag icon={<Layers className="w-3 h-3" />} label={`Pages: ${profile.folderStructure.pageObjectFolder}`} />}
                  {profile.folderStructure.fixtureFolder && <FolderTag icon={<Box className="w-3 h-3" />} label={`Fixtures: ${profile.folderStructure.fixtureFolder}`} />}
                  {profile.folderStructure.utilsFolder && <FolderTag icon={<Folder className="w-3 h-3" />} label={`Utils: ${profile.folderStructure.utilsFolder}`} />}
                  {profile.folderStructure.configFiles?.map((f, i) => (
                    <FolderTag key={i} icon={<Code2 className="w-3 h-3" />} label={f} />
                  ))}
                </div>
              </div>
            )}

            {/* Preferred Locators */}
            {profile.preferredLocators?.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs uppercase tracking-wider text-slate-500 mb-2 font-medium">Preferred Locators</h4>
                <div className="space-y-1.5">
                  {profile.preferredLocators.sort((a, b) => b.count - a.count).slice(0, 6).map((loc, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs font-mono text-violet-300 w-32 shrink-0">{loc.pattern}</span>
                      <div className="flex-1 h-2 rounded-full bg-slate-700/50 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500"
                          style={{ width: `${Math.min(100, (loc.count / (profile.preferredLocators[0]?.count || 1)) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-400 w-10 text-right">{loc.count}</span>
                      <span className="text-[10px] text-slate-600 font-mono truncate max-w-[200px]">{loc.example}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CollapsibleSection>

          {/* ── SECTION 3: AI Knowledge Graph ─────────────── */}
          <CollapsibleSection
            id="knowledge"
            title="AI Knowledge Graph"
            subtitle="How your codebase elements connect"
            icon={<Network className="w-5 h-5 text-blue-400" />}
            expanded={expandedSections.knowledge}
            onToggle={() => toggleSection('knowledge')}
          >
            <KnowledgeGraph profile={profile} />
          </CollapsibleSection>

          {/* ── SECTION 4: Reusable Helpers ───────────────── */}
          <CollapsibleSection
            id="helpers"
            title="Reusable Assets"
            subtitle={`AI discovered ${(profile.helperFunctions?.length || 0) + (profile.pageObjects?.length || 0) + (profile.fixtures?.length || 0) + (profile.dataFiles?.length || 0)} reusable components`}
            icon={<Sparkles className="w-5 h-5 text-emerald-400" />}
            expanded={expandedSections.helpers}
            onToggle={() => toggleSection('helpers')}
          >
            <HelpersList profile={profile} />
          </CollapsibleSection>

          {/* ── SECTION 5: Workflow Intelligence ──────────── */}
          <CollapsibleSection
            id="workflows"
            title="Workflow Intelligence"
            subtitle="Business flows AI extracted from your tests"
            icon={<Workflow className="w-5 h-5 text-amber-400" />}
            expanded={expandedSections.workflows}
            onToggle={() => toggleSection('workflows')}
          >
            <WorkflowVisualization flows={profile.businessFlows} testSuites={profile.testSuites} />
          </CollapsibleSection>

          {/* ── SECTION 6: Generation Context Preview ─────── */}
          <CollapsibleSection
            id="context"
            title="Generation Context Preview"
            subtitle="What AI includes when generating scripts for this repo"
            icon={<Eye className="w-5 h-5 text-cyan-400" />}
            expanded={expandedSections.context}
            onToggle={() => toggleSection('context')}
          >
            <ContextPreview profile={profile} repoId={selectedRepo} />
          </CollapsibleSection>

          {/* ── SECTION 7: Environment Awareness ──────────── */}
          {profile.environment && (
            ((profile.environment.envFiles?.length || 0) > 0 ||
              profile.environment.usesDotenv ||
              profile.environment.configModule ||
              (profile.environment.envVars?.length || 0) > 0) && (
              <EnvironmentPanel env={profile.environment} />
            )
          )}

          {/* ── SECTION 8: Dependencies & Capabilities ────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <CapabilityCard icon={<Layers className="w-5 h-5" />} label="API Layer" active={profile.hasApiLayer} />
            <CapabilityCard icon={<Box className="w-5 h-5" />} label="Custom Fixtures" active={profile.hasCustomFixtures} />
            <CapabilityCard icon={<Shield className="w-5 h-5" />} label="Mocking" active={profile.hasMocking} />
            <CapabilityCard icon={<Eye className="w-5 h-5" />} label="Visual Testing" active={profile.hasVisualTesting} />
          </div>

          {/* Version info */}
          {scannedCtx && (
            <div className="text-center text-xs text-slate-600 py-2">
              Intelligence v{scannedCtx.version} · Last scanned {new Date(scannedCtx.updatedAt).toLocaleString()}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Sub-Components                                                     */
/* ================================================================== */

function QualityCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    violet: 'from-violet-500/20 to-violet-600/10 border-violet-500/30 text-violet-400',
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400',
    emerald: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400',
    amber: 'from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-400',
  };
  return (
    <div className={`rounded-xl bg-gradient-to-br ${colorMap[color]} border p-4 text-center`}>
      <span className="text-xs text-slate-500 uppercase tracking-wider">{label}</span>
      <div className="text-3xl font-bold mt-1">{value}</div>
      <div className="w-full h-1.5 rounded-full bg-slate-700/50 mt-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            color === 'violet' ? 'bg-violet-500' :
            color === 'blue' ? 'bg-blue-500' :
            color === 'emerald' ? 'bg-emerald-500' : 'bg-amber-500'
          }`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function ProfileCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-800/60 border border-slate-700/50 p-3">
      <span className="text-[10px] uppercase tracking-wider text-slate-500">{label}</span>
      <p className="text-sm font-semibold text-slate-200 mt-0.5 truncate">{value || '—'}</p>
    </div>
  );
}

function StyleTag({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-slate-700/50 border border-slate-600/50 text-slate-300">
      <span className="text-slate-500">{label}:</span> {value}
    </span>
  );
}

function FolderTag({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-violet-500/10 border border-violet-500/20 text-violet-300">
      {icon} {label}
    </span>
  );
}

function CapabilityCard({ icon, label, active }: { icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <div className={`rounded-lg border p-3 flex items-center gap-3 ${
      active
        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
        : 'bg-slate-800/30 border-slate-700/30 text-slate-600'
    }`}>
      {icon}
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-[10px] uppercase tracking-wider">{active ? 'Detected' : 'Not Found'}</p>
      </div>
    </div>
  );
}

function EnvironmentPanel({ env }: { env: NonNullable<RepoProfile['environment']> }) {
  return (
    <div className="rounded-xl bg-slate-800/40 border border-slate-700/50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Settings className="w-5 h-5 text-cyan-400" />
        <h3 className="text-sm font-semibold text-slate-200">Environment Awareness</h3>
        <span className="text-[10px] text-slate-500">how this framework is configured at runtime</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg bg-slate-900/50 border border-slate-700/40 p-3">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
            <Folder className="w-3 h-3" /> Env Files
          </p>
          {env.envFiles?.length ? (
            <div className="flex flex-wrap gap-1">
              {env.envFiles.map((f, i) => (
                <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-300">{f}</span>
              ))}
            </div>
          ) : <span className="text-xs text-slate-600">None</span>}
        </div>

        <div className="rounded-lg bg-slate-900/50 border border-slate-700/40 p-3">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
            <Zap className="w-3 h-3" /> dotenv
          </p>
          <span className={`text-sm font-medium ${env.usesDotenv ? 'text-emerald-400' : 'text-slate-600'}`}>
            {env.usesDotenv ? 'In use' : 'Not used'}
          </span>
        </div>

        <div className="rounded-lg bg-slate-900/50 border border-slate-700/40 p-3">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
            <FileCode className="w-3 h-3" /> Config Module
          </p>
          {env.configModule
            ? <span className="text-[11px] font-mono text-slate-300 break-all">{env.configModule}</span>
            : <span className="text-xs text-slate-600">None</span>}
        </div>

        <div className="rounded-lg bg-slate-900/50 border border-slate-700/40 p-3">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
            <KeyRound className="w-3 h-3" /> Env Variables ({env.envVars?.length || 0})
          </p>
          {env.envVars?.length ? (
            <div className="flex flex-wrap gap-1">
              {env.envVars.slice(0, 8).map((v, i) => (
                <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">{v}</span>
              ))}
              {env.envVars.length > 8 && (
                <span className="text-[10px] text-slate-500">+{env.envVars.length - 8} more</span>
              )}
            </div>
          ) : <span className="text-xs text-slate-600">None referenced</span>}
        </div>
      </div>
    </div>
  );
}

function CollapsibleSection({
  id, title, subtitle, icon, expanded, onToggle, children,
}: {
  id: string; title: string; subtitle: string; icon: React.ReactNode;
  expanded: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-slate-800/40 border border-slate-700/50 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 hover:bg-slate-700/20 transition-colors text-left"
      >
        {icon}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
          <p className="text-xs text-slate-500 truncate">{subtitle}</p>
        </div>
        {expanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
      </button>
      {expanded && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

/* ── Knowledge Graph ─────────────────────────────────────────── */

function KnowledgeGraph({ profile }: { profile: RepoProfile }) {
  const nodes = [
    { id: 'tests', label: 'Tests', count: profile.totalTestFiles || 0, color: 'violet', icon: '🧪' },
    { id: 'helpers', label: 'Helpers', count: profile.helperFunctions?.length || 0, color: 'emerald', icon: '🔧' },
    { id: 'pages', label: 'Page Objects', count: profile.pageObjects?.length || 0, color: 'blue', icon: '📄' },
    { id: 'flows', label: 'Workflows', count: profile.businessFlows?.length || 0, color: 'amber', icon: '🔀' },
    { id: 'fixtures', label: 'Fixtures', count: profile.fixtures?.length || 0, color: 'cyan', icon: '📌' },
    { id: 'data', label: 'Data Files', count: profile.dataFiles?.length || 0, color: 'rose', icon: '🗂️' },
    { id: 'commands', label: 'Commands', count: profile.customCommands?.length || 0, color: 'pink', icon: '⚡' },
  ];

  // Simple connection visualization. Datasets feed tests + helpers (the helpers
  // that read data/*.json), page objects extend the base page, fixtures wrap tests.
  const connections = [
    ['tests', 'pages'], ['tests', 'fixtures'], ['tests', 'helpers'],
    ['helpers', 'data'], ['tests', 'data'],
    ['flows', 'tests'], ['commands', 'tests'],
  ];

  return (
    <div className="space-y-4">
      {/* Node grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {nodes.map(node => (
          <div key={node.id} className="rounded-lg bg-slate-900/60 border border-slate-700/50 p-3 flex items-center gap-3">
            <span className="text-2xl">{node.icon}</span>
            <div>
              <p className="text-sm font-semibold text-slate-200">{node.label}</p>
              <p className="text-xs text-slate-400">{node.count} discovered</p>
            </div>
          </div>
        ))}
      </div>

      {/* Connection map */}
      <div className="rounded-lg bg-slate-900/40 border border-slate-700/30 p-4">
        <h4 className="text-xs uppercase tracking-wider text-slate-500 mb-3 font-medium">Dependency Connections</h4>
        <div className="flex flex-wrap gap-2">
          {connections.map(([from, to], i) => {
            const fromNode = nodes.find(n => n.id === from);
            const toNode = nodes.find(n => n.id === to);
            if (!fromNode || !toNode) return null;
            const active = fromNode.count > 0 && toNode.count > 0;
            return (
              <span key={i} className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
                active
                  ? 'bg-violet-500/10 border-violet-500/25 text-violet-300'
                  : 'bg-slate-800/50 border-slate-700/30 text-slate-600'
              }`}>
                {fromNode.icon} {fromNode.label}
                <ArrowRight className="w-3 h-3" />
                {toNode.icon} {toNode.label}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Reusable Helpers List ───────────────────────────────────── */

function HelpersList({ profile }: { profile: RepoProfile }) {
  const [filter, setFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'helpers' | 'pages' | 'fixtures' | 'data' | 'commands'>('helpers');

  const tabs = [
    { key: 'helpers' as const, label: 'Helpers', count: profile.helperFunctions?.length || 0, icon: '🔧' },
    { key: 'pages' as const, label: 'Page Objects', count: profile.pageObjects?.length || 0, icon: '📄' },
    { key: 'fixtures' as const, label: 'Fixtures', count: profile.fixtures?.length || 0, icon: '📌' },
    { key: 'data' as const, label: 'Data Files', count: profile.dataFiles?.length || 0, icon: '🗂️' },
    { key: 'commands' as const, label: 'Commands', count: profile.customCommands?.length || 0, icon: '⚡' },
  ];

  const getItems = (): Array<{ name: string; file: string; detail: string }> => {
    switch (activeTab) {
      case 'helpers': return (profile.helperFunctions || []).map(h => ({
        name: h.name, file: h.filePath, detail: nameList(h.parameters).join(', '),
      }));
      case 'pages': return (profile.pageObjects || []).map(p => {
        const methods = nameList(p.methods);
        const shown = methods.slice(0, 4).join(', ');
        const extra = methods.length > 4 ? ` +${methods.length - 4} more` : '';
        return { name: p.name, file: p.filePath, detail: shown + extra };
      });
      case 'fixtures': return (profile.fixtures || []).map(f => ({
        name: f.name, file: f.filePath, detail: '',
      }));
      case 'data': return (profile.dataFiles || []).map(d => ({
        name: d.name, file: d.path,
        detail: `${d.type}${typeof d.recordCount === 'number' ? ` · ${d.recordCount} record${d.recordCount === 1 ? '' : 's'}` : ''}`,
      }));
      case 'commands': return (profile.customCommands || []).map(c => ({
        name: c.name, file: c.filePath, detail: '',
      }));
    }
  };

  const items = getItems().filter(item =>
    !filter || item.name.toLowerCase().includes(filter.toLowerCase()) ||
    item.file.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-3">
      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-900/50">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-2 px-3 rounded-md transition-colors ${
              activeTab === tab.key
                ? 'bg-violet-500/20 text-violet-300 font-medium'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${
              activeTab === tab.key ? 'bg-violet-500/30 text-violet-300' : 'bg-slate-700/50 text-slate-500'
            }`}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search by name or file…"
          className="w-full h-9 pl-9 pr-3 rounded-lg bg-slate-900/50 border border-slate-700/50 text-sm text-slate-200 placeholder-slate-600 focus:ring-1 focus:ring-violet-500/50"
        />
      </div>

      {/* Items */}
      <div className="max-h-[360px] overflow-y-auto scrollbar-thin space-y-1">
        {items.length === 0 ? (
          <p className="text-center text-sm text-slate-600 py-6">No {activeTab} found</p>
        ) : (
          items.map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-700/20 transition-colors group">
              <div className="w-8 h-8 rounded-md bg-slate-700/50 flex items-center justify-center text-xs font-mono text-violet-400 shrink-0">
                {activeTab === 'helpers' ? 'fn' : activeTab === 'pages' ? 'PO' : activeTab === 'fixtures' ? 'fx' : activeTab === 'data' ? 'db' : 'cmd'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-mono font-medium text-slate-200 truncate">
                  {item.name}{item.detail ? <span className="text-slate-500">({item.detail})</span> : ''}
                </p>
                <p className="text-[10px] text-slate-600 font-mono truncate">{item.file}</p>
              </div>
              <span className="text-[10px] text-violet-400/60 opacity-0 group-hover:opacity-100 transition-opacity">
                AI will import this
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ── Workflow Visualization ──────────────────────────────────── */

function WorkflowVisualization({
  flows, testSuites,
}: { flows: RepoProfile['businessFlows']; testSuites: RepoProfile['testSuites'] }) {
  const [expandedFlow, setExpandedFlow] = useState<number | null>(0);

  return (
    <div className="space-y-4">
      {/* Business Flows */}
      {flows?.length > 0 ? (
        <div className="space-y-2">
          <h4 className="text-xs uppercase tracking-wider text-slate-500 mb-1 font-medium">
            Business Flows <span className="text-violet-400">({flows.length})</span>
          </h4>
          {flows.map((flow, i) => (
            <div key={i} className="rounded-lg border border-slate-700/50 overflow-hidden">
              <button
                onClick={() => setExpandedFlow(expandedFlow === i ? null : i)}
                className="w-full flex items-center gap-3 p-3 hover:bg-slate-700/20 transition-colors text-left"
              >
                <Workflow className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{flow.name}</p>
                  <p className="text-[10px] text-slate-600 font-mono truncate">{flow.filePath || flow.relatedFiles?.[0] || ''}</p>
                </div>
                {flow.category && flow.category !== 'general' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 capitalize">{flow.category}</span>
                )}
                <span className="text-xs text-slate-500">{flow.steps?.length || 0} steps</span>
                {expandedFlow === i
                  ? <ChevronDown className="w-4 h-4 text-slate-500" />
                  : <ChevronRight className="w-4 h-4 text-slate-500" />
                }
              </button>
              {expandedFlow === i && flow.steps?.length > 0 && (
                <div className="px-3 pb-3">
                  <div className="flex flex-wrap items-center gap-1 ml-7">
                    {flow.steps.map((step, si) => (
                      <span key={si} className="flex items-center gap-1">
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-700/60 text-slate-300 font-mono">
                          {step}
                        </span>
                        {si < flow.steps.length - 1 && (
                          <ArrowRight className="w-3 h-3 text-slate-600" />
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-600 text-center py-4">No business flows extracted yet</p>
      )}

      {/* Test Suites */}
      {testSuites?.length > 0 && (
        <div>
          <h4 className="text-xs uppercase tracking-wider text-slate-500 mb-2 font-medium">
            Test Suites <span className="text-blue-400">({testSuites.length})</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {testSuites.slice(0, 12).map((suite, i) => (
              <div key={i} className="rounded-lg bg-slate-900/40 border border-slate-700/30 p-3 flex items-center gap-3">
                <FileCode className="w-4 h-4 text-blue-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 truncate">{suite.name}</p>
                  <p className="text-[10px] text-slate-600 font-mono truncate">{suite.filePath}</p>
                </div>
                <span className="text-xs text-slate-500">{suite.testCount} tests</span>
                {suite.tags?.length ? (
                  <div className="flex gap-1">
                    {suite.tags.slice(0, 2).map((tag, ti) => (
                      <span key={ti} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Context Preview ─────────────────────────────────────────── */

function ContextPreview({ profile, repoId }: { profile: RepoProfile; repoId: string }) {
  const { activeProject } = useProject();
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (activeProject?.id) headers['x-project-id'] = String(activeProject.id);
      const res = await fetch(`/api/repo-intelligence/${encodeURIComponent(repoId)}/summary`, { headers });
      const data = await res.json();
      if (data.success) setSummaryText(data.summary);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadSummary(); }, [repoId, activeProject?.id]);

  // Build context checklist
  const checks = [
    { label: 'Framework detected', active: !!profile.framework && profile.framework !== 'unknown', detail: profile.framework },
    { label: 'Test pattern identified', active: !!profile.testPattern && profile.testPattern !== 'unknown', detail: patternLabel(profile.testPattern) },
    { label: 'Locator strategy mapped', active: !!profile.locatorStrategy && profile.locatorStrategy !== 'unknown', detail: profile.locatorStrategy },
    { label: 'Coding style learned', active: !!profile.codingStyle?.namingConvention, detail: profile.codingStyle?.namingConvention },
    { label: 'Helper functions indexed', active: (profile.helperFunctions?.length || 0) > 0, detail: `${profile.helperFunctions?.length || 0} helpers` },
    { label: 'Page objects discovered', active: (profile.pageObjects?.length || 0) > 0, detail: `${profile.pageObjects?.length || 0} POM classes` },
    { label: 'Fixtures cataloged', active: (profile.fixtures?.length || 0) > 0, detail: `${profile.fixtures?.length || 0} fixtures` },
    { label: 'Business flows extracted', active: (profile.businessFlows?.length || 0) > 0, detail: `${profile.businessFlows?.length || 0} flows` },
    { label: 'CI/CD integration detected', active: !!profile.ciIntegration, detail: profile.ciIntegration || 'None' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Context checklist */}
      <div>
        <h4 className="text-xs uppercase tracking-wider text-slate-500 mb-3 font-medium">
          Context Included in Generation
        </h4>
        <div className="space-y-1.5">
          {checks.map((check, i) => (
            <div key={i} className="flex items-center gap-2.5 py-1">
              {check.active ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-slate-600 shrink-0" />
              )}
              <span className={`text-sm ${
                check.active ? 'text-slate-200' : 'text-slate-600'
              }`}>{check.label}</span>
              <span className="text-xs text-slate-500 ml-auto">{check.detail}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Raw AI prompt preview */}
      <div>
        <h4 className="text-xs uppercase tracking-wider text-slate-500 mb-3 font-medium">
          AI Prompt Context <span className="text-slate-600">(injected into generation)</span>
        </h4>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
          </div>
        ) : summaryText ? (
          <pre className="text-[11px] leading-relaxed font-mono text-slate-400 bg-slate-900/60 border border-slate-700/30 rounded-lg p-3 max-h-[300px] overflow-y-auto scrollbar-thin whitespace-pre-wrap">
            {summaryText}
          </pre>
        ) : (
          <p className="text-sm text-slate-600 text-center py-8">No summary available</p>
        )}
      </div>
    </div>
  );
}
