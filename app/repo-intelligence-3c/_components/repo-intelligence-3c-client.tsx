'use client';

/**
 * Repository Intelligence — Phase 3C dashboard client.
 *
 * Three feature-flagged panels backed by the `/api/repo-intelligence-3c/*`
 * proxy:
 *   - Health Intelligence: weighted score, sub-score bars, trend, quality issues
 *   - Impact Analysis: "what breaks if I change method X?" blast radius + chains
 *   - Knowledge Graph Lite: D3.js force-directed method/file/test graph
 *
 * When a backend feature flag is OFF the corresponding endpoint returns 404 and
 * this UI shows a clear "feature disabled" notice instead of erroring.
 */

import { useCallback, useEffect, useState } from 'react';
import { useProject } from '@/lib/project-context';
import {
  Activity, AlertTriangle, GitBranch, Network, Loader2, RefreshCw,
  TrendingUp, TrendingDown, Minus, ShieldAlert, Boxes,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip as RTooltip,
} from 'recharts';
import { KnowledgeGraphD3, type D3GraphData } from './knowledge-graph-d3';

interface RepoCtx { id: string; repoId: string; framework: string; }
type Tab = 'health' | 'impact' | 'graph';

const SUBSCORE_COLORS: Record<string, string> = {
  quality: '#38bdf8', coverage: '#34d399', reuse: '#a78bfa',
  complexity: '#fbbf24', duplication: '#f472b6',
};

function gradeColor(grade: string): string {
  switch (grade) {
    case 'A': return '#22c55e';
    case 'B': return '#84cc16';
    case 'C': return '#eab308';
    case 'D': return '#f97316';
    default: return '#ef4444';
  }
}

export function RepoIntelligence3CClient() {
  const { activeProject } = useProject();
  const projectId = activeProject?.id;

  const [contexts, setContexts] = useState<RepoCtx[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [tab, setTab] = useState<Tab>('health');
  const [loading, setLoading] = useState(false);

  const headers = useCallback((): Record<string, string> => {
    return projectId ? { 'x-project-id': String(projectId) } : {};
  }, [projectId]);

  // Load tracked repository contexts (numeric ids power the 3C endpoints).
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/repo-intelligence/list', { headers: headers() });
        const data = await r.json();
        const list: RepoCtx[] = (data.repositories || []).map((c: any) => ({
          id: String(c.id), repoId: c.repoId, framework: c.framework,
        }));
        setContexts(list);
        if (list.length && !selected) setSelected(list[0].id);
      } catch {
        /* ignore */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  return (
    <div className="text-slate-100">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-lg bg-indigo-500/20 p-2"><Boxes className="h-6 w-6 text-indigo-300" /></div>
        <div>
          <h1 className="text-2xl font-bold">Repository Intelligence — Phase 3C</h1>
          <p className="text-sm text-slate-400">Health scoring · Impact analysis · Knowledge graph</p>
        </div>
      </div>

      {/* Context selector */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <label className="text-sm text-slate-400">Repository context</label>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm"
        >
          {contexts.length === 0 && <option value="">No scanned repositories</option>}
          {contexts.map((c) => (
            <option key={c.id} value={c.id}>#{c.id} — {c.repoId} ({c.framework})</option>
          ))}
        </select>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-slate-700">
        {([
          ['health', 'Health', Activity],
          ['impact', 'Impact Analysis', GitBranch],
          ['graph', 'Knowledge Graph', Network],
        ] as Array<[Tab, string, any]>).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition ${
              tab === key ? 'border-b-2 border-indigo-400 text-indigo-300' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {!selected ? (
        <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-8 text-center text-slate-400">
          Scan a repository (with Method Intelligence enabled) to use Phase 3C analytics.
        </div>
      ) : (
        <>
          {tab === 'health' && <HealthPanel contextId={selected} headers={headers} setLoading={setLoading} />}
          {tab === 'impact' && <ImpactPanel headers={headers} setLoading={setLoading} />}
          {tab === 'graph' && <GraphPanel contextId={selected} headers={headers} setLoading={setLoading} />}
        </>
      )}
    </div>
  );
}

/* ----------------------------- Disabled notice ---------------------------- */
function DisabledNotice({ flag }: { flag: string }) {
  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-6 text-amber-200">
      <div className="flex items-center gap-2 font-medium"><ShieldAlert className="h-5 w-5" /> Feature disabled</div>
      <p className="mt-1 text-sm">This panel requires <code className="rounded bg-slate-800 px-1">{flag}=true</code> on the backend. It is OFF by default so the standard product surface is unchanged.</p>
    </div>
  );
}

/* -------------------------------- Health ---------------------------------- */
function HealthPanel({ contextId, headers, setLoading }: {
  contextId: string; headers: () => Record<string, string>; setLoading: (b: boolean) => void;
}) {
  const [health, setHealth] = useState<any>(null);
  const [issues, setIssues] = useState<any[]>([]);
  const [trend, setTrend] = useState<any[]>([]);
  const [disabled, setDisabled] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setDisabled(false);
    try {
      const hr = await fetch(`/api/repo-intelligence-3c/health/${contextId}?persist=true`, { headers: headers() });
      if (hr.status === 404) { setDisabled(true); return; }
      const hd = await hr.json();
      setHealth(hd.health || null);
      const [ir, tr] = await Promise.all([
        fetch(`/api/repo-intelligence-3c/health/${contextId}/issues`, { headers: headers() }).then((r) => r.json()),
        fetch(`/api/repo-intelligence-3c/health/${contextId}/trend?persist=true`, { headers: headers() }).then((r) => r.json()),
      ]);
      setIssues(ir.issues || []);
      setTrend(tr.trend || []);
    } finally {
      setLoading(false);
    }
  }, [contextId, headers, setLoading]);

  useEffect(() => { load(); }, [load]);

  if (disabled) return <DisabledNotice flag="ENABLE_HEALTH_INTELLIGENCE" />;
  if (!health) return <PanelSkeleton />;

  const subData = Object.entries(health.subScores || {}).map(([k, v]) => ({ name: k, value: Number(v) }));

  return (
    <div className="space-y-6">
      <button onClick={load} className="flex items-center gap-2 rounded-md bg-slate-800 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700">
        <RefreshCw className="h-4 w-4" /> Recompute
      </button>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Overall gauge */}
        <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-6 text-center">
          <div className="text-sm text-slate-400">Overall Health</div>
          <div className="my-2 text-5xl font-extrabold" style={{ color: gradeColor(health.grade) }}>
            {Math.round(health.overallScore)}
          </div>
          <div className="inline-block rounded-full px-3 py-1 text-sm font-bold"
            style={{ backgroundColor: `${gradeColor(health.grade)}22`, color: gradeColor(health.grade) }}>
            Grade {health.grade}
          </div>
        </div>
        {/* Totals */}
        <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-6 md:col-span-2">
          <div className="grid grid-cols-3 gap-4 text-center">
            <Stat label="Methods" value={health.totals?.methods ?? 0} />
            <Stat label="Tests" value={health.totals?.tests ?? 0} />
            <Stat label="Dependencies" value={health.totals?.dependencies ?? 0} />
          </div>
        </div>
      </div>

      {/* Sub-scores */}
      <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-6">
        <h3 className="mb-4 text-sm font-semibold text-slate-300">Sub-scores (weighted average → overall)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={subData} layout="vertical" margin={{ left: 30 }}>
            <XAxis type="number" domain={[0, 100]} stroke="#64748b" fontSize={11} />
            <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={12} width={90} />
            <RTooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {subData.map((d) => <Cell key={d.name} fill={SUBSCORE_COLORS[d.name] || '#38bdf8'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Trend */}
      {trend.length > 0 && (
        <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-6">
          <h3 className="mb-3 text-sm font-semibold text-slate-300">Trend (latest vs previous snapshot)</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {trend.map((t: any) => (
              <div key={t.metric} className="flex items-center justify-between rounded-md bg-slate-900/60 px-3 py-2">
                <span className="text-sm capitalize text-slate-300">{t.metric}</span>
                <span className={`flex items-center gap-1 text-sm font-medium ${
                  t.direction === 'up' ? 'text-emerald-400' : t.direction === 'down' ? 'text-rose-400' : 'text-slate-400'
                }`}>
                  {t.direction === 'up' ? <TrendingUp className="h-4 w-4" /> : t.direction === 'down' ? <TrendingDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                  {t.delta > 0 ? '+' : ''}{t.delta}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Issues */}
      <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-6">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-300">
          <AlertTriangle className="h-4 w-4 text-amber-400" /> Code Quality Issues ({issues.length})
        </h3>
        {issues.length === 0 ? (
          <p className="text-sm text-slate-500">No issues detected. 🎉</p>
        ) : (
          <div className="max-h-80 space-y-2 overflow-auto">
            {issues.map((i: any) => (
              <div key={i.id} className="flex items-center justify-between rounded-md bg-slate-900/60 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <span className="font-mono text-slate-200">{i.methodName || '—'}</span>
                  <span className="ml-2 truncate text-xs text-slate-500">{i.filePath}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge text={i.issueType} />
                  <SeverityBadge severity={i.severity} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------- Impact ---------------------------------- */
function ImpactPanel({ headers, setLoading }: {
  headers: () => Record<string, string>; setLoading: (b: boolean) => void;
}) {
  const [methodId, setMethodId] = useState('');
  const [impact, setImpact] = useState<any>(null);
  const [disabled, setDisabled] = useState(false);
  const [searched, setSearched] = useState(false);

  const run = useCallback(async () => {
    if (!methodId) return;
    setLoading(true);
    setDisabled(false);
    setSearched(true);
    try {
      const r = await fetch(`/api/repo-intelligence-3c/impact/method/${methodId}`, { headers: headers() });
      if (r.status === 404) { setDisabled(true); return; }
      const d = await r.json();
      setImpact(d.impact || null);
    } finally {
      setLoading(false);
    }
  }, [methodId, headers, setLoading]);

  if (disabled) return <DisabledNotice flag="ENABLE_IMPACT_ANALYSIS" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-slate-400">Method ID (from the method index)</label>
          <input
            value={methodId}
            onChange={(e) => setMethodId(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="e.g. 42"
            className="mt-1 w-40 rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm"
          />
        </div>
        <button onClick={run} disabled={!methodId}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-40">
          Analyze impact
        </button>
      </div>

      {searched && impact && !impact.method && (
        <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-6 text-slate-400">No method found with that ID.</div>
      )}

      {impact?.method && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-5">
              <div className="text-xs text-slate-400">Changing</div>
              <div className="font-mono text-lg text-indigo-300">{impact.method.methodName}</div>
              <div className="truncate text-xs text-slate-500">{impact.method.filePath}</div>
            </div>
            <Stat label="Blast radius" value={impact.blastRadius} big />
            <Stat label="Max depth" value={impact.maxDepth} big />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <ListCard title={`Affected methods (${impact.affectedMethods.length})`} items={impact.affectedMethods}
              render={(m: any) => (
                <div className="flex items-center justify-between text-sm">
                  <span className="font-mono text-slate-200">{m.methodName}</span>
                  <span className="text-xs text-slate-500">depth {m.depth}</span>
                </div>
              )} />
            <ListCard title={`Breaking tests (${impact.affectedTests.length})`} items={impact.affectedTests}
              accent="rose"
              render={(m: any) => (
                <div className="flex items-center justify-between text-sm">
                  <span className="font-mono text-rose-200">{m.methodName}</span>
                  <span className="truncate text-xs text-slate-500">{m.filePath}</span>
                </div>
              )} />
          </div>

          {impact.dependencyChains?.length > 0 && (
            <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-6">
              <h3 className="mb-3 text-sm font-semibold text-slate-300">Dependency chains (test → … → changed method)</h3>
              <div className="space-y-2">
                {impact.dependencyChains.map((chain: any[], i: number) => (
                  <div key={i} className="flex flex-wrap items-center gap-1 text-sm">
                    {chain.map((step: any, j: number) => (
                      <span key={step.id} className="flex items-center gap-1">
                        <span className="rounded bg-slate-900/70 px-2 py-0.5 font-mono text-xs text-slate-200">{step.methodName}</span>
                        {j < chain.length - 1 && <span className="text-slate-500">→</span>}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* -------------------------------- Graph ----------------------------------- */
function GraphPanel({ contextId, headers, setLoading }: {
  contextId: string; headers: () => Record<string, string>; setLoading: (b: boolean) => void;
}) {
  const [graph, setGraph] = useState<D3GraphData | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [disabled, setDisabled] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setDisabled(false);
    try {
      const r = await fetch(`/api/repo-intelligence-3c/graph/${contextId}?format=d3`, { headers: headers() });
      if (r.status === 404) { setDisabled(true); return; }
      const d = await r.json();
      setGraph(d.graph || { nodes: [], links: [] });
      setStats(d.stats || null);
    } finally {
      setLoading(false);
    }
  }, [contextId, headers, setLoading]);

  useEffect(() => { load(); }, [load]);

  if (disabled) return <DisabledNotice flag="ENABLE_KNOWLEDGE_GRAPH" />;
  if (!graph) return <PanelSkeleton />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
        {stats && (
          <>
            <span><b className="text-slate-200">{stats.nodeCount}</b> nodes</span>
            <span><b className="text-slate-200">{stats.edgeCount}</b> edges</span>
            <span><b className="text-slate-200">{stats.fileCount}</b> files</span>
            <span><b className="text-slate-200">{stats.testCount}</b> tests</span>
          </>
        )}
        <button onClick={load} className="ml-auto flex items-center gap-2 rounded-md bg-slate-800 px-3 py-1.5 text-slate-300 hover:bg-slate-700">
          <RefreshCw className="h-4 w-4" /> Reload
        </button>
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-slate-400">
        <Legend color="#38bdf8" label="method" />
        <Legend color="#a78bfa" label="test" />
        <Legend color="#fbbf24" label="file" />
      </div>
      {graph.nodes.length === 0 ? (
        <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-8 text-center text-slate-400">
          No indexed methods for this context yet.
        </div>
      ) : (
        <KnowledgeGraphD3 data={graph} />
      )}
    </div>
  );
}

/* ------------------------------- Primitives -------------------------------- */
function Stat({ label, value, big }: { label: string; value: number | string; big?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-4 text-center">
      <div className="text-xs text-slate-400">{label}</div>
      <div className={`font-bold text-slate-100 ${big ? 'text-3xl' : 'text-2xl'}`}>{value}</div>
    </div>
  );
}
function Badge({ text }: { text: string }) {
  return <span className="rounded bg-slate-700 px-2 py-0.5 text-xs text-slate-200">{text}</span>;
}
function SeverityBadge({ severity }: { severity: string }) {
  const c = severity === 'high' ? 'bg-rose-500/20 text-rose-300' : severity === 'low' ? 'bg-slate-600/40 text-slate-300' : 'bg-amber-500/20 text-amber-300';
  return <span className={`rounded px-2 py-0.5 text-xs ${c}`}>{severity}</span>;
}
function Legend({ color, label }: { color: string; label: string }) {
  return <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: color }} />{label}</span>;
}
function ListCard({ title, items, render, accent }: {
  title: string; items: any[]; render: (i: any) => React.ReactNode; accent?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-5">
      <h3 className={`mb-3 text-sm font-semibold ${accent === 'rose' ? 'text-rose-300' : 'text-slate-300'}`}>{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">None.</p>
      ) : (
        <div className="max-h-72 space-y-1.5 overflow-auto">
          {items.map((it, idx) => <div key={it.id ?? idx} className="rounded-md bg-slate-900/60 px-3 py-2">{render(it)}</div>)}
        </div>
      )}
    </div>
  );
}
function PanelSkeleton() {
  return (
    <div className="flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800/40 p-12 text-slate-400">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
    </div>
  );
}
