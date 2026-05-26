'use client';

import { useState, useEffect, useCallback } from 'react';
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

interface KnowledgeItemBrief {
  id: number;
  title: string;
  category: string;
  priority: string;
  tags: string[];
  related_modules: string[];
}

const CATEGORY_ICONS: Record<string, string> = {
  workflow: '🔄',
  business_rule: '📋',
  bug_pattern: '🐛',
  integration: '🔗',
  automation: '🤖',
  architecture: '🏗️',
  dependency: '📦',
  manual_test: '✋',
  domain: '🏢',
};

const CATEGORY_COLORS: Record<string, string> = {
  workflow: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
  business_rule: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  bug_pattern: 'border-red-500/30 bg-red-500/10 text-red-400',
  integration: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400',
  automation: 'border-violet-500/30 bg-violet-500/10 text-violet-400',
  architecture: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  dependency: 'border-orange-500/30 bg-orange-500/10 text-orange-400',
  manual_test: 'border-slate-500/30 bg-slate-500/10 text-slate-400',
  domain: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400',
};

const TEST_TYPE_OPTIONS = [
  { value: 'smoke', label: 'Smoke Tests', description: 'Quick validation of critical paths' },
  { value: 'functional', label: 'Functional Tests', description: 'Detailed feature testing' },
  { value: 'authentication', label: 'Auth Tests', description: 'Login/logout/session flows' },
  { value: 'form_validation', label: 'Form Validation', description: 'Input validation & error states' },
  { value: 'navigation', label: 'Navigation Tests', description: 'Page routing & links' },
];

export function ScriptGenerator({ projectContext, onGenerated, prefillScenarios, onPrefillConsumed }: ScriptGeneratorProps) {
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

  // App Knowledge state
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItemBrief[]>([]);
  const [selectedKnowledgeIds, setSelectedKnowledgeIds] = useState<number[]>([]);
  const [showKnowledgeSelector, setShowKnowledgeSelector] = useState(false);
  const [knowledgeSearch, setKnowledgeSearch] = useState('');

  // Authentication state (for crawling behind login walls)
  const [authEnabled, setAuthEnabled] = useState(false);
  const [authLoginUrl, setAuthLoginUrl] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [showAuthPassword, setShowAuthPassword] = useState(false);

  // Auto-fill from CSV/Excel upload
  useEffect(() => {
    if (prefillScenarios && prefillScenarios.length > 0) {
      const combined = prefillScenarios.map((s, i) => `${i + 1}. ${s}`).join('\n\n');
      setScenario(combined);
      onPrefillConsumed?.();
    }
  }, [prefillScenarios, onPrefillConsumed]);

  // Fetch repos for the dropdown
  const fetchRepos = useCallback(async () => {
    try {
      const res = await fetch('/api/repos');
      if (!res.ok) return;
      const data = await res.json();
      const repoList = data.repositories || [];
      setRepos(repoList);
      if (repoList.length > 0 && !pushRepoUrl) {
        setPushRepoUrl(repoList[0].url);
      }
    } catch { /* backend may be unavailable */ }
  }, [pushRepoUrl]);

  useEffect(() => {
    fetchRepos();
  }, [fetchRepos]);

  // Fetch knowledge items for the selector
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/knowledge?status=active&limit=100');
        if (!res.ok) return;
        const data = await res.json();
        const items = (data.items || data || []).map((ki: any) => ({
          id: ki.id,
          title: ki.title,
          category: ki.category,
          priority: ki.priority,
          tags: ki.tags || [],
          related_modules: ki.related_modules || [],
        }));
        setKnowledgeItems(items);
      } catch { /* knowledge API may be unavailable */ }
    })();
  }, []);

  const toggleKnowledgeItem = (id: number) => {
    setSelectedKnowledgeIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const filteredKnowledgeItems = knowledgeItems.filter(ki => {
    if (!knowledgeSearch.trim()) return true;
    const q = knowledgeSearch.toLowerCase();
    return (
      ki.title.toLowerCase().includes(q) ||
      ki.category.toLowerCase().includes(q) ||
      ki.tags.some(t => t.toLowerCase().includes(q)) ||
      ki.related_modules.some(m => m.toLowerCase().includes(q))
    );
  });

  // Load repo intelligence when repo selected
  useEffect(() => {
    if (!selectedRepoId) {
      setRepoContextLoaded(false);
      setRepoContextSummary(null);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/repo-intelligence/${encodeURIComponent(selectedRepoId)}`);
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectContextId: projectContext.id,
          url: resolvedUrl,
          scenario: scenario.trim(),
          testTypes,
          includeNegativeTests: includeNegative,
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
        headers: { 'Content-Type': 'application/json' },
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

          {/* App Knowledge Selector */}
          {knowledgeItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <BookOpen size={14} className="text-amber-400" />
                <span className="text-xs font-medium text-slate-300">App Knowledge</span>
                {selectedKnowledgeIds.length > 0 && (
                  <span className="ml-auto text-[10px] text-amber-400">
                    {selectedKnowledgeIds.length} item{selectedKnowledgeIds.length !== 1 ? 's' : ''} selected
                  </span>
                )}
              </div>

              {/* Selected knowledge chips */}
              {selectedKnowledgeIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedKnowledgeIds.map(id => {
                    const item = knowledgeItems.find(ki => ki.id === id);
                    if (!item) return null;
                    const colors = CATEGORY_COLORS[item.category] || 'border-slate-500/30 bg-slate-500/10 text-slate-400';
                    return (
                      <span
                        key={id}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] ${colors}`}
                      >
                        <span>{CATEGORY_ICONS[item.category] || '📄'}</span>
                        <span className="truncate max-w-[160px]">{item.title}</span>
                        <button
                          type="button"
                          onClick={() => toggleKnowledgeItem(id)}
                          className="ml-0.5 hover:text-white transition-colors"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Add knowledge button / selector dropdown */}
              <button
                type="button"
                onClick={() => setShowKnowledgeSelector(!showKnowledgeSelector)}
                disabled={generating}
                className="w-full px-3 py-2 rounded-lg bg-[#1a1f2e] border border-[#334155] text-xs text-slate-400 hover:text-slate-300 hover:border-amber-500/30 transition-colors text-left flex items-center justify-between"
              >
                <span>
                  {selectedKnowledgeIds.length > 0
                    ? 'Add or remove knowledge items...'
                    : 'Select knowledge items to enhance generation...'}
                </span>
                {showKnowledgeSelector ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>

              {showKnowledgeSelector && (
                <div className="bg-[#0c1222] rounded-lg border border-[#1e293b] overflow-hidden">
                  {/* Search within knowledge items */}
                  <div className="p-2 border-b border-[#1e293b]">
                    <input
                      type="text"
                      value={knowledgeSearch}
                      onChange={(e) => setKnowledgeSearch(e.target.value)}
                      placeholder="Search knowledge items..."
                      className="w-full px-2.5 py-1.5 rounded bg-[#1a1f2e] border border-[#334155] text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                    />
                  </div>

                  {/* Knowledge items list */}
                  <div className="max-h-48 overflow-y-auto">
                    {filteredKnowledgeItems.length === 0 ? (
                      <p className="text-xs text-slate-600 p-3 text-center">No matching knowledge items</p>
                    ) : (
                      filteredKnowledgeItems.map(ki => {
                        const isSelected = selectedKnowledgeIds.includes(ki.id);
                        const colors = CATEGORY_COLORS[ki.category] || 'border-slate-500/30 bg-slate-500/10 text-slate-400';
                        return (
                          <button
                            key={ki.id}
                            type="button"
                            onClick={() => toggleKnowledgeItem(ki.id)}
                            className={`w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-[#1a1f2e] transition-colors border-b border-[#1e293b] last:border-b-0 ${
                              isSelected ? 'bg-amber-500/5' : ''
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                              className="w-3 h-3 rounded border-[#334155] bg-[#1a1f2e] text-amber-500 focus:ring-0 flex-shrink-0"
                            />
                            <span className="text-sm">{CATEGORY_ICONS[ki.category] || '📄'}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-slate-300 truncate">{ki.title}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`inline-block px-1.5 py-0 rounded text-[9px] border ${colors}`}>
                                  {ki.category.replace('_', ' ')}
                                </span>
                                {ki.priority === 'critical' && (
                                  <span className="text-[9px] text-red-400 font-medium">CRITICAL</span>
                                )}
                                {ki.priority === 'high' && (
                                  <span className="text-[9px] text-amber-400 font-medium">HIGH</span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>

                  {/* Footer with count */}
                  <div className="px-3 py-1.5 border-t border-[#1e293b] bg-[#0a0f1a] flex items-center justify-between">
                    <span className="text-[10px] text-slate-600">
                      {filteredKnowledgeItems.length} item{filteredKnowledgeItems.length !== 1 ? 's' : ''}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      AI will smart-select the most relevant items
                    </span>
                  </div>
                </div>
              )}

              {selectedKnowledgeIds.length > 0 && (
                <p className="text-[10px] text-slate-600">
                  Business rules, workflows &amp; bug patterns will be incorporated into generated scripts
                </p>
              )}
            </div>
          )}

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

              {/* Save to GitHub button */}
              {result.success && result.data && (
                <button
                  onClick={() => setShowPushDialog(!showPushDialog)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1e293b] border border-[#334155] text-slate-300 hover:text-white hover:bg-[#334155] transition-colors text-xs font-medium"
                >
                  <Github size={14} />
                  Save to GitHub
                </button>
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
