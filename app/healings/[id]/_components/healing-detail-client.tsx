'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, CheckCircle2, XCircle, Cpu, Brain, Sparkles, Shield, Eye,
  MousePointerClick, Code, FileSearch, Fingerprint, Lock, DollarSign,
  GitBranch, Github, ExternalLink, Rocket, Loader2, ArrowRight,
} from 'lucide-react';
import { useProject } from '@/lib/project-context';

interface HealingDetail {
  id: number;
  testName: string;
  repository: string;
  status: string;
  strategy: string;
  timestamp: string;
  failedLocator: string;
  healedLocator: string;
  confidence: number;
  validationChecks: Record<string, { passed: boolean; score: number }>;
  codeChanges: { before: string; after: string | null };
  validationReason: string;
  tokensUsed: number;
  cost: number;
  durationMs: number;
}

const STRATEGY_INFO: Record<string, { label: string; description: string; icon: any; color: string }> = {
  rule_based: { label: 'Rule Engine (Level 1)', description: 'Deterministic transformation - zero AI cost', icon: Cpu, color: 'emerald' },
  pattern_match: { label: 'Pattern Engine (Level 2)', description: 'Learned from previous healings', icon: Brain, color: 'blue' },
  ai: { label: 'AI Engine (Level 3)', description: 'OpenAI-powered intelligent healing', icon: Sparkles, color: 'amber' },
};

const VALIDATION_LABELS: Record<string, { label: string; icon: any }> = {
  syntax: { label: 'Syntax Valid', icon: Code },
  semantic: { label: 'Semantic Match', icon: FileSearch },
  exists: { label: 'Element Exists', icon: Eye },
  unique: { label: 'Unique Selector', icon: Fingerprint },
  visible: { label: 'Visible on Page', icon: Eye },
  interactable: { label: 'Interactable', icon: MousePointerClick },
  security: { label: 'Security Safe', icon: Lock },
};

export function HealingDetailClient({ id }: { id: string }) {
  const [detail, setDetail] = useState<HealingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPRModal, setShowPRModal] = useState(false);

  useEffect(() => {
    fetch(`/api/healings/${id}`)
      .then((r: any) => {
        if (!r?.ok) throw new Error('Not found');
        return r?.json?.();
      })
      .then((data: any) => setDetail(data ?? null))
      .catch((err: any) => setError(err?.message ?? 'Failed to load'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400 mb-4">Healing attempt not found</p>
        <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm">← Back to Dashboard</Link>
      </div>
    );
  }

  const isSuccess = detail?.status === 'healed';
  const stratInfo = STRATEGY_INFO[detail?.strategy ?? ''] ?? STRATEGY_INFO.rule_based;
  const StratIcon = stratInfo?.icon ?? Cpu;
  const confidence = (detail?.confidence ?? 0) * 100;
  const checks = detail?.validationChecks ?? {};

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back */}
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      {/* PR Modal */}
      {showPRModal && detail && (
        <HealingPRModal
          healingId={detail.id}
          testName={detail.testName}
          failedLocator={detail.failedLocator}
          healedLocator={detail.healedLocator}
          strategy={detail.strategy}
          confidence={detail.confidence}
          onClose={() => setShowPRModal(false)}
        />
      )}

      {/* Header */}
      <div className="rounded-xl border border-[#1e293b] bg-[#1e293b]/30 p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-bold text-white font-display tracking-tight flex items-center gap-2">
              🔍 Healing Attempt #{detail?.id ?? 0}
            </h1>
            <p className="text-sm text-slate-400 mt-1">{detail?.testName ?? ''}</p>
            <p className="text-xs text-slate-500 mt-1">{detail?.repository ?? ''}</p>
          </div>
          <div className="flex items-center gap-3">
            {isSuccess && (
              <button
                onClick={() => setShowPRModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-medium rounded-lg transition-all shadow-lg shadow-emerald-900/30"
              >
                <Rocket size={16} />
                Apply & Create PR
              </button>
            )}
            <div className={`px-4 py-2 rounded-lg text-sm font-medium ${
              isSuccess ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {isSuccess ? <span className="flex items-center gap-1"><CheckCircle2 size={16} /> Successfully Healed</span>
                : <span className="flex items-center gap-1"><XCircle size={16} /> Healing Failed</span>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div>
            <span className="text-xs text-slate-500">Strategy</span>
            <div className={`flex items-center gap-1 mt-1 text-sm text-${stratInfo?.color ?? 'emerald'}-400`}>
              <StratIcon size={14} /> {stratInfo?.label ?? 'Unknown'}
            </div>
          </div>
          <div>
            <span className="text-xs text-slate-500">Confidence</span>
            <div className="text-sm font-mono text-white mt-1">{confidence?.toFixed?.(0) ?? '0'}%</div>
          </div>
          <div>
            <span className="text-xs text-slate-500">Timestamp</span>
            <div className="text-sm text-white mt-1 font-mono">
              {detail?.timestamp ? new Date(detail.timestamp).toLocaleString() : ''}
            </div>
          </div>
          <div>
            <span className="text-xs text-slate-500">Duration</span>
            <div className="text-sm text-white mt-1 font-mono">{((detail?.durationMs ?? 0) / 1000)?.toFixed?.(1) ?? '0'}s</div>
          </div>
        </div>
      </div>

      {/* Confidence Breakdown */}
      <div className="rounded-xl border border-[#1e293b] bg-[#1e293b]/30 p-6">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Shield size={16} className="text-emerald-400" /> Confidence Score Breakdown ({confidence?.toFixed?.(0) ?? '0'}%)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(checks).map(([key, check]: [string, any]) => {
            const info = VALIDATION_LABELS[key] ?? { label: key, icon: CheckCircle2 };
            const Icon = info.icon;
            const score = check?.score ?? 0;
            return (
              <div key={key} className="flex items-center gap-3 p-3 rounded-lg bg-[#0f172a]/50">
                <div className={`p-1.5 rounded ${
                  check?.passed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                }`}>
                  <Icon size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">{info?.label ?? key}</span>
                    <span className={`text-xs font-mono font-semibold ${
                      score >= 90 ? 'text-emerald-400' : score >= 70 ? 'text-amber-400' : 'text-red-400'
                    }`}>{score}%</span>
                  </div>
                  <div className="h-1.5 bg-[#1e293b] rounded-full mt-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        score >= 90 ? 'bg-emerald-500' : score >= 70 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Code Changes */}
      <div className="rounded-xl border border-[#1e293b] bg-[#1e293b]/30 p-6">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          🔄 Code Changes (Before → After)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="text-xs text-red-400 font-medium mb-2 block">BEFORE (Broken)</span>
            <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
              <code className="text-sm font-mono text-red-300 break-all">
                {detail?.codeChanges?.before ?? ''}
              </code>
            </div>
          </div>
          <div>
            <span className="text-xs text-emerald-400 font-medium mb-2 block">AFTER (Healed)</span>
            <div className={`${
              detail?.codeChanges?.after
                ? 'bg-emerald-500/5 border border-emerald-500/20'
                : 'bg-slate-500/5 border border-slate-500/20'
            } rounded-lg p-4`}>
              <code className={`text-sm font-mono break-all ${
                detail?.codeChanges?.after ? 'text-emerald-300' : 'text-slate-500'
              }`}>
                {detail?.codeChanges?.after ?? 'No fix generated'}
              </code>
            </div>
          </div>
        </div>
        {detail?.validationReason && (
          <div className="mt-4 p-3 rounded-lg bg-[#0f172a]/50">
            <span className="text-xs text-slate-500">Validation:</span>
            <p className="text-sm text-slate-300 mt-1">{detail.validationReason}</p>
          </div>
        )}
      </div>

      {/* Cost Impact */}
      <div className="rounded-xl border border-[#1e293b] bg-[#1e293b]/30 p-6">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <DollarSign size={16} className="text-emerald-400" /> Cost Impact
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-[#0f172a]/50">
            <span className="text-xs text-slate-500">Tokens Used</span>
            <p className="text-xl font-bold font-mono text-white mt-1">{detail?.tokensUsed ?? 0}</p>
            <p className="text-xs text-slate-500 mt-1">
              {(detail?.tokensUsed ?? 0) === 0 ? 'Deterministic - Free' : 'OpenAI API'}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-[#0f172a]/50">
            <span className="text-xs text-slate-500">Cost</span>
            <p className="text-xl font-bold font-mono text-emerald-400 mt-1">${detail?.cost?.toFixed?.(4) ?? '0.0000'}</p>
          </div>
          <div className="p-4 rounded-lg bg-[#0f172a]/50">
            <span className="text-xs text-slate-500">Strategy</span>
            <p className="text-sm font-medium text-white mt-1">{stratInfo?.description ?? ''}</p>
          </div>
        </div>
      </div>

      {/* CTA Banner for successful healings */}
      {isSuccess && (
        <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/5 to-teal-500/5 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl">
              <GitBranch size={24} className="text-emerald-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-white">Ready to apply this fix?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Create a Pull Request with the healed selector automatically committed to your repository.
              </p>
            </div>
            <button
              onClick={() => setShowPRModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-medium rounded-lg transition-all shadow-lg shadow-emerald-900/30"
            >
              <Rocket size={16} />
              Apply & Create PR
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Healing PR Modal                                                   */
/* ------------------------------------------------------------------ */

type PRModalStep = 'configure' | 'creating' | 'success' | 'error';

function HealingPRModal({
  healingId,
  testName,
  failedLocator,
  healedLocator,
  strategy,
  confidence,
  onClose,
}: {
  healingId: number;
  testName: string;
  failedLocator: string;
  healedLocator: string;
  strategy: string;
  confidence: number;
  onClose: () => void;
}) {
  const { activeProject } = useProject();
  const [step, setStep] = useState<PRModalStep>('configure');
  const [repos, setRepos] = useState<any[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string>('');
  const [testFilePath, setTestFilePath] = useState<string>('');
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  // Fetch repositories
  useEffect(() => {
    (async () => {
      try {
        if (!activeProject?.id) {
          setLoadingRepos(false);
          return;
        }
        const res = await fetch(`/api/projects/${activeProject.id}/repositories`);
        if (res.ok) {
          const data = await res.json();
          const repoList = Array.isArray(data) ? data : (data.repositories || []);
          setRepos(repoList);
          if (repoList.length === 1) setSelectedRepoId(String(repoList[0].id));
        }
      } catch { /* ignore */ }
      setLoadingRepos(false);
    })();
  }, [activeProject?.id]);

  const handleCreatePR = async () => {
    if (!selectedRepoId) {
      setError('Please select a repository');
      return;
    }

    setStep('creating');
    setError('');

    try {
      const res = await fetch(`/api/healings/${healingId}/create-pr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repositoryId: parseInt(selectedRepoId, 10),
          projectId: activeProject?.id,
          testFilePath: testFilePath || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.details || 'Failed to create PR');
      }

      setResult(data.data || data);
      setStep('success');
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      setStep('error');
    }
  };

  const confidencePct = Math.round(confidence * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-700/50 bg-slate-800/50">
          <div className="p-2 bg-emerald-500/20 rounded-lg">
            <GitBranch size={20} className="text-emerald-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-white">Apply Healing & Create PR</h3>
            <p className="text-xs text-slate-400">Auto-commit fix to GitHub repository</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-700/50 rounded-lg">
            <XCircle size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">

          {/* ── Configure ── */}
          {step === 'configure' && (
            <div className="space-y-4">
              {/* Fix Preview */}
              <div className="bg-slate-800/50 rounded-lg border border-slate-700/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">Test</span>
                  <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">{strategy}</span>
                </div>
                <p className="text-sm text-white font-medium">{testName}</p>

                {/* Selector diff */}
                <div className="space-y-2 pt-2 border-t border-slate-700/30">
                  <div className="flex items-start gap-2">
                    <span className="text-red-400 text-xs font-bold mt-0.5 shrink-0">−</span>
                    <code className="text-xs text-red-300 font-mono break-all bg-red-500/5 px-2 py-1 rounded flex-1">
                      {failedLocator}
                    </code>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-400 text-xs font-bold mt-0.5 shrink-0">+</span>
                    <code className="text-xs text-emerald-300 font-mono break-all bg-emerald-500/5 px-2 py-1 rounded flex-1">
                      {healedLocator}
                    </code>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>Confidence: <span className={`font-medium ${confidencePct >= 80 ? 'text-emerald-400' : confidencePct >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{confidencePct}%</span></span>
                </div>
              </div>

              {/* Repository Selector */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Target Repository *</label>
                {loadingRepos ? (
                  <div className="flex items-center gap-2 text-slate-500 text-sm py-2"><Loader2 size={16} className="animate-spin" /> Loading repos...</div>
                ) : repos.length === 0 ? (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                    <p className="text-xs text-amber-300">No repositories found. Add a repository to your project first.</p>
                    <a href="/projects" className="text-xs text-amber-400 underline mt-1 inline-block">Go to Projects →</a>
                  </div>
                ) : (
                  <select
                    value={selectedRepoId}
                    onChange={e => setSelectedRepoId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none"
                  >
                    <option value="">Select a repository...</option>
                    {repos.map((r: any) => (
                      <option key={r.id} value={String(r.id)}>
                        {r.name} {r.branch ? `(${r.branch})` : ''} — {r.url?.replace('https://github.com/', '')}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Test File Path (optional) */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Test File Path <span className="text-slate-600">(optional — auto-detected)</span>
                </label>
                <input
                  type="text"
                  value={testFilePath}
                  onChange={e => setTestFilePath(e.target.value)}
                  placeholder="e.g. tests/login.spec.ts"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none font-mono"
                />
              </div>

              {/* Pipeline Preview */}
              <div className="flex items-center gap-2 justify-center py-2 text-xs text-slate-500">
                <span className="bg-red-500/20 text-red-300 px-2 py-0.5 rounded">Broken Test</span>
                <ArrowRight size={12} />
                <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">AI Fix</span>
                <ArrowRight size={12} />
                <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">GitHub PR</span>
              </div>

              {error && <p className="text-xs text-red-400">{error}</p>}
            </div>
          )}

          {/* ── Creating ── */}
          {step === 'creating' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Loader2 size={32} className="text-emerald-400 animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-white">Applying healing fix & creating PR...</p>
                <p className="text-xs text-slate-400 mt-1">Cloning repo → Patching file → Committing → Creating PR</p>
              </div>
              <div className="space-y-1.5 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  <span>Healing fix validated</span>
                </div>
                <div className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-emerald-400" />
                  <span>Applying to repository...</span>
                </div>
              </div>
            </div>
          )}

          {/* ── Success ── */}
          {step === 'success' && result && (
            <div className="space-y-4">
              <div className="flex flex-col items-center py-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-3">
                  <CheckCircle2 size={32} className="text-emerald-400" />
                </div>
                <h4 className="text-lg font-semibold text-white">
                  {result.patched ? '✅ Healing PR Created!' : '📋 Suggestion PR Created'}
                </h4>
                <p className="text-xs text-slate-400 mt-1 text-center max-w-sm">
                  {result.patched
                    ? 'The broken selector has been automatically replaced and a PR has been created.'
                    : 'A suggestion PR with the healing report has been created for manual review.'}
                </p>
              </div>

              {/* PR Link — the magic moment */}
              {result.github?.prUrl && (
                <a
                  href={result.github.prUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 bg-slate-800/80 border border-emerald-500/30 hover:border-emerald-500/60 rounded-xl p-4 transition-all group"
                >
                  <div className="p-2.5 bg-emerald-500/10 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
                    <Github size={22} className="text-emerald-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">
                      {result.patched ? '🤖 Auto-Heal:' : '📋 Healing Suggestion:'} {result.testName}
                    </p>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      PR #{result.github.prNumber} • {result.github.branchName}
                    </p>
                  </div>
                  <ExternalLink size={16} className="text-slate-500 group-hover:text-emerald-400" />
                </a>
              )}

              {/* Details */}
              <div className="bg-slate-800/50 rounded-lg border border-slate-700/30 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Patch Status</span>
                  <span className={`font-medium ${result.patched ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {result.patched ? '✅ Auto-patched' : '📋 Manual fix needed'}
                  </span>
                </div>
                {result.patchDescription && (
                  <p className="text-xs text-slate-400">{result.patchDescription}</p>
                )}
                {result.files && (
                  <div className="pt-2 border-t border-slate-700/30">
                    <span className="text-xs text-slate-500 block mb-1">Files changed:</span>
                    {result.files.map((f: string, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-slate-300 font-mono">
                        <Code size={12} className="text-emerald-400" /> {f}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Error ── */}
          {step === 'error' && (
            <div className="flex flex-col items-center py-6 space-y-4">
              <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center">
                <XCircle size={32} className="text-red-400" />
              </div>
              <div className="text-center">
                <h4 className="text-base font-semibold text-white">PR Creation Failed</h4>
                <p className="text-xs text-red-300 mt-2 max-w-sm">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-700/50 bg-slate-800/30 flex items-center justify-end gap-3">
          {step === 'configure' && (
            <>
              <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
                Cancel
              </button>
              <button
                onClick={handleCreatePR}
                disabled={!selectedRepoId || repos.length === 0}
                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-all"
              >
                <Rocket size={16} />
                Apply & Create PR
              </button>
            </>
          )}
          {step === 'creating' && (
            <p className="text-xs text-slate-500">Applying fix...</p>
          )}
          {(step === 'success' || step === 'error') && (
            <button onClick={onClose} className="px-5 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-all">
              Close
            </button>
          )}
          {step === 'error' && (
            <button
              onClick={() => { setStep('configure'); setError(''); }}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-all"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
