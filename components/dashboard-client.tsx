'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Activity, CheckCircle2, Coins, RefreshCw, Zap, ArrowRight, DollarSign,
  Wand2, Search, GitBranch, FileCheck2, ShieldCheck, Brain, Repeat,
  Layers, Database, BookOpen, Cpu, Sparkles, Folder,
} from 'lucide-react';
import Link from 'next/link';
import { MetricCard } from '@/components/metric-card';
import { HeroMetric } from '@/components/hero-metric';
import { SuccessTrendChart } from '@/components/charts/success-trend-chart';
import { StrategyPieChart } from '@/components/charts/strategy-pie-chart';
import { CostSavingsPanel } from '@/components/cost-savings-panel';
import { RecentHealingsTable } from '@/components/recent-healings-table';
import { FeatureCard, FeatureColor } from '@/components/showcase/feature-card';
import { ReleaseRiskGauge } from '@/components/showcase/release-risk-gauge';
import { useProject, useProjectHeaders } from '@/lib/project-context';

type Period = '7d' | '30d' | '90d';
const PERIOD_DAYS: Record<Period, number> = { '7d': 7, '30d': 30, '90d': 90 };

/* Skeleton shimmer block */
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-[#1e293b] rounded-lg ${className}`} />;
}

/* Compact number formatter */
function compact(n: number): string {
  const v = Number(n ?? 0);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return `${Math.round(v)}`;
}

export function DashboardClient() {
  const { activeProject, loading: projectLoading } = useProject();
  const projectId = activeProject?.id ?? null;
  const projectHeaders = useProjectHeaders();

  const [period, setPeriod] = useState<Period>('7d');
  const [overview, setOverview] = useState<any>(null);
  const [trend, setTrend] = useState<any[]>([]);
  const [strategies, setStrategies] = useState<any[]>([]);
  const [costSavings, setCostSavings] = useState<any>(null);
  const [healings, setHealings] = useState<any[]>([]);
  const [rtm, setRtm] = useState<any>(null);
  const [coverage, setCoverage] = useState<any>(null);
  const [scripts, setScripts] = useState<any>(null);
  const [releaseRisk, setReleaseRisk] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<string>('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const days = PERIOD_DAYS[period];
    // legacy stats routes are scoped via the projectId query param
    const pid = projectId ? `&projectId=${projectId}` : '';
    // header-scoped proxy routes get the active project via x-project-id
    const h = { headers: projectHeaders };
    const safeJson = (r: any) => (r?.ok ? r.json() : null);
    try {
      const [ov, tr, st, cs, hx, rtmRes, covRes, scrRes, riskRes] = await Promise.all([
        fetch(`/api/stats/overview?period=${period}${pid}`).then(safeJson).catch(() => null),
        fetch(`/api/stats/trend?period=${period}${pid}`).then(safeJson).catch(() => null),
        fetch(`/api/stats/strategies?period=${period}${pid}`).then(safeJson).catch(() => null),
        fetch(`/api/stats/cost-savings?period=${period}${pid}`).then(safeJson).catch(() => null),
        fetch(`/api/healings/recent?limit=12${pid}`).then(safeJson).catch(() => null),
        fetch(`/api/rtm/statistics`, h).then(safeJson).catch(() => null),
        fetch(`/api/test-coverage/stats`, h).then(safeJson).catch(() => null),
        fetch(`/api/scripts/history?limit=1`, h).then(safeJson).catch(() => null),
        fetch(`/api/release-risk?days=${days}`, h).then(safeJson).catch(() => null),
      ]);
      setOverview(ov ?? null);
      setTrend(Array.isArray(tr) ? tr : []);
      setStrategies(Array.isArray(st) ? st : []);
      setCostSavings(cs ?? null);
      setHealings(Array.isArray(hx) ? hx : []);
      setRtm(rtmRes ?? null);
      setCoverage(covRes ?? null);
      setScripts(scrRes ?? null);
      setReleaseRisk(riskRes ?? null);
      setLastRefresh(new Date().toLocaleTimeString());
    } catch (err: any) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [period, projectId, projectHeaders]);

  useEffect(() => {
    if (projectLoading) return;
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData, projectLoading]);

  /* ---- Strategy breakdown (backend returns name as rule_based|pattern_match|ai, with count) ---- */
  const findStrat = (name: string) =>
    Number(strategies?.find?.((s: any) => s?.name === name)?.count ?? 0);
  const ruleCount = findStrat('rule_based');
  const patternCount = findStrat('pattern_match');
  const aiCount = findStrat('ai');
  const totalHealings = ruleCount + patternCount + aiCount;
  const aiCallsPrevented = totalHealings > 0 ? ((ruleCount + patternCount) / totalHealings) * 100 : 0;

  /* ---- Derived feature stats (project-scoped) ---- */
  const rtmCoverage = useMemo(() => {
    const cats: any[] = rtm?.by_category ?? [];
    if (!cats.length) return { pct: 0, total: 0 };
    const total = cats.reduce((s, c) => s + Number(c?.total ?? 0), 0);
    const covered = cats.reduce((s, c) => s + Number(c?.covered ?? 0), 0);
    return { pct: total > 0 ? (covered / total) * 100 : 0, total };
  }, [rtm]);

  const totalTestCases = Number(coverage?.totalTestCases ?? 0);
  const totalScripts = Number(scripts?.pagination?.total ?? scripts?.count ?? 0);
  const costSaved = Number(costSavings?.saved ?? 0);

  const hasData = !loading && (
    (overview?.totalRuns ?? 0) > 0 ||
    totalHealings > 0 ||
    (trend?.length ?? 0) > 0 ||
    (healings?.length ?? 0) > 0 ||
    rtmCoverage.total > 0 ||
    totalTestCases > 0 ||
    totalScripts > 0
  );

  /* ---- Capability showcase cards ---- */
  const capabilities: Array<any> = [
    {
      title: 'Self-Healing Engine', href: '/jobs', icon: Wand2, color: 'emerald' as FeatureColor,
      description: 'Auto-repairs broken locators using rules, learned patterns & AI — keeping suites green.',
      stat: `${(overview?.successRate ?? 0).toFixed?.(1) ?? 0}%`, statLabel: 'success rate',
    },
    {
      title: 'RTM Dashboard', href: '/rtm', icon: GitBranch, color: 'blue' as FeatureColor,
      description: 'Requirements traceability matrix linking requirements to tests with coverage analytics.',
      stat: `${rtmCoverage.pct.toFixed(0)}%`, statLabel: `of ${compact(rtmCoverage.total)} reqs`,
    },
    {
      title: 'Test Coverage Lab', href: '/test-coverage', icon: FileCheck2, color: 'purple' as FeatureColor,
      description: 'AI-generated scenarios & test cases mapped to requirements for full coverage.',
      stat: compact(totalTestCases), statLabel: 'test cases',
    },
    {
      title: 'Script Generation', href: '/scripts', icon: Sparkles, color: 'cyan' as FeatureColor,
      description: 'Generates runnable automation scripts from app exploration & requirements.',
      stat: compact(totalScripts), statLabel: 'scripts',
    },
    {
      title: 'RCA Intelligence', href: '/rca-intelligence', icon: Search, color: 'rose' as FeatureColor,
      description: 'Root-cause analysis clusters failures and surfaces the real reasons tests break.',
    },
    {
      title: 'Release Risk', href: '/release-risk', icon: ShieldCheck, color: 'indigo' as FeatureColor,
      description: 'Quantifies release readiness with a weighted risk score across quality signals.',
    },
    {
      title: 'Learning Engine', href: '/learning', icon: Brain, color: 'amber' as FeatureColor,
      description: 'Continuously learns successful fixes so future healings need zero AI tokens.',
    },
    {
      title: 'Flaky Detection', href: '/flaky', icon: Repeat, color: 'teal' as FeatureColor,
      description: 'Identifies non-deterministic tests and quantifies flakiness to stabilize pipelines.',
    },
  ];

  /* more capabilities — compact navigational pills */
  const moreCapabilities: Array<{ label: string; href: string; icon: any }> = [
    { label: 'Similarity Engine', href: '/similarity', icon: Layers },
    { label: 'DOM Memory', href: '/dom-memory', icon: Database },
    { label: 'App Knowledge', href: '/knowledge', icon: BookOpen },
    { label: 'Repo Intelligence', href: '/repo-intelligence', icon: GitBranch },
    { label: 'Intelligence Hub', href: '/intelligence', icon: Cpu },
    { label: 'Requirements', href: '/requirements', icon: FileCheck2 },
    { label: 'ROI Dashboard', href: '/roi', icon: DollarSign },
    { label: 'Analytics', href: '/analytics', icon: Activity },
  ];

  return (
    <div className="space-y-6">
      {/* Empty State Banner */}
      {!loading && !hasData && (
        <div className="bg-gradient-to-r from-emerald-500/5 via-emerald-500/10 to-blue-500/5 border border-emerald-500/20 rounded-xl p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <Zap size={24} className="text-emerald-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-white mb-1">Welcome to LevelUp AI QA</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                No test data yet for this project. Trigger your first healing job to start seeing metrics, trends, and AI-powered insights.
                Explore the platform capabilities below — once your backend processes test runs, this dashboard populates with real-time data.
              </p>
            </div>
            <Link
              href="/jobs"
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors flex-shrink-0"
            >
              <ArrowRight size={14} />
              Go to Healing Jobs
            </Link>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white font-display tracking-tight">
              AI-Powered QA Reliability Platform
            </h1>
            {activeProject && (
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Folder size={12} />
                {activeProject.name}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 mt-1">
            One intelligent platform for self-healing, root-cause analysis, traceability & release confidence
            {lastRefresh && <span className="ml-2 text-xs text-slate-500">· Updated {lastRefresh}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-[#1e293b] rounded-lg p-1">
            {(['7d', '30d', '90d'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  period === p
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-lg bg-[#1e293b] text-slate-400 hover:text-white transition-colors disabled:opacity-50"
            aria-label="Refresh"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* HERO METRIC - AI Calls Prevented */}
      <HeroMetric
        aiCallsPrevented={aiCallsPrevented}
        ruleEngineCount={ruleCount}
        patternEngineCount={patternCount}
        aiEngineCount={aiCount}
        totalHealings={totalHealings}
      />

      {/* Headline KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Test Runs"
          value={overview?.totalRuns ?? 0}
          icon={Activity}
          color="purple"
          trend={overview?.trends?.runs}
          trendLabel={`vs prev ${period}`}
        />
        <MetricCard
          title="Healing Success Rate"
          value={overview?.successRate ?? 0}
          icon={CheckCircle2}
          color="emerald"
          format="percent"
          trend={overview?.trends?.success}
          trendLabel={`vs prev ${period}`}
        />
        <MetricCard
          title="Cost Saved"
          value={costSaved}
          icon={DollarSign}
          color="emerald"
          format="compact"
          prefix="$"
          trend={overview?.trends?.savings}
          trendLabel="vs traditional AI"
        />
        <MetricCard
          title="Tokens Used"
          value={overview?.totalTokens ?? 0}
          icon={Coins}
          color="amber"
          format="compact"
          trend={overview?.trends?.tokens}
          trendLabel="lower is better"
        />
      </div>

      {/* PLATFORM CAPABILITIES SHOWCASE */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Sparkles size={18} className="text-emerald-400" />
              Platform Capabilities
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              A complete AI-powered QA suite — every module works together on your active project
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {capabilities.map((c) => (
            <FeatureCard
              key={c.title}
              title={c.title}
              description={c.description}
              icon={c.icon}
              href={c.href}
              color={c.color}
              stat={c.stat}
              statLabel={c.statLabel}
              loading={c.stat !== undefined && loading}
            />
          ))}
        </div>

        {/* More capabilities */}
        <div className="flex flex-wrap gap-2 mt-4">
          {moreCapabilities.map((m) => {
            const Icon = m.icon;
            return (
              <Link
                key={m.href}
                href={m.href}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#1e293b]/60 border border-[#1e293b] text-slate-400 hover:text-white hover:border-slate-600 transition-all"
              >
                <Icon size={13} className="text-slate-500" />
                {m.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Success Trend - 2 cols */}
        <div className="lg:col-span-2 rounded-xl border border-[#1e293b] bg-[#1e293b]/30 p-5">
          <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
            📈 Healing Success Trend
          </h3>
          <p className="text-xs text-slate-500 mb-4">Success rate over time — proves the system is getting smarter</p>
          <div className="h-[280px]">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <SuccessTrendChart data={trend} />
            )}
          </div>
        </div>

        {/* Strategy Pie */}
        <div className="rounded-xl border border-[#1e293b] bg-[#1e293b]/30 p-5">
          <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
            ⚙️ Strategy Breakdown
          </h3>
          <p className="text-xs text-slate-500 mb-4">How healings are resolved</p>
          <div className="h-[280px]">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <StrategyPieChart data={strategies} />
            )}
          </div>
        </div>
      </div>

      {/* Insights Row: Cost Savings + Release Readiness + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CostSavingsPanel data={costSavings} />
        <ReleaseRiskGauge data={releaseRisk} loading={loading} />
        <div className="rounded-xl border border-[#1e293b] bg-[#1e293b]/30 p-5 flex flex-col">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Layers size={16} className="text-blue-400" /> Quality Snapshot
          </h3>
          <div className="space-y-3 flex-1">
            <SnapshotRow label="Requirements traced" value={compact(rtmCoverage.total)} accent="text-blue-400" loading={loading} />
            <SnapshotRow label="RTM coverage" value={`${rtmCoverage.pct.toFixed(0)}%`} accent="text-emerald-400" loading={loading} />
            <SnapshotRow label="Test cases generated" value={compact(totalTestCases)} accent="text-purple-400" loading={loading} />
            <SnapshotRow label="Scripts generated" value={compact(totalScripts)} accent="text-cyan-400" loading={loading} />
            <SnapshotRow label="Healings recorded" value={compact(totalHealings)} accent="text-amber-400" loading={loading} />
          </div>
          <Link href="/analytics" className="mt-3 pt-3 border-t border-[#1e293b] text-xs text-blue-400 hover:text-blue-300 inline-flex items-center gap-1">
            View full analytics <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      {/* Recent Healings */}
      <div className="rounded-xl border border-[#1e293b] bg-[#1e293b]/30 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              📋 Recent Healing Attempts
            </h3>
            <p className="text-xs text-slate-500 mt-1">Latest test healings with details</p>
          </div>
          <Link href="/jobs" className="text-xs text-blue-400 hover:text-blue-300 inline-flex items-center gap-1">
            All jobs <ArrowRight size={12} />
          </Link>
        </div>
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : (
          <RecentHealingsTable healings={healings} />
        )}
      </div>
    </div>
  );
}

function SnapshotRow({ label, value, accent, loading }: { label: string; value: string; accent: string; loading?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-400">{label}</span>
      {loading ? (
        <div className="h-4 w-10 animate-pulse bg-[#1e293b] rounded" />
      ) : (
        <span className={`text-sm font-mono font-semibold ${accent}`}>{value}</span>
      )}
    </div>
  );
}
