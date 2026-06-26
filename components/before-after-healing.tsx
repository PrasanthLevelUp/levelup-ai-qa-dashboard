'use client';
import { XCircle, CheckCircle2, ArrowRight, Wrench } from 'lucide-react';

/* ───────────────────────────────────────────────────────────────────────────
   BeforeAfterHealing — the highest-impact, lowest-effort demo artifact: a side-
   by-side of what BROKE vs what LevelUp AI CHANGED to fix it. Every fact here is
   already on the ExecutionRecord (broken locator, new locator, applied strategy,
   the diagnosed failure, and whether the rerun passed) — nothing is inferred.

   Before  →  After
   ─────────────────
   #login-button        →   button[data-test="login"]
   Timeout (element       Passed on rerun
   not found)             via DOM Memory

   Renders only when there is a real before/after to show (a locator swap or an
   applied strategy). Presentation lives entirely here.
   ─────────────────────────────────────────────────────────────────────────── */

export interface BeforeAfterHealingData {
  /** The locator that broke (before). */
  brokenLocator?: string | null;
  /** The locator healing swapped in (after). */
  newLocator?: string | null;
  /** Raw applied healing strategy, e.g. "wait_strategy" (title-cased here). */
  appliedStrategy?: string | null;
  /** Where the fix came from, e.g. "DOM Memory", "App Profile". */
  source?: string | null;
  /** Raw diagnosed failure category, e.g. "timing_failure" (title-cased here). */
  failureCategory?: string | null;
  /** True when the rerun confirmed the fix held. */
  passedAfterHealing?: boolean | null;
}

function titleCase(s?: string | null): string {
  if (!s) return '';
  return s.split(/[_\s]+/).filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** True when the record carries enough to show a meaningful comparison. */
export function hasBeforeAfter(d: BeforeAfterHealingData): boolean {
  return !!(d.brokenLocator || d.newLocator || d.appliedStrategy);
}

function Mono({ value }: { value?: string | null }) {
  if (!value) return <span className="text-slate-600 italic font-sans">not captured</span>;
  return <code className="text-sm break-all">{value}</code>;
}

export function BeforeAfterHealing({ data }: { data: BeforeAfterHealingData }) {
  if (!hasBeforeAfter(data)) return null;

  const held = data.passedAfterHealing === true;
  const failureLabel = data.failureCategory ? titleCase(data.failureCategory) : 'Failed';
  const strategyLabel = data.appliedStrategy ? titleCase(data.appliedStrategy) : null;

  return (
    <div className="rounded-xl border border-[#1e293b] bg-[#1e293b]/30 p-6">
      <h2 className="text-sm font-semibold mb-4 flex items-center gap-2 text-emerald-300">
        <Wrench size={16} /> Before → After Healing
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-stretch">
        {/* Before — what broke */}
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
          <div className="flex items-center gap-1.5 text-red-300 text-xs font-semibold uppercase tracking-wide">
            <XCircle size={14} /> Before
          </div>
          <div className="mt-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Locator</p>
            <p className="text-red-200 mt-0.5"><Mono value={data.brokenLocator} /></p>
          </div>
          <div className="mt-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Failure</p>
            <p className="text-sm text-red-200 mt-0.5">{failureLabel}</p>
          </div>
        </div>

        {/* Arrow */}
        <div className="hidden md:flex items-center justify-center">
          <ArrowRight size={22} className="text-slate-500" />
        </div>

        {/* After — what LevelUp AI changed */}
        <div className={`rounded-lg border p-4 ${held ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
          <div className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${held ? 'text-emerald-300' : 'text-amber-300'}`}>
            <CheckCircle2 size={14} /> After
          </div>
          <div className="mt-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Locator</p>
            <p className={`mt-0.5 ${held ? 'text-emerald-200' : 'text-amber-200'}`}><Mono value={data.newLocator} /></p>
          </div>
          <div className="mt-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Result</p>
            <p className={`text-sm mt-0.5 ${held ? 'text-emerald-200' : 'text-amber-200'}`}>
              {held ? 'Passed on rerun' : 'Applied — awaiting confirmation'}
              {strategyLabel && <span className="text-slate-400"> · via {strategyLabel}</span>}
              {data.source && <span className="text-slate-500"> ({data.source})</span>}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
