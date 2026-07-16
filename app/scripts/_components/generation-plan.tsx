'use client';

/**
 * Generation Plan — the signature pre-generation screen.
 *
 * When a customer clicks "Generate Script", LevelUp does NOT immediately start
 * generating. Instead it analyzes the repository and presents a PLAN: what it
 * found, what it decided, the existing automation it will reuse, the missing
 * flows it will generate, and the estimated token savings. The customer then
 * approves the plan with "Execute Generation Plan".
 *
 * This component is presentation-only. It renders the render-ready view the
 * backend's /api/scripts/plan endpoint returns (the frozen Requirement
 * Intelligence contract, already shaped for display). It never decides anything.
 */

import { useEffect, useRef, useState } from 'react';
import {
  Loader2,
  CheckCircle2,
  Sparkles,
  Cpu,
  Database,
  GitBranch,
  Zap,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  FileCode,
  X,
} from 'lucide-react';

/* ── Contract (mirror of backend GenerationPlanView) ─────────────────────── */

export type GenerationDecision = 'skip' | 'extend' | 'generate';

export interface GenerationPlanFlow {
  flow: string;
  assets: string[];
}

export interface GenerationPlanComparisonSide {
  scripts: number;
  estimatedTokens: number;
}

export interface GenerationPlanView {
  decision: GenerationDecision;
  repositoryCoverage: number;
  confidence: number;
  estimatedTokenSavings: number;
  savingsPercent: number;
  existingAutomation: GenerationPlanFlow[];
  toGenerate: GenerationPlanFlow[];
  assetsReused: string[];
  comparison: {
    withoutIntelligence: GenerationPlanComparisonSide;
    withIntelligence: GenerationPlanComparisonSide;
    reductionPercent: number;
  };
  generatedBecause: string[];
  decisionNarrative: string;
  hasCoverageModel: boolean;
}

/* ── Decision styling ─────────────────────────────────────────────────────── */

function decisionMeta(decision: GenerationDecision) {
  switch (decision) {
    case 'skip':
      return {
        label: 'SKIP',
        text: 'text-emerald-300',
        bg: 'bg-emerald-500/10',
        ring: 'ring-emerald-500/30',
        dot: 'bg-emerald-400',
      };
    case 'extend':
      return {
        label: 'EXTEND',
        text: 'text-violet-300',
        bg: 'bg-violet-500/10',
        ring: 'ring-violet-500/30',
        dot: 'bg-violet-400',
      };
    case 'generate':
    default:
      return {
        label: 'GENERATE',
        text: 'text-amber-300',
        bg: 'bg-amber-500/10',
        ring: 'ring-amber-500/30',
        dot: 'bg-amber-400',
      };
  }
}

/* ── Analyzing sequence ───────────────────────────────────────────────────── */

const ANALYZE_STAGES = [
  { label: 'Analyzing Repository', icon: Database },
  { label: 'Finding Existing Automation', icon: GitBranch },
  { label: 'Evaluating Coverage', icon: Cpu },
  { label: 'Preparing Generation Plan', icon: Sparkles },
];

function AnalyzingSequence() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      setActive((i) => Math.min(i + 1, ANALYZE_STAGES.length - 1));
    }, 550);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-6">
      <div className="flex items-center gap-2 mb-5">
        <Loader2 size={16} className="text-violet-400 animate-spin" />
        <h3 className="text-sm font-semibold text-white">Building Generation Plan</h3>
      </div>
      <div className="space-y-3">
        {ANALYZE_STAGES.map((stage, i) => {
          const Icon = stage.icon;
          const done = i < active;
          const current = i === active;
          return (
            <div key={stage.label} className="flex items-center gap-3">
              <div
                className={`flex items-center justify-center w-7 h-7 rounded-lg transition-all ${
                  done
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : current
                      ? 'bg-violet-500/15 text-violet-300'
                      : 'bg-[#232838] text-slate-600'
                }`}
              >
                {done ? (
                  <CheckCircle2 size={15} />
                ) : current ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Icon size={14} />
                )}
              </div>
              <span
                className={`text-xs transition-colors ${
                  done ? 'text-slate-400' : current ? 'text-white font-medium' : 'text-slate-600'
                }`}
              >
                {stage.label}
                {(done || current) ? '…' : ''}
              </span>
              {/* progress bar */}
              <div className="flex-1 h-px bg-[#2a3040] ml-1 overflow-hidden rounded-full">
                <div
                  className={`h-full bg-gradient-to-r from-violet-500/60 to-emerald-500/60 transition-all duration-500 ${
                    done ? 'w-full' : current ? 'w-1/2' : 'w-0'
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Metric tile ──────────────────────────────────────────────────────────── */

function Metric({
  label,
  value,
  accent = 'text-white',
  sub,
}: {
  label: string;
  value: string;
  accent?: string;
  sub?: string;
}) {
  return (
    <div className="bg-[#151a26] border border-[#2a3040] rounded-lg px-4 py-3">
      <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">{label}</p>
      <p className={`text-lg font-semibold leading-none ${accent}`}>{value}</p>
      {sub ? <p className="text-[10px] text-slate-500 mt-1">{sub}</p> : null}
    </div>
  );
}

/* ── Covered flow row (expandable to show reused assets) ──────────────────── */

function CoveredFlowRow({ item }: { item: GenerationPlanFlow }) {
  const [open, setOpen] = useState(false);
  const hasAssets = item.assets.length > 0;
  return (
    <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/[0.04] overflow-hidden">
      <button
        type="button"
        onClick={() => hasAssets && setOpen((v) => !v)}
        className={`w-full flex items-center gap-2 px-3 py-2 text-left ${
          hasAssets ? 'hover:bg-emerald-500/[0.07]' : 'cursor-default'
        }`}
      >
        <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
        <span className="text-xs text-slate-200 flex-1">{item.flow}</span>
        {hasAssets ? (
          <>
            <span className="text-[10px] text-slate-500">{item.assets.length} asset{item.assets.length !== 1 ? 's' : ''}</span>
            {open ? (
              <ChevronDown size={13} className="text-slate-500" />
            ) : (
              <ChevronRight size={13} className="text-slate-500" />
            )}
          </>
        ) : null}
      </button>
      {open && hasAssets ? (
        <div className="px-3 pb-2 pl-9 space-y-1">
          {item.assets.map((a) => (
            <div key={a} className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <FileCode size={11} className="text-slate-500" />
              <code className="font-mono">{a}</code>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ── Main panel ───────────────────────────────────────────────────────────── */

export function GenerationPlanPanel({
  plan,
  analyzing,
  executing,
  error,
  onExecute,
  onCancel,
}: {
  plan: GenerationPlanView | null;
  analyzing: boolean;
  executing: boolean;
  error?: string | null;
  onExecute: () => void;
  onCancel: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if ((plan || analyzing) && panelRef.current) {
      panelRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [plan, analyzing]);

  if (analyzing) {
    return (
      <div ref={panelRef} className="scroll-mt-4">
        <AnalyzingSequence />
      </div>
    );
  }

  if (error) {
    return (
      <div ref={panelRef} className="scroll-mt-4 bg-[#1a1f2e] border border-red-500/20 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-red-300">Could not build a Generation Plan: {error}</p>
          <button onClick={onCancel} className="text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  if (!plan) return null;

  const meta = decisionMeta(plan.decision);
  const isSkip = plan.decision === 'skip';
  const comp = plan.comparison;

  return (
    <div ref={panelRef} className="scroll-mt-4 bg-[#1a1f2e] border border-[#2a3040] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#2a3040] bg-gradient-to-r from-violet-500/[0.07] to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-500/15">
              <Sparkles size={16} className="text-violet-300" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white leading-none">Generation Plan</h3>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                <CheckCircle2 size={11} className="text-emerald-400" />
                Repository analyzed successfully
              </p>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md ring-1 text-[11px] font-semibold ${meta.bg} ${meta.text} ${meta.ring}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
            {meta.label}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <Metric
            label="Repository Coverage"
            value={`${plan.repositoryCoverage}%`}
            accent="text-white"
          />
          <Metric label="Decision" value={meta.label} accent={meta.text} />
          <Metric label="Confidence" value={`${plan.confidence}%`} accent="text-white" />
          <Metric
            label="Est. Token Savings"
            value={plan.estimatedTokenSavings.toLocaleString()}
            accent="text-emerald-300"
            sub={plan.savingsPercent > 0 ? `${plan.savingsPercent}% saved` : 'estimated'}
          />
        </div>

        {/* Existing Automation */}
        {plan.existingAutomation.length > 0 ? (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Existing Automation
              </p>
              <span className="text-[10px] text-slate-500">({plan.existingAutomation.length})</span>
            </div>
            <div className="space-y-1.5">
              {plan.existingAutomation.map((item) => (
                <CoveredFlowRow key={item.flow} item={item} />
              ))}
            </div>
          </div>
        ) : null}

        {/* Automation to Generate */}
        {plan.toGenerate.length > 0 ? (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Automation to Generate
              </p>
              <span className="text-[10px] text-slate-500">({plan.toGenerate.length})</span>
            </div>
            <div className="space-y-1.5">
              {plan.toGenerate.map((item) => (
                <div
                  key={item.flow}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-500/15 bg-amber-500/[0.04]"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span className="text-xs text-slate-200">{item.flow}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Repository Assets Reused */}
        {plan.assetsReused.length > 0 ? (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Repository Assets Reused
            </p>
            <div className="flex flex-wrap gap-1.5">
              {plan.assetsReused.map((a) => (
                <span
                  key={a}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#151a26] border border-[#2a3040] text-[11px] text-slate-300"
                >
                  <CheckCircle2 size={11} className="text-emerald-400" />
                  <code className="font-mono">{a}</code>
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {/* Decision narrative */}
        <div className="rounded-lg border border-[#2a3040] bg-[#151a26] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Decision
          </p>
          <p className="text-xs text-slate-300 leading-relaxed">{plan.decisionNarrative}</p>
          {plan.generatedBecause.length > 0 ? (
            <p className="text-[10px] text-slate-500 mt-2">
              Policy note: {plan.generatedBecause.join(' · ')}
            </p>
          ) : null}
        </div>

        {/* Savings comparison */}
        {comp.withoutIntelligence.estimatedTokens > 0 &&
        comp.reductionPercent > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-center">
            <div className="rounded-lg border border-[#2a3040] bg-[#151a26] px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">
                Without Intelligence
              </p>
              <p className="text-sm text-slate-300">
                Generate <span className="font-semibold text-white">{comp.withoutIntelligence.scripts}</span>{' '}
                script{comp.withoutIntelligence.scripts !== 1 ? 's' : ''}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                ~{comp.withoutIntelligence.estimatedTokens.toLocaleString()} tokens
              </p>
            </div>
            <div className="flex sm:flex-col items-center justify-center gap-1 text-emerald-400">
              <ArrowRight size={16} />
              <span className="text-xs font-semibold">{comp.reductionPercent}% ↓</span>
            </div>
            <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/[0.06] px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-emerald-400/80 mb-2">
                LevelUp Intelligence
              </p>
              <p className="text-sm text-slate-200">
                Generate <span className="font-semibold text-white">{comp.withIntelligence.scripts}</span>{' '}
                script{comp.withIntelligence.scripts !== 1 ? 's' : ''}
              </p>
              <p className="text-[11px] text-emerald-300/80 mt-0.5">
                ~{comp.withIntelligence.estimatedTokens.toLocaleString()} tokens
              </p>
            </div>
          </div>
        ) : null}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={onCancel}
            disabled={executing}
            className="px-4 py-2.5 rounded-xl border border-[#2a3040] text-slate-300 text-sm hover:bg-[#232838] disabled:opacity-50 transition-colors"
          >
            Back
          </button>
          <button
            onClick={onExecute}
            disabled={executing || isSkip}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-all shadow-lg shadow-violet-500/20"
          >
            {executing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Executing plan — this may take 30–60 seconds…
              </>
            ) : isSkip ? (
              <>
                <CheckCircle2 size={16} />
                Nothing to Generate — Fully Covered
              </>
            ) : (
              <>
                <Zap size={16} />
                Execute Generation Plan
              </>
            )}
          </button>
        </div>
        {isSkip ? (
          <p className="text-[11px] text-slate-500 text-center -mt-2">
            This requirement is already fully automated. There is nothing to generate.
          </p>
        ) : null}
      </div>
    </div>
  );
}
