'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useProject, useProjectHeaders } from '@/lib/project-context';
import { KnowledgeSelector } from '@/components/knowledge-selector';
import {
  Play,
  Loader2,
  Sparkles,
  CheckCircle2,
  XCircle,
  FileCode,
  Clock,
  Zap,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  GitBranch,
  ExternalLink,
  Github,
  Cpu,
  Brain,
  BookOpen,
  X,
  Shield,
  Lock,
  Eye,
  EyeOff,
  Fingerprint,
  Database,
  RefreshCw,
} from 'lucide-react';
import type { ProjectContext } from './scripts-client';

interface ScriptGeneratorProps {
  projectContext: ProjectContext;
  onGenerated: () => void;
  prefillScenarios?: string[] | null;
  onPrefillConsumed?: () => void;
}

interface GenerationResult {
  success: boolean;
  data?: {
    id: number;
    url: string;
    filesGenerated: number;
    files: Array<{ path: string; size: number; type: string }>;
    testPlan: any;
    validationReport: any;
    stats: {
      totalTests: number;
      totalAssertions: number;
      tokensUsed: number;
      model: string;
    };
    generationTimeMs: number;
    errors: string[];
    intelligence?: {
      profileId: number;
      crawlStrategy: 'FAST_PATH' | 'SLOW_PATH';
      crawlTimeMs?: number;
      profileAge?: string;
      patternsDetected?: number;
    };
  };
  error?: string;
}

interface PushResult {
  success: boolean;
  data?: {
    scriptId: number;
    repoUrl: string;
    branchName: string;
    branchUrl: string;
    commitSha: string;
    filesCount: number;
    pullRequest: { prUrl: string; prNumber: number } | null;
    message?: string;
  };
  error?: string;
}

const TEST_TYPE_OPTIONS = [
  { value: 'smoke', label: 'Smoke Tests', description: 'Quick validation of critical paths' },
  { value: 'functional', label: 'Functional Tests', description: 'Detailed feature testing' },
  { value: 'authentication', label: 'Auth Tests', description: 'Login/logout/session flows' },
  { value: 'form_validation', label: 'Form Validation', description: 'Input validation & error states' },
  { value: 'navigation', label: 'Navigation Tests', description: 'Page routing & links' },
];

export function ScriptGenerator({ projectContext, onGenerated, prefillScenarios, onPrefillConsumed }: ScriptGeneratorProps) {
  const { activeProject } = useProject();
  const projectHeaders = useProjectHeaders();
  const [scenario, setScenario] = useState('');
  const [targetUrl, setTargetUrl] = useState(projectContext.appUrl);
  const [testTypes, setTestTypes] = useState<string[]>(['smoke', 'functional']);
  const [includeNegative, setIncludeNegative] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Repo intelligence state
  const [selectedRepoId, setSelectedRepoId] = useState('');
  const [repoContextLoaded, setRepoContextLoaded] = useState(false);
  const [repoContextSummary, setRepoContextSummary] = useState<{
    framework?: string; testPattern?: string; locatorStrategy?: string;
    helpers?: number; pageObjects?: number; flows?: number;
  } | null>(null);

  // GitHub push state
  const [showPushDialog, setShowPushDialog] = useState(false);
  const [repos, setRepos] = useState<Array<{ id: string; name: string; url: string; branch: string }>>([]);
  const [pushRepoUrl, setPushRepoUrl] = useState('');
  const [pushBranch, setPushBranch] = useState('');
  const [createPR, setCreatePR] = useState(true);
  const [pushing, setPushing] = useState(false);
  const [pushResult, setPushResult] = useState<PushResult | null>(null);

  // GitHub connection state (centralized via Tools page)
  const [ghConnected, setGhConnected] = useState<boolean | null>(null); // null = loading
  const [ghUser, setGhUser] = useState<{ login: string; name: string | null; avatarUrl: string } | null>(null);
  const [ghRepos, setGhRepos] = useState<Array<{ fullName: string; name: string; owner: string; defaultBranch: string; private: boolean }>>([]);
  const [ghReposLoading, setGhReposLoading] = useState(false);
  const [selectedGhRepo, setSelectedGhRepo] = useState('');
  const [prTitle, setPrTitle] = useState('');
  const [prBranch, setPrBranch] = useState('');
  const [showPrModal, setShowPrModal] = useState(false);
  const [creatingPr, setCreatingPr] = useState(false);
  const [prResult, setPrResult] = useState<{ success: boolean; prUrl?: string; prNumber?: number; error?: string } | null>(null);

  // App Knowledge state
  const [selectedKnowledgeIds, setSelectedKnowledgeIds] = useState<number[]>([]);

  // Authentication state (for crawling behind login walls)
  const [authEnabled, setAuthEnabled] = useState(false);
  const [authLoginUrl, setAuthLoginUrl] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [showAuthPassword, setShowAuthPassword] = useState(false);

  // Application Intelligence state
  const [forceFreshCrawl, setForceFreshCrawl] = useState(false);
  const [profileStatus, setProfileStatus] = useState<{
    exists: boolean;
    status?: string;
    lastCrawledAt?: string;
    pageCount?: number;
  } | null>(null);
  const [profileChecking, setProfileChecking] = useState(false);

  // Auto-fill from CSV/Excel upload
  useEffect(() => {
    if (prefillScenarios && prefillScenarios.length > 0) {
      const combined = prefillScenarios.map((s, i) => `${i + 1}. ${s}`).join('\n\n');
      setScenario(combined);
      onPrefillConsumed?.();
    }
  }, [prefillScenarios, onPrefillConsumed]);

  // Fetch repos for the dropdown
  const fetchingReposRef = useRef(false);
  const fetchRepos = useCallback(async () => {
    if (fetchingReposRef.current) return; // prevent duplicate fetches
    fetchingReposRef.current = true;
    try {
      const headers: Record<string, string> = activeProject?.id
        ? { 'x-project-id': String(activeProject.id) }
        : {};
      const res = await fetch('/api/repos', { headers });
      if (!res.ok) return;
      const data = await res.json();
      const repoList = data.repositories || [];
      setRepos(repoList);
      if (repoList.length > 0 && !pushRepoUrl) {
        setPushRepoUrl(repoList[0].url);
      }
    } catch { /* backend may be unavailable */ }
    finally { fetchingReposRef.current = false; }
  }, [pushRepoUrl, activeProject?.id]);

  useEffect(() => {
    fetchRepos();
  }, [fetchRepos]);

  // Clear selected knowledge when project changes
  useEffect(() => {
    setSelectedKnowledgeIds([]);
  }, [activeProject?.id]);

  // Check GitHub connection status on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/github/status');
        const data = await res.json();
        if (data.success && data.data) {
          setGhConnected(data.data.connected);
          if (data.data.user) {
            setGhUser(data.data.user);
          }
        } else {
          setGhConnected(false);
        }
      } catch {
        setGhConnected(false);
      }
    })();
  }, []);

  // Check application profile status when URL changes (debounced)
  useEffect(() => {
    const resolvedUrl = targetUrl || projectContext.appUrl;
    if (!resolvedUrl) {
      setProfileStatus(null);
      return;
    }
    setProfileChecking(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/intelligence/profiles/status?url=${encodeURIComponent(resolvedUrl)}`, {
          headers: { ...projectHeaders },
        });
        if (!res.ok) { setProfileStatus(null); setProfileChecking(false); return; }
        const data = await res.json();
        setProfileStatus(data.exists ? {
          exists: true,
          status: data.profile?.status,
          lastCrawledAt: data.profile?.last_crawled_at,
          pageCount: data.profile?.page_count,
        } : { exists: false });
      } catch {
        setProfileStatus(null);
      } finally {
        setProfileChecking(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [targetUrl, projectContext.appUrl]);

  // Fetch GitHub repos when PR modal opens
  const fetchGhRepos = useCallback(async () => {
    if (!ghConnected) return;
    setGhReposLoading(true);
    try {
      const res = await fetch('/api/github/repos?per_page=50&sort=pushed');
      const data = await res.json();
      if (data.success && data.data) {
        setGhRepos(data.data.map((r: any) => ({
          fullName: r.fullName,
          name: r.name,
          owner: r.owner,
          defaultBranch: r.defaultBranch,
          private: r.private,
        })));
      }
    } catch { /* silent */ }
    setGhReposLoading(false);
  }, [ghConnected]);

  // Create PR handler
  const handleCreatePR = async () => {
    if (!result?.data?.id || !selectedGhRepo) return;
    setCreatingPr(true);
    setPrResult(null);

    const [owner, repo] = selectedGhRepo.split('/');
    try {
      const res = await fetch('/api/github/create-pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoOwner: owner,
          repoName: repo,
          branchName: prBranch || `levelup/tests-${result.data.id}-${Date.now()}`,
          title: prTitle || `🧪 LevelUp: AI-Generated Test Scripts (#${result.data.id})`,
          body: [
            '## 🤖 AI-Generated Test Scripts',
            '',
            `**Target URL:** ${result.data.url}`,
            `**Files Generated:** ${result.data.filesGenerated}`,
            `**Generation Time:** ${(result.data.generationTimeMs / 1000).toFixed(1)}s`,
            '',
            '### Generated Files',
            ...(result.data.files?.map((f: any) => `- \`${f.path}\` (${f.type})`) || []),
            '',
            '---',
            '*Generated by [LevelUp AI QA](https://leveluptesting.in)*',
          ].join('\n'),
          scriptId: result.data.id,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setPrResult({
          success: true,
          prUrl: data.data.prUrl,
          prNumber: data.data.prNumber,
        });
      } else {
        setPrResult({ success: false, error: data.error || 'Failed to create PR' });
      }
    } catch {
      setPrResult({ success: false, error: 'Network error — backend may be unavailable' });
    }
    setCreatingPr(false);
  };



  // Load repo intelligence when repo selected
  useEffect(() => {
    if (!selectedRepoId) {
      setRepoContextLoaded(false);
      setRepoContextSummary(null);
      return;
    }
    (async () => {
      try {
        const repoHeaders: Record<string, string> = {};
        if (activeProject?.id) repoHeaders['x-project-id'] = String(activeProject.id);
        const res = await fetch(`/api/repo-intelligence/${encodeURIComponent(selectedRepoId)}`, { headers: repoHeaders });
        const data = await res.json();
        if (data.success && data.profile) {
          const p = data.profile;
          setRepoContextSummary({
            framework: p.framework,
            testPattern: p.testPattern,
            locatorStrategy: p.locatorStrategy,
            helpers: p.helperFunctions?.length || 0,
            pageObjects: p.pageObjects?.length || 0,
            flows: p.businessFlows?.length || 0,
          });
          setRepoContextLoaded(true);
        } else {
          setRepoContextLoaded(false);
          setRepoContextSummary(null);
        }
      } catch {
        setRepoContextLoaded(false);
        setRepoContextSummary(null);
      }
    })();
  }, [selectedRepoId]);

  const toggleTestType = (type: string) => {
    setTestTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleGenerate = async () => {
    if (!scenario.trim()) return;

    const resolvedUrl = targetUrl || projectContext.appUrl;
    if (!resolvedUrl) {
      setResult({
        success: false,
        error: 'Target URL is required. Please enter the application URL you want to test.',
      });
      return;
    }

    setGenerating(true);
    setResult(null);
    setPushResult(null);

    try {
      const res = await fetch('/api/scripts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...projectHeaders },
        body: JSON.stringify({
          projectContextId: projectContext.id,
          url: resolvedUrl,
          scenario: scenario.trim(),
          testTypes,
          includeNegativeTests: includeNegative,
          ...(forceFreshCrawl ? { forceFreshCrawl: true } : {}),
          ...(selectedRepoId ? { repoId: selectedRepoId } : {}),
          ...(selectedKnowledgeIds.length > 0 ? { knowledgeItemIds: selectedKnowledgeIds } : {}),
          ...(authEnabled && authUsername && authPassword ? {
            authConfig: {
              loginUrl: authLoginUrl || undefined,
              username: authUsername,
              password: authPassword,
            },
          } : {}),
        }),
      });

      const data = await res.json();
      setResult(data);

      if (data.success && data.data?.id) {
        // Auto-generate branch name from scenario
        const slugScenario = scenario.trim().toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 40);
        setPushBranch(`levelup/tests-${slugScenario}-${data.data.id}`);
        onGenerated();
      }
    } catch (err) {
      setResult({
        success: false,
        error: 'Network error — backend may be unavailable',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handlePushToGitHub = async () => {
    if (!result?.data?.id || !pushRepoUrl) return;
    setPushing(true);
    setPushResult(null);

    try {
      const res = await fetch(`/api/scripts/${result.data.id}/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...projectHeaders },
        body: JSON.stringify({
          repoUrl: pushRepoUrl,
          baseBranch: repos.find(r => r.url === pushRepoUrl)?.branch || 'main',
          branchName: pushBranch || undefined,
          createPullRequest: createPR,
        }),
      });

      const data = await res.json();
      setPushResult(data);
      if (data.success) {
        setShowPushDialog(false);
      }
    } catch (err) {
      setPushResult({
        success: false,
        error: 'Network error — backend may be unavailable',
      });
    } finally {
      setPushing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Generator Panel */}
      <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Generate Test Script</h2>
            <p className="text-xs text-slate-500">
              Describe what you want to test in plain English
            </p>
          </div>
        </div>

        {/* GitHub Connection Status Badge */}
        {ghConnected !== null && (
          <div className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs ${
            ghConnected
              ? 'bg-emerald-500/5 border border-emerald-500/20'
              : 'bg-amber-500/5 border border-amber-500/20'
          }`}>
            <div className="flex items-center gap-2">
              <span className={`inline-block w-2 h-2 rounded-full ${ghConnected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              {ghConnected && ghUser ? (
                <span className="text-slate-300">
                  GitHub connected as <span className="text-emerald-400 font-medium">@{ghUser.login}</span>
                </span>
              ) : (
                <span className="text-amber-400">
                  GitHub not connected — <a href="/tools" className="underline hover:text-amber-300">Connect in Tools</a> to enable PR creation
                </span>
              )}
            </div>
            {ghConnected && (
              <span className="text-emerald-400/60 flex items-center gap-1">
                <Github size={12} /> PR ready
              </span>
            )}
          </div>
        )}

        {/* Scenario Input */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Test Scenario</label>
            <textarea
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              placeholder={`Describe the test scenario in plain English, e.g.:\n\n\u2022 "Test login with valid credentials, verify dashboard loads, check employee count is visible"\n\u2022 "Add a new employee, fill all required fields, verify success message and employee appears in list"\n\u2022 "Try login with wrong password 3 times, verify account lockout message"`}
              rows={5}
              className="w-full px-3 py-2.5 rounded-lg bg-[#0c1222] border border-[#334155] text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 resize-none"
              disabled={generating}
            />
          </div>

          {/* Target URL - always visible since it's required */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              Target URL <span className="text-red-400">*</span>
            </label>
            <input
              type="url"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://your-app.com (e.g. https://opensource-demo.orangehrmlive.com)"
              className={`w-full px-3 py-2 rounded-lg bg-[#0c1222] border text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500 ${
                !targetUrl && !projectContext.appUrl
                  ? 'border-amber-500/40'
                  : 'border-[#334155]'
              }`}
              disabled={generating}
            />
            <p className="text-[10px] text-slate-600 mt-1">
              The application URL to generate tests against
              {projectContext.appUrl ? ` (defaults to ${projectContext.appUrl})` : ''}
            </p>

            {/* Application Intelligence Profile Badge */}
            {(profileStatus || profileChecking) && (
              <div className="mt-1.5 flex items-center gap-2">
                {profileChecking ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-500/10 border border-slate-500/20 text-[10px] text-slate-400">
                    <Loader2 size={10} className="animate-spin" /> Checking profile…
                  </span>
                ) : profileStatus?.exists && profileStatus.status === 'ready' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400">
                    <Database size={10} />
                    Profile cached — {profileStatus.pageCount || 0} pages
                    {profileStatus.lastCrawledAt && (
                      <span className="text-emerald-500/60 ml-1">
                        · crawled {new Date(profileStatus.lastCrawledAt).toLocaleDateString()}
                      </span>
                    )}
                    <span title="Fast path: ~1s generation"><Zap size={9} className="ml-0.5 inline" /></span>
                  </span>
                ) : profileStatus?.exists && profileStatus.status === 'expired' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-400">
                    <Database size={10} />
                    Profile expired — will re-crawl
                  </span>
                ) : !profileStatus?.exists ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-500/10 border border-slate-500/20 text-[10px] text-slate-500">
                    <Fingerprint size={10} />
                    New app — will create profile on first generation
                  </span>
                ) : null}
              </div>
            )}
          </div>

          {/* Advanced Options Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Advanced Options
          </button>

          {showAdvanced && (
            <div className="space-y-3 bg-[#0c1222] rounded-lg p-4 border border-[#1e293b]">
              <div>
                <label className="block text-xs text-slate-400 mb-2">Test Types</label>
                <div className="flex flex-wrap gap-2">
                  {TEST_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleTestType(opt.value)}
                      disabled={generating}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                        testTypes.includes(opt.value)
                          ? 'bg-violet-500/10 border-violet-500/30 text-violet-400'
                          : 'bg-[#1a1f2e] border-[#334155] text-slate-500 hover:text-slate-300'
                      }`}
                      title={opt.description}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeNegative}
                  onChange={(e) => setIncludeNegative(e.target.checked)}
                  disabled={generating}
                  className="w-3.5 h-3.5 rounded border-[#334155] bg-[#1a1f2e] text-violet-500 focus:ring-violet-500 focus:ring-offset-0"
                />
                <span className="text-xs text-slate-400">Include negative test cases</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={forceFreshCrawl}
                  onChange={(e) => setForceFreshCrawl(e.target.checked)}
                  disabled={generating}
                  className="w-3.5 h-3.5 rounded border-[#334155] bg-[#1a1f2e] text-violet-500 focus:ring-violet-500 focus:ring-offset-0"
                />
                <RefreshCw size={12} className="text-amber-400" />
                <span className="text-xs text-slate-400">Force fresh crawl</span>
                <span className="text-[10px] text-slate-600">(bypass cached profile)</span>
              </label>
            </div>
          )}

          {/* Authentication for Login-Protected Pages */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={authEnabled}
                onChange={(e) => setAuthEnabled(e.target.checked)}
                disabled={generating}
                className="w-3.5 h-3.5 rounded border-[#334155] bg-[#1a1f2e] text-violet-500 focus:ring-violet-500 focus:ring-offset-0"
              />
              <Shield size={14} className="text-amber-400" />
              <span className="text-xs font-medium text-slate-300">Authenticate before crawling</span>
              <span className="text-[10px] text-slate-500 ml-1">(login-protected pages)</span>
            </label>

            {authEnabled && (
              <div className="bg-[#0c1222] rounded-lg p-4 border border-amber-500/20 space-y-3">
                <div className="flex items-start gap-2 text-[10px] text-amber-400/80 bg-amber-500/5 rounded-md p-2 border border-amber-500/10">
                  <Lock size={12} className="mt-0.5 shrink-0" />
                  <span>Credentials are sent securely to the backend and never logged or stored. Only used for a single browser session during crawling.</span>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Login Page URL <span className="text-slate-600">(optional — auto-detects if blank)</span></label>
                  <input
                    type="url"
                    value={authLoginUrl}
                    onChange={(e) => setAuthLoginUrl(e.target.value)}
                    placeholder="https://app.example.com/login"
                    disabled={generating}
                    className="w-full px-3 py-2 rounded-lg bg-[#1a1f2e] border border-[#334155] text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Username / Email</label>
                    <input
                      type="text"
                      value={authUsername}
                      onChange={(e) => setAuthUsername(e.target.value)}
                      placeholder="admin@company.com"
                      disabled={generating}
                      autoComplete="off"
                      className="w-full px-3 py-2 rounded-lg bg-[#1a1f2e] border border-[#334155] text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Password</label>
                    <div className="relative">
                      <input
                        type={showAuthPassword ? 'text' : 'password'}
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder="••••••••"
                        disabled={generating}
                        autoComplete="off"
                        className="w-full px-3 py-2 pr-9 rounded-lg bg-[#1a1f2e] border border-[#334155] text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAuthPassword(!showAuthPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                        tabIndex={-1}
                      >
                        {showAuthPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>

                {authEnabled && (!authUsername || !authPassword) && (
                  <p className="text-[10px] text-amber-500/70 flex items-center gap-1">
                    <AlertTriangle size={10} />
                    Both username and password are required for authentication
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Repository Intelligence */}
          {repos.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Brain size={14} className="text-violet-400" />
                <span className="text-xs font-medium text-slate-300">Repository Intelligence</span>
                {repoContextLoaded && (
                  <span className="ml-auto flex items-center gap-1 text-[10px] text-emerald-400">
                    <CheckCircle2 size={10} /> Context loaded
                  </span>
                )}
              </div>
              <select
                value={selectedRepoId}
                onChange={(e) => setSelectedRepoId(e.target.value)}
                disabled={generating}
                className="w-full px-3 py-2 rounded-lg bg-[#1a1f2e] border border-[#334155] text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500 appearance-none"
              >
                <option value="">No repo context (generic generation)</option>
                {repos.map((r) => (
                  <option key={r.id} value={r.id}>{r.name} — {r.branch || 'main'}</option>
                ))}
              </select>
              {repoContextSummary && (
                <div className="bg-[#0c1222] rounded-lg p-3 border border-[#1e293b] space-y-2">
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-500">Framework</span>
                      <p className="text-violet-300 font-medium">{repoContextSummary.framework || '—'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Pattern</span>
                      <p className="text-blue-300 font-medium">{repoContextSummary.testPattern || '—'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Locators</span>
                      <p className="text-emerald-300 font-medium">{repoContextSummary.locatorStrategy || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-slate-500 pt-1 border-t border-[#1e293b]">
                    <span>{repoContextSummary.helpers || 0} helpers</span>
                    <span>{repoContextSummary.pageObjects || 0} page objects</span>
                    <span>{repoContextSummary.flows || 0} flows</span>
                  </div>
                  <p className="text-[10px] text-slate-600">
                    AI will use your repo&apos;s patterns, helpers &amp; page objects for contextual generation
                  </p>
                </div>
              )}
            </div>
          )}

          {/* App Knowledge Selector — always visible, handles its own loading/empty states */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen size={14} className="text-amber-400" />
              <span className="text-xs font-medium text-slate-300">App Knowledge</span>
              <span className="text-[10px] text-slate-500">(optional)</span>
              {selectedKnowledgeIds.length > 0 && (
                <span className="ml-auto text-[10px] text-amber-400">
                  {selectedKnowledgeIds.length} item{selectedKnowledgeIds.length !== 1 ? 's' : ''} selected
                </span>
              )}
            </div>
            <KnowledgeSelector
              selectedIds={selectedKnowledgeIds}
              onChange={setSelectedKnowledgeIds}
              contextTitle={scenario}
              contextDescription={targetUrl || projectContext.appUrl}
            />
            {selectedKnowledgeIds.length > 0 && (
              <p className="text-[10px] text-slate-600">
                Business rules, workflows &amp; bug patterns will be incorporated into generated scripts
              </p>
            )}
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={generating || !scenario.trim() || (!(targetUrl || projectContext.appUrl))}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-all shadow-lg shadow-violet-500/20"
          >
            {generating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generating scripts — this may take 30–60 seconds...
              </>
            ) : (
              <>
                <Play size={16} />
                Generate Test Scripts
              </>
            )}
          </button>
        </div>
      </div>

      {/* Generation Result */}
      {result && (
        <div className={`bg-[#1a1f2e] border rounded-xl overflow-hidden ${
          result.success ? 'border-emerald-500/20' : 'border-red-500/20'
        }`}>
          {/* Result Header */}
          <div className={`px-5 py-4 border-b ${
            result.success ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle2 size={18} className="text-emerald-400" />
                ) : (
                  <XCircle size={18} className="text-red-400" />
                )}
                <h3 className={`text-sm font-semibold ${
                  result.success ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {result.success ? 'Scripts Generated Successfully!' : 'Generation Failed'}
                </h3>
              </div>

              {/* GitHub action buttons */}
              {result.success && result.data && (
                <div className="flex items-center gap-2">
                  {ghConnected ? (
                    <button
                      onClick={() => {
                        setShowPrModal(true);
                        setPrResult(null);
                        setPrTitle(`🧪 LevelUp: AI-Generated Test Scripts (#${result.data!.id})`);
                        const slug = scenario.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
                        setPrBranch(`levelup/tests-${slug}-${result.data!.id}`);
                        fetchGhRepos();
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-medium transition-all"
                    >
                      <GitBranch size={14} />
                      Create PR
                    </button>
                  ) : (
                    <a
                      href="/tools"
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1e293b] border border-[#334155] text-amber-400 hover:text-amber-300 transition-colors text-xs font-medium"
                    >
                      <Github size={14} />
                      Connect GitHub
                    </a>
                  )}
                  <button
                    onClick={() => setShowPushDialog(!showPushDialog)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1e293b] border border-[#334155] text-slate-300 hover:text-white hover:bg-[#334155] transition-colors text-xs font-medium"
                  >
                    <Github size={14} />
                    Push via URL
                  </button>
                </div>
              )}
            </div>
            {result.error && (
              <p className="text-xs text-red-300/80 mt-1">{result.error}</p>
            )}
          </div>

          {/* Push to GitHub Dialog */}
          {showPushDialog && result.success && result.data && (
            <div className="px-5 py-4 bg-[#0c1222] border-b border-[#2a3040]">
              <div className="flex items-center gap-2 mb-3">
                <GitBranch size={14} className="text-violet-400" />
                <h4 className="text-sm font-semibold text-white">Push to GitHub Repository</h4>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Repository</label>
                  <select
                    value={pushRepoUrl}
                    onChange={(e) => setPushRepoUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#1a1f2e] border border-[#334155] text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-violet-500"
                    disabled={pushing}
                  >
                    {repos.length === 0 && <option value="">No repositories configured</option>}
                    {repos.map((repo) => (
                      <option key={repo.id} value={repo.url}>
                        {repo.name} ({repo.branch})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Branch Name</label>
                  <input
                    type="text"
                    value={pushBranch}
                    onChange={(e) => setPushBranch(e.target.value)}
                    placeholder="levelup/generated-tests"
                    className="w-full px-3 py-2 rounded-lg bg-[#1a1f2e] border border-[#334155] text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                    disabled={pushing}
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createPR}
                    onChange={(e) => setCreatePR(e.target.checked)}
                    disabled={pushing}
                    className="w-3.5 h-3.5 rounded border-[#334155] bg-[#1a1f2e] text-violet-500 focus:ring-violet-500 focus:ring-offset-0"
                  />
                  <span className="text-xs text-slate-400">Create a Pull Request automatically</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePushToGitHub}
                    disabled={pushing || !pushRepoUrl}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-all"
                  >
                    {pushing ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Pushing to GitHub...
                      </>
                    ) : (
                      <>
                        <Github size={14} />
                        Push & Create PR
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowPushDialog(false)}
                    className="px-4 py-2.5 text-sm text-slate-400 hover:text-white transition-colors"
                    disabled={pushing}
                  >
                    Cancel
                  </button>
                </div>

                {/* Push error */}
                {pushResult && !pushResult.success && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-xs text-red-400">
                    {pushResult.error}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PR Creation Modal */}
          {showPrModal && result?.success && result.data && (
            <div className="px-5 py-4 bg-[#0c1222] border-b border-[#2a3040]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <GitBranch size={14} className="text-emerald-400" />
                  <h4 className="text-sm font-semibold text-slate-200">Create Pull Request</h4>
                </div>
                <button
                  onClick={() => setShowPrModal(false)}
                  className="text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
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
                      onChange={e => setSelectedGhRepo(e.target.value)}
                      className="w-full px-3 py-2 bg-[#1a1f2e] border border-[#2a3040] rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
                    >
                      <option value="">Select a repository…</option>
                      {ghRepos.map(r => (
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
                    onChange={e => setPrBranch(e.target.value)}
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
                    onChange={e => setPrTitle(e.target.value)}
                    placeholder="🧪 LevelUp: AI-Generated Test Scripts"
                    className="w-full px-3 py-2 bg-[#1a1f2e] border border-[#2a3040] rounded-lg text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                {/* PR result messages */}
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

                {/* Submit button */}
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
          )}

          {/* Push Success Banner */}
          {pushResult?.success && pushResult.data && (
            <div className="px-5 py-4 bg-emerald-500/5 border-b border-emerald-500/20">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 size={16} className="text-emerald-400" />
                <h4 className="text-sm font-semibold text-emerald-400">Pushed to GitHub!</h4>
              </div>
              <div className="space-y-2">
                {pushResult.data.message ? (
                  <p className="text-xs text-slate-400">{pushResult.data.message}</p>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-xs">
                      <GitBranch size={12} className="text-slate-500" />
                      <span className="text-slate-400">Branch:</span>
                      <a
                        href={pushResult.data.branchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-violet-400 hover:text-violet-300 flex items-center gap-1"
                      >
                        {pushResult.data.branchName}
                        <ExternalLink size={10} />
                      </a>
                    </div>
                    {pushResult.data.pullRequest && (
                      <div className="flex items-center gap-2 text-xs">
                        <Github size={12} className="text-slate-500" />
                        <span className="text-slate-400">Pull Request:</span>
                        <a
                          href={pushResult.data.pullRequest.prUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                        >
                          PR #{pushResult.data.pullRequest.prNumber}
                          <ExternalLink size={10} />
                        </a>
                      </div>
                    )}
                    <p className="text-[10px] text-slate-600">
                      Commit: {pushResult.data.commitSha?.slice(0, 8)} · {pushResult.data.filesCount} files
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Result Stats */}
          {result.success && result.data && (
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard
                  icon={FileCode}
                  label="Files"
                  value={String(result.data.filesGenerated)}
                  color="text-violet-400"
                />
                <StatCard
                  icon={Zap}
                  label="Tests"
                  value={String(result.data.stats.totalTests)}
                  color="text-emerald-400"
                />
                <StatCard
                  icon={Clock}
                  label="Time"
                  value={`${(result.data.generationTimeMs / 1000).toFixed(1)}s`}
                  color="text-blue-400"
                />
                <StatCard
                  icon={Sparkles}
                  label="Tokens"
                  value={result.data.stats.tokensUsed.toLocaleString()}
                  color="text-amber-400"
                />
              </div>

              {/* Intelligence Info */}
              {result.data.intelligence && (
                <div className="bg-[#0c1222] rounded-lg p-3 flex items-center gap-3">
                  <Fingerprint size={14} className="text-violet-400 shrink-0" />
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
                    <span className={`font-medium ${
                      result.data.intelligence.crawlStrategy === 'FAST_PATH'
                        ? 'text-emerald-400'
                        : 'text-blue-400'
                    }`}>
                      {result.data.intelligence.crawlStrategy === 'FAST_PATH'
                        ? '⚡ Fast Path (cached)'
                        : '🔍 Full Crawl'}
                    </span>
                    {result.data.intelligence.crawlTimeMs != null && (
                      <span className="text-slate-500">
                        Crawl: {(result.data.intelligence.crawlTimeMs / 1000).toFixed(1)}s
                      </span>
                    )}
                    {result.data.intelligence.patternsDetected != null && result.data.intelligence.patternsDetected > 0 && (
                      <span className="text-slate-500">
                        {result.data.intelligence.patternsDetected} pattern{result.data.intelligence.patternsDetected !== 1 ? 's' : ''} detected
                      </span>
                    )}
                    <span className="text-slate-600">
                      Profile #{result.data.intelligence.profileId} cached for 30 days
                    </span>
                  </div>
                </div>
              )}

              {/* Validation Report */}
              {result.data.validationReport && (
                <div className="bg-[#0c1222] rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Reliability Score</p>
                    <span className={`text-sm font-bold ${
                      result.data.validationReport.overallScore >= 80
                        ? 'text-emerald-400'
                        : result.data.validationReport.overallScore >= 60
                          ? 'text-amber-400'
                          : 'text-red-400'
                    }`}>
                      {result.data.validationReport.overallScore}%
                    </span>
                  </div>
                  <div className="w-full bg-[#1e293b] rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        result.data.validationReport.overallScore >= 80
                          ? 'bg-emerald-400'
                          : result.data.validationReport.overallScore >= 60
                            ? 'bg-amber-400'
                            : 'bg-red-400'
                      }`}
                      style={{ width: `${result.data.validationReport.overallScore}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Generated Files */}
              {result.data.files && result.data.files.length > 0 && (
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Generated Files</p>
                  <div className="space-y-2">
                    {result.data.files.map((file) => (
                      <div key={file.path} className="bg-[#0c1222] rounded-lg border border-[#1e293b] px-3 py-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileCode size={12} className="text-violet-400" />
                          <span className="text-xs text-slate-300 font-mono">{file.path}</span>
                          <span className="text-[10px] text-slate-600">
                            {file.type} · {(file.size / 1024).toFixed(1)}KB
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Errors/Warnings */}
              {result.data.errors && result.data.errors.length > 0 && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle size={12} className="text-amber-400" />
                    <p className="text-[10px] text-amber-400 uppercase tracking-wider font-semibold">Warnings</p>
                  </div>
                  {result.data.errors.map((err, i) => (
                    <p key={i} className="text-xs text-amber-300/80 leading-relaxed">{err}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof FileCode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-[#0c1222] rounded-lg p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon size={10} className={color} />
        <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
      </div>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}
