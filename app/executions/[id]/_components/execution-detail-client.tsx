'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, CheckCircle2, XCircle, MinusCircle, Circle, Clock, Cpu, Brain,
  Sparkles, Stethoscope, Wrench, ShieldCheck, GraduationCap, Camera, Video,
  FileSearch, Terminal, Code, Network,
} from 'lucide-react';

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

interface ExecutionRecord {
  schemaVersion: number;
  executionId: string;
  testName: string;
  status: 'passed' | 'failed' | 'timedout' | 'skipped';
  durationMs: number;
  startTime: string;
  endTime: string;
  profile: string;
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
  observations?: {
    locatorState?: {
      exists: boolean; visible: boolean; enabled: boolean;
      receivesPointerEvents: boolean | null; clickable: boolean;
      interceptedBy: string | null; source: string;
    } | null;
    consoleErrors?: string[];
    networkErrors?: Array<{ url?: string; status?: number; detail: string }>;
    summary?: string[];
  };
  diagnosis?: {
    category: string; confidence: number; recommendedStrategy: string;
    rootCause?: string; recommendedAction?: string; locator?: string | null;
    healableByLocatorSwap?: boolean; evidenceBased?: boolean;
  };
  healing?: {
    remedy?: string; attemptedStrategies?: string[]; appliedStrategy?: string | null;
    source?: string | null; brokenLocator?: string | null; newLocator?: string | null;
    candidatesConsidered?: number; reportOnly?: boolean; rationale?: string;
  };
  validation?: {
    reran: boolean; passedAfterHealing?: boolean | null;
    confirmationRuns?: number; durationMs?: number; notes?: string[];
  };
  learning?: {
    recorded: boolean; patternId?: string | null;
    domMemoryUpdated?: boolean; notes?: string[];
  };
}

interface ExecutionPayload { record: ExecutionRecord; timeline: TimelineEvent[]; }

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
        <Link href="/healings" className="text-blue-400 hover:text-blue-300 text-sm">← Back to Healings</Link>
      </div>
    );
  }

  const { record, timeline } = data;
  const pill = STATUS_PILL[record.status] ?? STATUS_PILL.failed;
  const PillIcon = pill.icon;
  const meta = record.artifacts?.metadata ?? {};

  return (
    <div className="space-y-6 max-w-5xl">
      <Link href="/healings" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
        <ArrowLeft size={16} /> Back to Healings
      </Link>

      {/* Header */}
      <div className="rounded-xl border border-[#1e293b] bg-[#1e293b]/30 p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Execution</h1>
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

      {/* Validation */}
      {record.validation?.reran && <ValidationCard v={record.validation} />}

      {/* Learning */}
      {record.learning && <LearningCard l={record.learning} />}
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
  const obs = record.observations ?? {};
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
