'use client';
import Link from 'next/link';
import {
  CheckCircle2, XCircle, MinusCircle, Clock, Stethoscope, Wrench, ChevronRight,
} from 'lucide-react';

/* ───────────────────────────────────────────────────────────────────────────
   ExecutionSummary — the single reusable "what happened" card for ONE execution.

   It is keyed off the canonical ExecutionRecord (or the compact list projection
   of it) and shows ONLY facts the record actually holds: the derived outcome
   ("Passed after Healing"), the test name, duration, the diagnosis one-liner and
   the healing one-liner, plus a link to the full Execution Details.

   By design it does NOT show job-level rollups like "N Tests / N Passed /
   N Healed": an ExecutionRecord is a SINGLE test execution, so those counts are
   not part of its truth. A job-level summary (multiple executions) is a separate
   component once a job-rollup endpoint exists — we never fabricate counts here.

   Meant to appear everywhere the same outcome needs summarising: Dashboard,
   Project, Release, PR checks, Notifications. Presentation lives entirely here.
   ─────────────────────────────────────────────────────────────────────────── */

/** The minimal canonical facts this card renders — a subset of ExecutionRecord
 *  that both the compact list projection and the full record satisfy. */
export interface ExecutionSummaryData {
  executionId: string;
  testName: string;
  /** Lifecycle status (queued|running|completed|failed|cancelled|timed_out). */
  status: string;
  /** Test outcome, kept separate from lifecycle status (pass|healed|fail|skipped). */
  result?: string | null;
  durationMs: number;
  profile?: string;
  /** Raw diagnosis category, e.g. "timing_failure" (title-cased here). */
  diagnosisCategory?: string | null;
  /** Diagnosis confidence on the 0..1 scale (rendered as an integer %). */
  confidence?: number | null;
  /** True when the run healed and the fix held on rerun. */
  healed?: boolean;
  /** Raw applied healing strategy, e.g. "wait_strategy" (title-cased here). */
  appliedStrategy?: string | null;
  /** True when healing was surfaced for review only (no auto-fix applied). */
  reportOnly?: boolean;
}

type Outcome = { label: string; cls: string; icon: any };

/** Derive the single headline outcome from the record's facts. A heal that held
 *  up on rerun is the most demo-worthy fact, so it reads as "Passed after Healing". */
function outcomeOf(e: ExecutionSummaryData): Outcome {
  if (e.healed || e.result === 'healed') {
    return { label: 'Passed after Healing', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', icon: CheckCircle2 };
  }
  if (e.result === 'pass' || e.status === 'passed') {
    return { label: 'Passed', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', icon: CheckCircle2 };
  }
  if (e.status === 'timed_out' || e.status === 'timedout') {
    return { label: 'Timed out', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/30', icon: Clock };
  }
  if (e.result === 'skipped' || e.status === 'skipped') {
    return { label: 'Skipped', cls: 'text-slate-400 bg-slate-500/10 border-slate-500/30', icon: MinusCircle };
  }
  return { label: 'Failed', cls: 'text-red-400 bg-red-500/10 border-red-500/30', icon: XCircle };
}

function titleCase(s?: string | null): string {
  if (!s) return '';
  return s.split(/[_\s]+/).filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function fmtDuration(ms: number): string {
  if (!ms || ms < 0) return '—';
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

export function ExecutionSummary({
  execution,
  href,
  showLink = true,
}: {
  execution: ExecutionSummaryData;
  /** Override the details link target; defaults to /executions/:id. */
  href?: string;
  showLink?: boolean;
}) {
  const e = execution;
  const outcome = outcomeOf(e);
  const OutcomeIcon = outcome.icon;
  const confPct = typeof e.confidence === 'number' ? Math.round(e.confidence * 100) : null;
  const detailsHref = href ?? `/executions/${encodeURIComponent(e.executionId)}`;

  // Diagnosis / healing one-liners — shown only when the record actually carries them.
  const diagnosisLine = e.diagnosisCategory
    ? `${titleCase(e.diagnosisCategory)}${confPct != null ? ` · ${confPct}% confidence` : ''}`
    : null;
  const healingLine = e.reportOnly
    ? 'Flagged for review — no auto-fix applied'
    : (e.healed || e.appliedStrategy)
      ? `Healed${e.appliedStrategy ? ` via ${titleCase(e.appliedStrategy)}` : ''}`
      : null;

  return (
    <div className="rounded-xl border border-[#1e293b] bg-[#1e293b]/30 p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${outcome.cls}`}>
            <OutcomeIcon size={13} /> {outcome.label}
          </span>
          <p className="text-sm font-semibold text-slate-100 mt-2 truncate">{e.testName}</p>
          <p className="text-[11px] text-slate-500 mt-0.5 font-mono truncate">{e.executionId}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Duration</p>
          <p className="text-sm text-slate-200 mt-0.5 flex items-center justify-end gap-1">
            <Clock size={13} className="text-slate-500" /> {fmtDuration(e.durationMs)}
          </p>
          {e.profile && <p className="text-[11px] text-slate-500 capitalize mt-0.5">{e.profile} profile</p>}
        </div>
      </div>

      {(diagnosisLine || healingLine) && (
        <div className="mt-4 pt-4 border-t border-[#1e293b] grid grid-cols-1 sm:grid-cols-2 gap-3">
          {diagnosisLine && (
            <div className="flex items-start gap-2">
              <Stethoscope size={15} className="text-sky-300 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Diagnosis</p>
                <p className="text-sm text-slate-200 mt-0.5 break-words">{diagnosisLine}</p>
              </div>
            </div>
          )}
          {healingLine && (
            <div className="flex items-start gap-2">
              <Wrench size={15} className="text-emerald-300 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Healing</p>
                <p className="text-sm text-slate-200 mt-0.5 break-words">{healingLine}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {showLink && (
        <div className="mt-4">
          <Link
            href={detailsHref}
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
          >
            View Details <ChevronRight size={14} />
          </Link>
        </div>
      )}
    </div>
  );
}
