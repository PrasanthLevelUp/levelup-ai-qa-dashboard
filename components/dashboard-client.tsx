'use client';
import { useEffect, useState, useCallback } from 'react';
import { Activity, CheckCircle2, Coins, RefreshCw, Zap, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { MetricCard } from '@/components/metric-card';
import { HeroMetric } from '@/components/hero-metric';
import { SuccessTrendChart } from '@/components/charts/success-trend-chart';
import { StrategyPieChart } from '@/components/charts/strategy-pie-chart';
import { CostSavingsPanel } from '@/components/cost-savings-panel';
import { RecentHealingsTable } from '@/components/recent-healings-table';

type Period = '7d' | '30d' | '90d';

export function DashboardClient() {
  const [period, setPeriod] = useState<Period>('7d');
  const [overview, setOverview] = useState<any>(null);
  const [trend, setTrend] = useState<any[]>([]);
  const [strategies, setStrategies] = useState<any[]>([]);
  const [costSavings, setCostSavings] = useState<any>(null);
  const [healings, setHealings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<string>('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, tr, st, cs, hx] = await Promise.all([
        fetch(`/api/stats/overview?period=${period}`).then((r: any) => r?.json?.()),
        fetch(`/api/stats/trend?period=${period}`).then((r: any) => r?.json?.()),
        fetch(`/api/stats/strategies?period=${period}`).then((r: any) => r?.json?.()),
        fetch(`/api/stats/cost-savings?period=${period}`).then((r: any) => r?.json?.()),
        fetch('/api/healings/recent?limit=15').then((r: any) => r?.json?.()),
      ]);
      setOverview(ov ?? null);
      setTrend(tr ?? []);
      setStrategies(st ?? []);
      setCostSavings(cs ?? null);
      setHealings(hx ?? []);
      setLastRefresh(new Date().toLocaleTimeString());
    } catch (err: any) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Compute hero metric data from strategies
  const ruleCount = strategies?.find?.((s: any) => s?.name === 'Rule Engine')?.value ?? 0;
  const patternCount = strategies?.find?.((s: any) => s?.name === 'Pattern Engine')?.value ?? 0;
  const aiCount = strategies?.find?.((s: any) => s?.name === 'AI Engine')?.value ?? 0;
  const totalHealings = ruleCount + patternCount + aiCount;
  const aiCallsPrevented = totalHealings > 0 ? ((ruleCount + patternCount) / totalHealings) * 100 : 0;

  const hasData = !loading && (
    (overview?.totalRuns ?? 0) > 0 ||
    totalHealings > 0 ||
    (trend?.length ?? 0) > 0 ||
    (healings?.length ?? 0) > 0
  );

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
                No test data yet. Trigger your first healing job to start seeing metrics, trends, and AI-powered insights.
                Once your backend processes test runs and healing actions, this dashboard will automatically populate with real-time data.
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
          <h1 className="text-2xl font-bold text-white font-display tracking-tight">
            AI-Powered QA Reliability Platform
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Self-healing test automation performance
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

      {/* Supporting Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          title="Tokens Used"
          value={overview?.totalTokens ?? 0}
          icon={Coins}
          color="amber"
          format="compact"
          trend={overview?.trends?.tokens}
          trendLabel="decreasing is good"
        />
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
              <div className="flex items-center justify-center h-full text-slate-500 text-sm">Loading chart...</div>
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
              <div className="flex items-center justify-center h-full text-slate-500 text-sm">Loading chart...</div>
            ) : (
              <StrategyPieChart data={strategies} />
            )}
          </div>
        </div>
      </div>

      {/* Cost + Recent Healings Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <CostSavingsPanel data={costSavings} />
        </div>
        <div className="lg:col-span-2 rounded-xl border border-[#1e293b] bg-[#1e293b]/30 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                📋 Recent Healing Attempts
              </h3>
              <p className="text-xs text-slate-500 mt-1">Latest test healings with details</p>
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-500 text-sm">Loading...</div>
          ) : (
            <RecentHealingsTable healings={healings} />
          )}
        </div>
      </div>
    </div>
  );
}
