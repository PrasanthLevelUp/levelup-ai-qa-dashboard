'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, CheckCircle2, XCircle, MinusCircle, Circle, Clock, Cpu, Brain,
  Sparkles, Stethoscope, Wrench, ShieldCheck, GraduationCap, Camera, Video,
  FileSearch, Terminal, Code, Network, History, GitBranch,
  Route, AlertTriangle,
} from 'lucide-react';
import { BeforeAfterHealing } from '@/components/before-after-healing';

/* ─── Types: mirror of the backend canonical ExecutionRecord + timeline ─── */

type TimelineStatus = 'done' | 'failed' | 'skipped' | 'info';
interface TimelineEvent {
  key: string;
  label: string;
  status: TimelineStatus;
  detail?: string;
  time?: string;
}

interface ArtifactDescriptor {
  id: string;
  type: string;
  storage: string;
  path: string;
  size?: number;
  contentType?: string;
  createdAt?: string;
}

/** Wall-clock timing for a single lifecycle section (mirror of backend SectionTiming). */
interface SectionTiming {
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
}

/** A single entry in the canonical append-only execution history. */
type ExecutionEventType =
  | 'execution_created'
  | 'stage_changed'
  | 'evidence_collected'
  | 'diagnosis_completed'
  | 'healing_completed'
  | 'validation_completed'
  | 'learning_completed'
  | 'execution_finalized';

interface ExecutionEvent {
  type: ExecutionEventType | string;
  timestamp: string;
  stage?: string;
  note?: string;
}

/** Observed facts captured for an execution (renamed from `observations`). */
interface EvidenceRecord {
  locatorState?: {
    exists: boolean; visible: boolean; enabled: boolean;
    receivesPointerEvents: boolean | null; clickable: boolean;
    interceptedBy: string | null; source: string;
  } | null;
  consoleErrors?: string[];
  networkErrors?: Array<{ url?: string; status?: number; detail: string }>;
  summary?: string[];
  timing?: SectionTiming;
}

interface ExecutionRecord {
  schemaVersion: number;
  executionId: string;
  testName: string;
  status: 'passed' | 'failed' | 'timedout' | 'skipped' | string;
  result?: string | null;
  stage?: string;
  durationMs: number;
  startTime: string;
  endTime: string;
  profile: string;
  jobId?: string | null;
  artifacts?: {
    metadata?: {
      url?: string; locator?: string; failedLine?: number;
      stackTrace?: string; browserInfo?: string;
    };
    screenshot?: ArtifactDescriptor;
    dom?: ArtifactDescriptor;
    html?: ArtifactDescriptor;
    trace?: ArtifactDescriptor;
    video?: ArtifactDescriptor;
    har?: ArtifactDescriptor;
    others?: ArtifactDescriptor[];
  };
  /** Canonical append-only history — the record's HISTORY (vs `stage`, its STATE). */
  events?: ExecutionEvent[];
  /** Renamed from `observations`; legacy records still carry `observations`. */
  evidence?: EvidenceRecord;
  observations?: EvidenceRecord;
  diagnosis?: {
    category: string; confidence: number; recommendedStrategy: string;
    rootCause?: string; recommendedAction?: string; locator?: string | null;
    healableByLocatorSwap?: boolean; evidenceBased?: boolean;
    locatorResolvedFromPageObject?: boolean;
    timing?: SectionTiming;
  };
  healing?: {
    remedy?: string; attemptedStrategies?: string[]; appliedStrategy?: string | null;
    source?: string | null; brokenLocator?: string | null; newLocator?: string | null;
    candidatesConsidered?: number; reportOnly?: boolean; rationale?: string;
    confidence?: number; timing?: SectionTiming;
  };
  validation?: {
    reran: boolean; passedAfterHealing?: boolean | null;
    confirmationRuns?: number; durationMs?: number; notes?: string[];
    timing?: SectionTiming;
  };
  learning?: {
    recorded: boolean; patternId?: string | null;
    domMemoryUpdated?: boolean; notes?: string[];
    timing?: SectionTiming;
  };
}

/** One advisor's verdict in the healing waterfall — AUTHORITATIVE, from the
 *  backend (deriveDecisionTrail). This is the ENTIRE decision: the raw orchestrator
 *  outcome + the reason + confidence. The UI renders it verbatim and NEVER infers
 *  which advisors ran: the backend captured exactly what happened at heal time. */
type AdvisorOutcome = 'hit' | 'miss' | 'skipped' | 'not_reached' | 'error';
interface AdvisorDecisionView {
  advisor: string;
  /** Raw orchestrator outcome — the UI maps it to a label/icon/colour. */
  status: AdvisorOutcome;
  /** Human-readable reason for the outcome, when known. */
  reason?: string;
  /** Confidence as an integer percentage (0..100), when known. */
  confidence?: number;
  durationMs?: number;
}

/** Semantic event feed — AUTHORITATIVE, from the backend (deriveEventFeed).
 *  The backend emits ONLY the semantic kind + structured data (never display
 *  text); the UI owns all labels/icons/colour, so adding a language later changes
 *  only the UI (i18n-clean). */
type ExecutionFeedKind =
  | 'execution_started'
  | 'preparing_environment'
  | 'running_tests'
  | 'evidence_collected'
  | 'diagnosis_completed'
  | 'healing_applied'
  | 'healing_report_only'
  | 'healing_failed'
  | 'validation_passed'
  | 'validation_failed'
  | 'learning_stored'
  | 'learning_skipped'
  | 'execution_passed'
  | 'execution_healed'
  | 'execution_failed'
  | 'execution_timed_out'
  | 'execution_skipped';
interface ExecutionFeedData {
  /** Raw diagnosis category, e.g. "timing_failure" (the UI title-cases it). */
  category?: string;
  /** Raw applied healing strategy, e.g. "wait_strategy" (the UI title-cases it). */
  strategy?: string;
}
interface ExecutionFeedEvent {
  timestamp: string;
  kind: ExecutionFeedKind;
  data?: ExecutionFeedData;
}

/** Per-phase health verdict — AUTHORITATIVE, from the backend
 *  (deriveExecutionHealth). Semantic only (phase + status); the UI owns labels/
 *  icons/colour. Always all six phases, in canonical order. */
type ExecutionPhase = 'execution' | 'evidence' | 'diagnosis' | 'healing' | 'validation' | 'learning';
type PhaseStatus = 'passed' | 'partial' | 'failed' | 'skipped' | 'not_run';
interface ExecutionHealthEntry {
  phase: ExecutionPhase;
  status: PhaseStatus;
}

interface ExecutionPayload {
  record: ExecutionRecord;
  timeline: TimelineEvent[];
  /** Authoritative advisor waterfall (backend-derived). */
  decisionTrail?: AdvisorDecisionView[];
  /** Authoritative semantic event feed (backend-derived). */
  eventFeed?: ExecutionFeedEvent[];
  /** Authoritative per-phase health verdicts (backend-derived). */
  health?: ExecutionHealthEntry[];
}

/** Internal pipeline stage → clean user-facing label (mirror of backend toDisplayStage). */
const STAGE_DISPLAY: Record<string, string> = {
  queued: 'Queued',
  cloning: 'Preparing Environment',
  installing: 'Preparing Environment',
  building: 'Preparing Environment',
  executing: 'Running Tests',
  collecting_evidence: 'Collecting Evidence',
  diagnosing: 'Diagnosing',
  healing: 'Healing',
  validating: 'Validating',
  learning: 'Learning',
  completed: 'Completed',
};

/** Friendly label for each canonical event type. */
const EVENT_LABEL: Record<string, string> = {
  execution_created: 'Started',
  evidence_collected: 'Evidence collected',
  diagnosis_completed: 'Diagnosis completed',
  healing_completed: 'Healing applied',
  validation_completed: 'Validation completed',
  learning_completed: 'Learning stored',
  execution_finalized: 'Finalized',
};

function eventLabel(ev: ExecutionEvent): string {
  if (ev.type === 'stage_changed') return STAGE_DISPLAY[ev.stage ?? ''] ?? (ev.stage ?? 'Stage changed');
  return EVENT_LABEL[ev.type] ?? String(ev.type).replace(/_/g, ' ');
}

/* ─── Small presentational helpers ─── */

const STATUS_PILL: Record<string, { label: string; cls: string; icon: any }> = {
  passed: { label: 'Passed', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', icon: CheckCircle2 },
  failed: { label: 'Failed', cls: 'text-red-400 bg-red-500/10 border-red-500/30', icon: XCircle },
  timedout: { label: 'Timed out', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/30', icon: Clock },
  skipped: { label: 'Skipped', cls: 'text-slate-400 bg-slate-500/10 border-slate-500/30', icon: MinusCircle },
};

const PROFILE_LABEL: Record<string, string> = {
  fast: 'Fast', standard: 'Standard', healing: 'Healing', debug: 'Debug',
};

function fmtDuration(ms: number): string {
  if (!ms || ms < 0) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/** Section duration from a SectionTiming, derived from explicit ms or the span. */
function timingMs(t?: SectionTiming): number | undefined {
  if (!t) return undefined;
  if (typeof t.durationMs === 'number') return t.durationMs;
  if (t.startedAt && t.completedAt) {
    const d = new Date(t.completedAt).getTime() - new Date(t.startedAt).getTime();
    return Number.isFinite(d) && d >= 0 ? d : undefined;
  }
  return undefined;
}

/** Short clock time (HH:MM:SS) for an ISO timestamp, blank if unparseable. */
function fmtClock(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString();
}

function StatIcon({ status }: { status: TimelineStatus }) {
  if (status === 'done') return <CheckCircle2 size={16} className="text-emerald-400" />;
  if (status === 'failed') return <XCircle size={16} className="text-red-400" />;
  if (status === 'skipped') return <MinusCircle size={16} className="text-slate-500" />;
  return <Circle size={16} className="text-blue-400" />;
}

function Card({ title, icon: Icon, children, accent }: {
  title: string; icon?: any; children: React.ReactNode; accent?: string;
}) {
  return (
    <div className="rounded-xl border border-[#1e293b] bg-[#1e293b]/30 p-6">
      <h2 className={`text-sm font-semibold mb-4 flex items-center gap-2 ${accent || 'text-white'}`}>
        {Icon && <Icon size={16} />} {title}
      </h2>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm text-slate-200 mt-0.5 break-all">{value ?? '—'}</p>
    </div>
  );
}

/* ─── Page ─── */

export function ExecutionDetailClient({ id }: { id: string }) {
  const [data, setData] = useState<ExecutionPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/executions/${id}`)
      .then((r: any) => {
        if (!r?.ok) throw new Error('Not found');
        return r.json();
      })
      .then((d: ExecutionPayload) => setData(d))
      .catch((e: any) => setError(e?.message ?? 'Failed to load'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !data?.record) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400 mb-4">Execution record not found</p>
        <Link href="/executions" className="text-blue-400 hover:text-blue-300 text-sm">← Back to Execution History</Link>
      </div>
    );
  }

  const { record, timeline } = data;
  // Headline outcome is DERIVED: a heal that held up on rerun reads as
  // "Passed after Healing" — the single most demo-worthy fact in the record.
  const healedAndHeld = record.result === 'healed' || record.validation?.passedAfterHealing === true;
  const pill = healedAndHeld
    ? { label: 'Passed after Healing', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', icon: CheckCircle2 }
    : (STATUS_PILL[record.status] ?? STATUS_PILL.failed);
  const PillIcon = pill.icon;
  const meta = record.artifacts?.metadata ?? {};

  return (
    <div className="space-y-6 max-w-5xl">
      <Link href="/executions" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
        <ArrowLeft size={16} /> Back to Execution History
      </Link>

      {/* Header */}
      <div className="rounded-xl border border-[#1e293b] bg-[#1e293b]/30 p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Execution Details</h1>
            <p className="text-sm text-slate-400 mt-1">{record.testName}</p>
            <p className="text-xs text-slate-500 mt-1 font-mono">{record.executionId}</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium ${pill.cls}`}>
            <PillIcon size={15} /> {pill.label}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
          <Field label="Duration" value={fmtDuration(record.durationMs)} />
          <Field label="Profile" value={PROFILE_LABEL[record.profile] ?? record.profile} />
          <Field label="Browser" value={meta.browserInfo} />
          <Field label="Failed line" value={meta.failedLine != null ? `L${meta.failedLine}` : undefined} />
          <Field label="URL" value={meta.url} />
          <Field label="Locator" value={meta.locator} />
          <Field label="Started" value={record.startTime ? new Date(record.startTime).toLocaleString() : undefined} />
          <Field label="Schema" value={`v${record.schemaVersion}`} />
        </div>
      </div>

      {/* Execution Health Bar — within ~2 seconds a viewer sees what each
          lifecycle phase did. Authoritative, backend-derived (deriveExecutionHealth). */}
      <HealthBar health={data.health ?? []} />

      {/* Advisor summary strip — the four independent advisors at a glance */}
      <AdvisorStrip record={record} />

      {/* Timeline */}
      <Card title="Execution Timeline" icon={Clock}>
        <ol className="relative border-l border-[#1e293b] ml-2 space-y-4">
          {timeline.map((ev) => (
            <li key={ev.key} className="ml-4">
              <span className="absolute -left-[9px] mt-0.5 bg-[#0f172a] rounded-full">
                <StatIcon status={ev.status} />
              </span>
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm text-slate-200">{ev.label}</p>
                {ev.time && (
                  <span className="text-[11px] text-slate-500 font-mono shrink-0">
                    {new Date(ev.time).toLocaleTimeString()}
                  </span>
                )}
              </div>
              {ev.detail && <p className="text-xs text-slate-500 mt-0.5 break-all">{ev.detail}</p>}
            </li>
          ))}
        </ol>
      </Card>

      {/* Diagnosis */}
      {record.diagnosis && <DiagnosisCard d={record.diagnosis} />}

      {/* Evidence Viewer */}
      <EvidenceViewer record={record} />

      {/* Healing Decision Tree */}
      {record.healing && <HealingTree h={record.healing} />}

      {/* Before → After Healing — the side-by-side of what broke vs what changed */}
      {record.healing && (
        <BeforeAfterHealing
          data={{
            brokenLocator: record.healing.brokenLocator,
            newLocator: record.healing.newLocator,
            appliedStrategy: record.healing.appliedStrategy,
            source: record.healing.source,
            failureCategory: record.diagnosis?.category,
            passedAfterHealing: record.validation?.passedAfterHealing,
          }}
        />
      )}

      {/* Validation */}
      {record.validation?.reran && <ValidationCard v={record.validation} />}

      {/* Learning */}
      {record.learning && <LearningCard l={record.learning} />}

      {/* Decision Trail — the advisor waterfall, AUTHORITATIVE from the backend */}
      <DecisionTrail trail={data.decisionTrail ?? []} />

      {/* Events — the customer-facing narrated feed, AUTHORITATIVE from the backend */}
      <EventsLog feed={data.eventFeed} events={record.events ?? []} />
    </div>
  );
}

/* ─── Diagnosis card ─── */
function DiagnosisCard({ d }: { d: NonNullable<ExecutionRecord['diagnosis']> }) {
  const confPct = Math.round((d.confidence ?? 0) * 100);
  const confColor = confPct >= 80 ? 'text-emerald-400' : confPct >= 50 ? 'text-amber-400' : 'text-red-400';
  return (
    <Card title="Diagnosis" icon={Stethoscope} accent="text-sky-300">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Field label="Failure Type" value={<span className="capitalize">{d.category?.replace(/_/g, ' ')}</span>} />
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Confidence</p>
          <p className={`text-sm font-semibold mt-0.5 ${confColor}`}>{confPct}%</p>
        </div>
        <Field label="Recommended" value={<span className="capitalize">{d.recommendedStrategy?.replace(/_/g, ' ')}</span>} />
        <Field label="Evidence-based" value={d.evidenceBased ? 'Yes' : 'No'} />
      </div>
      {d.rootCause && (
        <div className="mt-4">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Root Cause</p>
          <p className="text-sm text-slate-200 mt-1">{d.rootCause}</p>
        </div>
      )}
      {d.recommendedAction && (
        <div className="mt-4">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Recommended Fix</p>
          <p className="text-sm text-slate-200 mt-1">{d.recommendedAction}</p>
        </div>
      )}
    </Card>
  );
}

/* ─── Evidence viewer (tabs) ─── */
function EvidenceViewer({ record }: { record: ExecutionRecord }) {
  const a = record.artifacts ?? {};
  // `evidence` is the canonical name; older records persist it as `observations`.
  const obs = record.evidence ?? record.observations ?? {};
  const tabs = [
    { key: 'screenshot', label: 'Screenshot', icon: Camera, present: !!a.screenshot },
    { key: 'video', label: 'Video', icon: Video, present: !!a.video },
    { key: 'trace', label: 'Trace', icon: FileSearch, present: !!a.trace },
    { key: 'console', label: 'Console', icon: Terminal, present: !!(obs.consoleErrors?.length) },
    { key: 'dom', label: 'DOM', icon: Code, present: !!(a.dom || a.html) },
    { key: 'network', label: 'Network', icon: Network, present: !!(obs.networkErrors?.length) },
  ];
  const [active, setActive] = useState(tabs.find((t) => t.present)?.key ?? 'screenshot');

  function ArtifactBox({ desc }: { desc?: ArtifactDescriptor }) {
    if (!desc) return <Empty label="Not captured for this execution." />;
    return (
      <div className="text-xs text-slate-400 space-y-1 font-mono">
        <p><span className="text-slate-500">type:</span> {desc.type}</p>
        <p><span className="text-slate-500">storage:</span> {desc.storage}</p>
        <p className="break-all"><span className="text-slate-500">path:</span> {desc.path}</p>
        {desc.size != null && <p><span className="text-slate-500">size:</span> {desc.size} bytes</p>}
        <p className="text-[11px] text-slate-500 mt-2 not-italic font-sans">
          Stored on the execution backend. Inline replay (rendered bytes) is a planned follow-up — this view confirms the artifact reference the record holds.
        </p>
      </div>
    );
  }

  return (
    <Card title="Evidence" icon={Camera} accent="text-violet-300">
      <div className="flex flex-wrap gap-2 mb-4">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                active === t.key
                  ? 'bg-violet-500/15 border-violet-500/40 text-violet-200'
                  : 'border-[#1e293b] text-slate-400 hover:text-slate-200'
              } ${!t.present ? 'opacity-50' : ''}`}
            >
              <Icon size={13} /> {t.label}
              {!t.present && <span className="text-[10px]">·</span>}
            </button>
          );
        })}
      </div>
      <div className="min-h-[80px]">
        {active === 'screenshot' && <ArtifactBox desc={record.artifacts?.screenshot} />}
        {active === 'video' && <ArtifactBox desc={record.artifacts?.video} />}
        {active === 'trace' && <ArtifactBox desc={record.artifacts?.trace} />}
        {active === 'dom' && <ArtifactBox desc={record.artifacts?.dom ?? record.artifacts?.html} />}
        {active === 'console' && (
          obs.consoleErrors?.length
            ? <pre className="text-xs text-red-300 bg-[#0f172a] rounded-lg p-3 overflow-auto max-h-64 whitespace-pre-wrap">{obs.consoleErrors.join('\n')}</pre>
            : <Empty label="No console errors observed." />
        )}
        {active === 'network' && (
          obs.networkErrors?.length
            ? (
              <div className="space-y-2">
                {obs.networkErrors.map((n, i) => (
                  <div key={i} className="text-xs bg-[#0f172a] rounded-lg p-3 flex items-start gap-2">
                    {n.status && <span className="text-red-400 font-mono shrink-0">{n.status}</span>}
                    <div className="min-w-0">
                      {n.url && <p className="text-slate-300 font-mono break-all">{n.url}</p>}
                      <p className="text-slate-500">{n.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            )
            : <Empty label="No network errors observed." />
        )}
      </div>
    </Card>
  );
}

function Empty({ label }: { label: string }) {
  return <p className="text-sm text-slate-500 italic">{label}</p>;
}

/* ─── Healing decision tree ─── */
const STRATEGY_META: Record<string, { label: string; icon: any }> = {
  rule_based: { label: 'Rule Engine', icon: Cpu },
  pattern_match: { label: 'Pattern Engine', icon: Brain },
  pattern: { label: 'Pattern Engine', icon: Brain },
  ai: { label: 'AI Engine', icon: Sparkles },
  wait: { label: 'Wait Injection', icon: Clock },
};

function HealingTree({ h }: { h: NonNullable<ExecutionRecord['healing']> }) {
  const attempted = h.attemptedStrategies ?? [];
  const applied = h.appliedStrategy ?? null;
  return (
    <Card title="Healing Decision" icon={Wrench} accent="text-emerald-300">
      {h.reportOnly ? (
        <div className="flex items-center gap-2 text-sm text-amber-300">
          <MinusCircle size={16} /> Report only — surfaced to humans, no automated fix applied.
        </div>
      ) : attempted.length === 0 && !applied ? (
        <Empty label="No healing layers were attempted." />
      ) : (
        <div className="space-y-2">
          {attempted.map((s, i) => {
            const meta = STRATEGY_META[s] ?? { label: s, icon: Wrench };
            const Icon = meta.icon;
            const isWinner = applied === s;
            return (
              <div key={`${s}-${i}`} className="flex items-center gap-3">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm flex-1 ${
                  isWinner ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-[#1e293b] text-slate-400'
                }`}>
                  <Icon size={15} /> {meta.label}
                  {isWinner
                    ? <CheckCircle2 size={15} className="text-emerald-400 ml-auto" />
                    : <span className="text-[11px] text-slate-600 ml-auto">tried</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {applied && (
        <div className="mt-5 pt-4 border-t border-[#1e293b] grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field label="Winner" value={STRATEGY_META[applied]?.label ?? applied} />
          <Field label="Source" value={h.source ?? '—'} />
          <Field label="Candidates" value={h.candidatesConsidered ?? '—'} />
          <Field label="Broken Locator" value={h.brokenLocator ?? '—'} />
          <Field label="New Locator" value={h.newLocator ?? '—'} />
        </div>
      )}
      {h.rationale && <p className="text-xs text-slate-500 mt-4">{h.rationale}</p>}
    </Card>
  );
}

/* ─── Validation result ─── */
function ValidationCard({ v }: { v: NonNullable<ExecutionRecord['validation']> }) {
  const passed = v.passedAfterHealing === true;
  const failed = v.passedAfterHealing === false;
  const steps = [
    { label: 'Patch Applied', status: 'done' as TimelineStatus },
    { label: 'Rerun', status: 'done' as TimelineStatus },
    { label: passed ? 'Passed' : failed ? 'Failed' : 'Inconclusive', status: passed ? 'done' : failed ? 'failed' : 'info' as TimelineStatus },
  ];
  return (
    <Card title="Validation" icon={ShieldCheck} accent={passed ? 'text-emerald-300' : 'text-red-300'}>
      <div className="flex items-center flex-wrap gap-2">
        {steps.map((s, i) => (
          <div key={s.label} className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1e293b] text-sm text-slate-200">
              <StatIcon status={s.status} /> {s.label}
            </span>
            {i < steps.length - 1 && <span className="text-slate-600">→</span>}
          </div>
        ))}
      </div>
      {v.notes?.length ? (
        <div className="mt-4">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Reason</p>
          <p className="text-sm text-slate-300 mt-1">{v.notes.join(' · ')}</p>
        </div>
      ) : null}
    </Card>
  );
}

/* ─── Learning card ─── */
function LearningCard({ l }: { l: NonNullable<ExecutionRecord['learning']> }) {
  return (
    <Card title="Learning" icon={GraduationCap} accent="text-indigo-300">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Field
          label="Stored"
          value={
            <span className={l.recorded ? 'text-emerald-400' : 'text-slate-400'}>
              {l.recorded ? 'Yes' : 'No'}
            </span>
          }
        />
        <Field label="DOM Memory" value={l.domMemoryUpdated ? 'Updated' : '—'} />
        <Field label="Pattern" value={l.patternId ?? '—'} />
      </div>
      {l.notes?.length ? <p className="text-xs text-slate-500 mt-4">{l.notes.join(' · ')}</p> : null}
    </Card>
  );
}


/* ─── Advisor summary strip ───────────────────────────────────────────────
   The four independent advisors (Diagnosis · Healing · Validation · Learning)
   at a glance, each with a one-line verdict + per-section timing. Everything
   here is read straight off the record — no recomputation, no new state. */

type AdvisorTone = 'ok' | 'warn' | 'bad' | 'idle';

function advisorToneCls(tone: AdvisorTone): string {
  switch (tone) {
    case 'ok': return 'border-emerald-500/30 text-emerald-300';
    case 'warn': return 'border-amber-500/30 text-amber-300';
    case 'bad': return 'border-red-500/30 text-red-300';
    default: return 'border-[#1e293b] text-slate-400';
  }
}

/** Tone-keyed colour for the prominent advisor icon badge. These four badges are
 *  meant to be one of the most recognizable parts of LevelUp AI — so the icon is
 *  the hero of each card, not a tiny glyph in the label row. */
function advisorBadgeCls(tone: AdvisorTone): string {
  switch (tone) {
    case 'ok': return 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30';
    case 'warn': return 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30';
    case 'bad': return 'bg-red-500/15 text-red-300 ring-1 ring-red-500/30';
    default: return 'bg-slate-500/10 text-slate-400 ring-1 ring-[#1e293b]';
  }
}

function AdvisorTile({ icon: Icon, title, value, sub, tone, timing }: {
  icon: any; title: string; value: string; sub?: string; tone: AdvisorTone; timing?: SectionTiming;
}) {
  const ms = timingMs(timing);
  return (
    <div className={`rounded-xl border bg-[#1e293b]/30 p-4 ${advisorToneCls(tone)}`}>
      <div className="flex items-center gap-3">
        <span className={`inline-flex items-center justify-center w-11 h-11 rounded-xl shrink-0 ${advisorBadgeCls(tone)}`}>
          <Icon size={22} strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">{title}</p>
          <p className="text-sm font-semibold leading-tight mt-0.5 truncate">{value}</p>
        </div>
      </div>
      {sub && <p className="text-xs text-slate-500 mt-2 break-all">{sub}</p>}
      {ms != null && (
        <p className="text-[11px] text-slate-600 mt-2 font-mono flex items-center gap-1">
          <Clock size={11} /> {fmtDuration(ms)}
        </p>
      )}
    </div>
  );
}

function AdvisorStrip({ record }: { record: ExecutionRecord }) {
  const d = record.diagnosis;
  const h = record.healing;
  const v = record.validation;
  const l = record.learning;

  // Diagnosis — failure category + confidence.
  const confPct = d ? Math.round((d.confidence ?? 0) * 100) : null;
  const diagValue = d ? d.category?.replace(/_/g, ' ') : 'Not run';
  const diagTone: AdvisorTone = d ? (confPct! >= 80 ? 'ok' : confPct! >= 50 ? 'warn' : 'bad') : 'idle';

  // Healing — applied strategy / report-only / none.
  const applied = h?.appliedStrategy ?? null;
  const healValue = h?.reportOnly ? 'Report only' : applied ? (STRATEGY_META[applied]?.label ?? applied) : 'No fix applied';
  const healTone: AdvisorTone = applied ? 'ok' : h?.reportOnly ? 'warn' : 'idle';

  // Validation — did the fix hold up on rerun?
  const vPassed = v?.passedAfterHealing === true;
  const vFailed = v?.passedAfterHealing === false;
  const valValue = !v?.reran ? 'Not rerun' : vPassed ? 'Passed' : vFailed ? 'Failed' : 'Inconclusive';
  const valTone: AdvisorTone = !v?.reran ? 'idle' : vPassed ? 'ok' : vFailed ? 'bad' : 'warn';

  // Learning — was anything written back to memory?
  const learnValue = l?.recorded ? 'Stored' : 'Nothing stored';
  const learnTone: AdvisorTone = l?.recorded ? 'ok' : 'idle';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <AdvisorTile
        icon={Stethoscope} title="Diagnosis" value={cap(diagValue)}
        sub={confPct != null ? `${confPct}% confidence` : undefined}
        tone={diagTone} timing={d?.timing}
      />
      <AdvisorTile
        icon={Wrench} title="Healing" value={cap(healValue)}
        sub={h?.source ? `via ${h.source}` : undefined}
        tone={healTone} timing={h?.timing}
      />
      <AdvisorTile
        icon={ShieldCheck} title="Validation" value={valValue}
        sub={v?.confirmationRuns ? `${v.confirmationRuns} rerun${v.confirmationRuns > 1 ? 's' : ''}` : undefined}
        tone={valTone} timing={v?.timing}
      />
      <AdvisorTile
        icon={GraduationCap} title="Learning" value={learnValue}
        sub={l?.domMemoryUpdated ? 'DOM memory updated' : l?.patternId ? 'pattern saved' : undefined}
        tone={learnTone} timing={l?.timing}
      />
    </div>
  );
}

function cap(s?: string): string {
  if (!s) return '—';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ─── Decision Trail ──────────────────────────────────────────────────────
   The advisor waterfall: which intelligence layers were consulted, which won,
   which were skipped. This is AUTHORITATIVE — the backend captured it from the
   orchestrator at heal time (record.healing.decisionTrail) and the UI renders it
   verbatim. We NEVER infer advisor usage on the client. */

/** UI mapping for each RAW orchestrator outcome → label/colour/icon. The backend
 *  passes the verbatim outcome (hit/miss/skipped/not_reached/error); the UI owns
 *  all of the presentation here, so the customer immediately sees WHY a layer was
 *  used or skipped. */
const TRAIL_STATUS_META: Record<AdvisorOutcome, { label: string; cls: string; icon: any }> = {
  hit: { label: 'Hit', cls: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200', icon: CheckCircle2 },
  miss: { label: 'Miss', cls: 'border-slate-600/50 bg-slate-500/5 text-slate-300', icon: Circle },
  skipped: { label: 'Skipped', cls: 'border-[#1e293b] bg-transparent text-slate-500 opacity-70', icon: MinusCircle },
  not_reached: { label: 'Not reached', cls: 'border-[#1e293b] bg-transparent text-slate-600 opacity-60', icon: MinusCircle },
  error: { label: 'Error', cls: 'border-red-500/40 bg-red-500/10 text-red-200', icon: XCircle },
};

function DecisionTrail({ trail }: { trail: AdvisorDecisionView[] }) {
  return (
    <Card title="Decision Trail" icon={Route} accent="text-amber-300">
      <p className="text-xs text-slate-500 mb-4">
        The advisor waterfall for this heal — every intelligence layer&apos;s verdict (hit · miss ·
        skipped · not reached) with the reason it gave. Recorded by the backend at decision time,
        not inferred here.
      </p>
      {trail.length === 0 ? (
        <Empty label="No advisor waterfall on this record — this execution did not go through healing." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {trail.map((s, i) => {
            const meta = TRAIL_STATUS_META[s.status] ?? TRAIL_STATUS_META.miss;
            const Icon = meta.icon;
            return (
              <div key={`${s.advisor}-${i}`} className={`rounded-lg border p-3 ${meta.cls}`}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-100 truncate">{s.advisor}</span>
                  <Icon size={14} className="ml-auto shrink-0" />
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] uppercase tracking-wide font-semibold">{meta.label}</span>
                  {typeof s.confidence === 'number' && (
                    <span className="text-[11px] text-slate-400 font-mono">{s.confidence}%</span>
                  )}
                  {typeof s.durationMs === 'number' && (
                    <span className="text-[11px] text-slate-600 font-mono ml-auto flex items-center gap-1">
                      <Clock size={10} /> {fmtDuration(s.durationMs)}
                    </span>
                  )}
                </div>
                {s.reason && <p className="text-[11px] text-slate-400 mt-1.5 break-words">{s.reason}</p>}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

/* ─── Events log ──────────────────────────────────────────────────────────
   The customer-facing event story. Customers don't think in backend event
   names ("stage_changed", "diagnosis_completed") — they want a readable feed:
   "Collected Browser Evidence → Diagnosed Timing Failure → Applied Wait Strategy
   → Validation Passed → Learning Stored". The BACKEND emits ONLY the semantic
   kind + structured data; the UI owns ALL labels/icons/colour here, so adding a
   language later changes only this file (i18n-clean). Falls back to the raw
   events log only for legacy records that predate the feed. */

type FeedTone = 'positive' | 'negative' | 'neutral' | 'info';

/** Title-case a raw snake_case token, e.g. "timing_failure" → "Timing Failure". */
function titleCase(s?: string): string {
  if (!s) return '';
  return s.split(/[_\s]+/).filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** UI presentation for each semantic feed kind: icon, tone, and a label builder
 *  that interpolates the raw structured data (title-cased here, never on the
 *  backend). This is the ONLY place event display text lives. */
const FEED_KIND_META: Record<ExecutionFeedKind, { icon: any; tone: FeedTone; label: (d?: ExecutionFeedData) => string }> = {
  execution_started: { icon: Circle, tone: 'info', label: () => 'Execution Started' },
  preparing_environment: { icon: GitBranch, tone: 'info', label: () => 'Preparing Environment' },
  running_tests: { icon: Cpu, tone: 'info', label: () => 'Running Tests' },
  evidence_collected: { icon: Camera, tone: 'info', label: () => 'Collected Browser Evidence' },
  diagnosis_completed: { icon: Stethoscope, tone: 'info', label: (d) => d?.category ? `Diagnosed ${titleCase(d.category)}` : 'Diagnosis Completed' },
  healing_applied: { icon: Wrench, tone: 'positive', label: (d) => d?.strategy ? `Applied ${titleCase(d.strategy)}` : 'Healing Applied' },
  healing_report_only: { icon: Wrench, tone: 'neutral', label: () => 'Flagged for Review' },
  healing_failed: { icon: Wrench, tone: 'negative', label: () => 'Healing Failed' },
  validation_passed: { icon: ShieldCheck, tone: 'positive', label: () => 'Validation Passed' },
  validation_failed: { icon: ShieldCheck, tone: 'negative', label: () => 'Validation Failed' },
  learning_stored: { icon: GraduationCap, tone: 'positive', label: () => 'Learning Stored' },
  learning_skipped: { icon: GraduationCap, tone: 'neutral', label: () => 'Nothing to Learn' },
  execution_passed: { icon: CheckCircle2, tone: 'positive', label: () => 'Execution Passed' },
  execution_healed: { icon: CheckCircle2, tone: 'positive', label: () => 'Passed after Healing' },
  execution_failed: { icon: XCircle, tone: 'negative', label: () => 'Execution Failed' },
  execution_timed_out: { icon: Clock, tone: 'negative', label: () => 'Execution Timed Out' },
  execution_skipped: { icon: MinusCircle, tone: 'neutral', label: () => 'Execution Skipped' },
};

/** Colour for each tone. */
const FEED_TONE_CLS: Record<FeedTone, string> = {
  positive: 'text-emerald-300',
  negative: 'text-red-300',
  neutral: 'text-slate-300',
  info: 'text-sky-300',
};

function EventsLog({ feed, events }: { feed?: ExecutionFeedEvent[]; events: ExecutionEvent[] }) {
  // Preferred path: the backend's semantic feed, mapped to display text here.
  if (feed && feed.length > 0) {
    return (
      <Card title="Events" icon={History}>
        <ol className="space-y-2.5">
          {feed.map((ev, i) => {
            const meta = FEED_KIND_META[ev.kind];
            const Icon = meta?.icon ?? Circle;
            const tone = meta?.tone ?? 'neutral';
            const label = meta ? meta.label(ev.data) : titleCase(ev.kind);
            return (
              <li key={`${ev.kind}-${ev.timestamp}-${i}`} className="flex items-center gap-3 text-sm">
                <span className="text-[11px] text-slate-500 font-mono shrink-0 w-20">{fmtClock(ev.timestamp) || '—'}</span>
                <Icon size={15} className={`shrink-0 ${FEED_TONE_CLS[tone]}`} />
                <span className={`font-medium ${FEED_TONE_CLS[tone]}`}>{label}</span>
              </li>
            );
          })}
        </ol>
      </Card>
    );
  }

  // Legacy fallback: raw append-only history (records that predate the feed).
  if (!events.length) {
    return (
      <Card title="Events" icon={History}>
        <Empty label="No event history on this record (predates the events log)." />
      </Card>
    );
  }
  return (
    <Card title="Events" icon={History}>
      <ol className="space-y-2">
        {events.map((ev, i) => (
          <li key={`${ev.type}-${ev.timestamp}-${i}`} className="flex items-baseline gap-3 text-sm">
            <span className="text-[11px] text-slate-500 font-mono shrink-0 w-20">{fmtClock(ev.timestamp) || '—'}</span>
            <span className="font-medium text-slate-300">{eventLabel(ev)}</span>
            {ev.note && <span className="text-xs text-slate-500 break-all">· {ev.note}</span>}
          </li>
        ))}
      </ol>
    </Card>
  );
}

/* ─── Execution Health Bar ─────────────────────────────────────────────────
   The single most demo-worthy at-a-glance: a CTO sees within ~2 seconds what
   every lifecycle phase did. AUTHORITATIVE — the backend derives the per-phase
   verdict (deriveExecutionHealth); the UI owns ALL labels/icons/colour here. */

const PHASE_META: Record<ExecutionPhase, { label: string; icon: any }> = {
  execution: { label: 'Execution', icon: Cpu },
  evidence: { label: 'Evidence', icon: Camera },
  diagnosis: { label: 'Diagnosis', icon: Stethoscope },
  healing: { label: 'Healing', icon: Wrench },
  validation: { label: 'Validation', icon: ShieldCheck },
  learning: { label: 'Learning', icon: GraduationCap },
};

const PHASE_STATUS_META: Record<PhaseStatus, { label: string; icon: any; cls: string; iconCls: string }> = {
  passed: { label: 'Passed', icon: CheckCircle2, cls: 'border-emerald-500/30 bg-emerald-500/5', iconCls: 'text-emerald-400' },
  partial: { label: 'Partial', icon: AlertTriangle, cls: 'border-amber-500/30 bg-amber-500/5', iconCls: 'text-amber-400' },
  failed: { label: 'Failed', icon: XCircle, cls: 'border-red-500/30 bg-red-500/5', iconCls: 'text-red-400' },
  skipped: { label: 'Skipped', icon: MinusCircle, cls: 'border-[#1e293b] bg-transparent', iconCls: 'text-slate-500' },
  not_run: { label: 'Not run', icon: Circle, cls: 'border-[#1e293b] bg-transparent opacity-60', iconCls: 'text-slate-600' },
};

function HealthBar({ health }: { health: ExecutionHealthEntry[] }) {
  if (!health.length) return null;
  return (
    <div className="rounded-xl border border-[#1e293b] bg-[#1e293b]/30 p-4">
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2.5">
        {health.map((h) => {
          const phase = PHASE_META[h.phase] ?? { label: h.phase, icon: Circle };
          const st = PHASE_STATUS_META[h.status] ?? PHASE_STATUS_META.not_run;
          const PhaseIcon = phase.icon;
          const StatusIcon = st.icon;
          return (
            <div key={h.phase} className={`rounded-lg border p-3 flex flex-col gap-1.5 ${st.cls}`}>
              <div className="flex items-center gap-1.5 text-slate-400">
                <PhaseIcon size={13} className="shrink-0" />
                <span className="text-[11px] uppercase tracking-wide truncate">{phase.label}</span>
              </div>
              <div className={`flex items-center gap-1.5 ${st.iconCls}`}>
                <StatusIcon size={15} className="shrink-0" />
                <span className="text-sm font-semibold">{st.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
