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

  // GitHub push state
  const [showPushDialog, setShowPushDialog] = useState(false);
  const [repos, setRepos] = useState<Array<{ id: string; name: string; url: string; branch: string }>>([]);
  const [pushRepoUrl, setPushRepoUrl] = useState('');
  const [pushBranch, setPushBranch] = useState('');
  const [createPR, setCreatePR] = useState(true);
  const [pushing, setPushing] = useState(false);
  const [pushResult, setPushResult] = useState<PushResult | null>(null);

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

  const toggleTestType = (type: string) => {
    setTestTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleGenerate = async () => {
    if (!scenario.trim()) return;
    setGenerating(true);
    setResult(null);
    setPushResult(null);

    try {
      const res = await fetch('/api/scripts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectContextId: projectContext.id,
          url: targetUrl || projectContext.appUrl,
          scenario: scenario.trim(),
          testTypes,
          includeNegativeTests: includeNegative,
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
                <label className="block text-xs text-slate-400 mb-1.5">Target URL</label>
                <input
                  type="url"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder={projectContext.appUrl}
                  className="w-full px-3 py-2 rounded-lg bg-[#1a1f2e] border border-[#334155] text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  disabled={generating}
                />
                <p className="text-[10px] text-slate-600 mt-1">Override the project URL for this generation</p>
              </div>

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

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={generating || !scenario.trim()}
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
