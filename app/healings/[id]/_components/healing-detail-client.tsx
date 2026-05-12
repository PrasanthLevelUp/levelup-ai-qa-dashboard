'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, XCircle, Cpu, Brain, Sparkles, Shield, Eye, MousePointerClick, Code, FileSearch, Fingerprint, Lock, DollarSign } from 'lucide-react';

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
          <div className={`px-4 py-2 rounded-lg text-sm font-medium ${
            isSuccess ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            {isSuccess ? <span className="flex items-center gap-1"><CheckCircle2 size={16} /> Successfully Healed</span>
              : <span className="flex items-center gap-1"><XCircle size={16} /> Healing Failed</span>}
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
    </div>
  );
}
