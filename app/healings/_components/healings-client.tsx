'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  HeartPulse, CheckCircle2, XCircle, ExternalLink, Cpu, Brain, Sparkles,
  Search, RefreshCw, TrendingUp, Coins, Zap, Activity,
} from 'lucide-react';
import { useProject } from '@/lib/project-context';

interface Healing {
  id: number;
  executionId?: number | string | null;
  projectId?: number | null;
  timestamp: string;
  testName: string;
  repository: string;
  failedLocator: string;
  healedLocator?: string | null;
  status: string;
  strategy: string;
  confidence: number;
  tokensUsed?: number | null;
  cost?: number | null;
  validationStatus?: string | null;
}

const STRATEGY_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  rule_based: { label: 'Rule', color: 'text-emerald-400 bg-emerald-500/10', icon: Cpu },
  pattern_match: { label: 'Pattern', color: 'text-blue-400 bg-blue-500/10', icon: Brain },
  ai: { label: 'AI', color: 'text-amber-400 bg-amber-500/10', icon: Sparkles },
};

const STRATEGY_FILTERS = [
  { value: 'all', label: 'All Strategies' },
  { value: 'rule_based', label: 'Rule-based' },
  { value: 'pattern_match', label: 'Pattern Match' },
  { value: 'ai', label: 'AI' },
];

const STATUS_FILTERS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'healed', label: 'Healed' },
  { value: 'failed', label: 'Failed' },
];

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d?.toLocaleString?.('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) ?? iso;
  } catch { return iso ?? ''; }
}

function formatCost(cost?: number | null): string {
  const c = cost ?? 0;
  if (c === 0) return '$0.00';
  if (c < 0.01) return `$${c.toFixed(4)}`;
  return `$${c.toFixed(2)}`;
}

export function HealingsClient() {
  const { projects, activeProject } = useProject();

  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [strategyFilter, setStrategyFilter] = useState<string>('all');
  const [searchText, setSearchText] = useState<string>('');
  const [healings, setHealings] = useState<Healing[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Default the project filter to the currently active project once it loads.
  useEffect(() => {
    if (activeProject?.id != null) {
      setProjectFilter(String(activeProject.id));
    }
  }, [activeProject?.id]);

  async function loadHealings() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('limit', '200');
      if (projectFilter !== 'all') params.set('projectId', projectFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/healings/recent?${params.toString()}`);
      if (!res.ok) throw new Error(`Failed to load healings (${res.status})`);
      const data = await res.json();
      setHealings(Array.isArray(data) ? data : (data?.healings ?? []));
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load healings');
      setHealings([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHealings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectFilter, statusFilter]);

  // Client-side strategy + search filtering (server handles project + status).
  const filtered = useMemo(() => {
    const safe = healings ?? [];
    return safe.filter((h) => {
      if (strategyFilter !== 'all' && h?.strategy !== strategyFilter) return false;
      if (searchText.trim()) {
        const q = searchText.trim().toLowerCase();
        const hay = `${h?.testName ?? ''} ${h?.repository ?? ''} ${h?.failedLocator ?? ''} ${h?.healedLocator ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [healings, strategyFilter, searchText]);

  // Diagnostics computed over the filtered set.
  const stats = useMemo(() => {
    const total = filtered.length;
    const healed = filtered.filter((h) => h?.status === 'healed').length;
    const failed = total - healed;
    const successRate = total > 0 ? (healed / total) * 100 : 0;
    const aiCount = filtered.filter((h) => (h?.tokensUsed ?? 0) > 0).length;
    const deterministicCount = total - aiCount;
    const totalTokens = filtered.reduce((acc, h) => acc + (h?.tokensUsed ?? 0), 0);
    const totalCost = filtered.reduce((acc, h) => acc + (h?.cost ?? 0), 0);
    return { total, healed, failed, successRate, aiCount, deterministicCount, totalTokens, totalCost };
  }, [filtered]);

  const selectClass = 'bg-[#0f172a] border border-[#1e293b] text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500/50 hover:border-[#334155] transition-colors';

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <HeartPulse className="text-rose-400" size={26} />
            Healings
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Self-healing activity across your projects with effectiveness diagnostics.
          </p>
        </div>
        <button
          onClick={loadHealings}
          className="inline-flex items-center gap-2 text-sm text-slate-300 bg-[#1e293b] hover:bg-[#334155] px-3 py-2 rounded-lg transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Diagnostic summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wider">
            <Activity size={14} /> Total Attempts
          </div>
          <div className="text-2xl font-bold text-white mt-2">{stats.total}</div>
          <div className="text-xs text-slate-500 mt-1">{stats.healed} healed · {stats.failed} failed</div>
        </div>
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wider">
            <TrendingUp size={14} /> Success Rate
          </div>
          <div className={`text-2xl font-bold mt-2 ${
            stats.successRate >= 90 ? 'text-emerald-400' : stats.successRate >= 70 ? 'text-amber-400' : 'text-red-400'
          }`}>
            {stats.successRate.toFixed(1)}%
          </div>
          <div className="text-xs text-slate-500 mt-1">across current filter</div>
        </div>
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wider">
            <Zap size={14} /> AI vs Deterministic
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            {stats.deterministicCount}<span className="text-slate-500 text-base"> / {stats.aiCount}</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">free fixes / AI-assisted</div>
        </div>
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wider">
            <Coins size={14} /> Token Cost
          </div>
          <div className="text-2xl font-bold text-white mt-2">{formatCost(stats.totalCost)}</div>
          <div className="text-xs text-slate-500 mt-1">{stats.totalTokens.toLocaleString()} tokens</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-4 flex flex-wrap items-center gap-3">
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className={selectClass}
          aria-label="Filter by project"
        >
          <option value="all">All Projects</option>
          {(projects ?? []).map((p) => (
            <option key={p.id} value={String(p.id)}>{p.name}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={selectClass}
          aria-label="Filter by status"
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <select
          value={strategyFilter}
          onChange={(e) => setStrategyFilter(e.target.value)}
          className={selectClass}
          aria-label="Filter by strategy"
        >
          {STRATEGY_FILTERS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search test, repo, or locator..."
            className="w-full bg-[#0f172a] border border-[#1e293b] text-slate-200 text-sm rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500/50 hover:border-[#334155] transition-colors placeholder:text-slate-600"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl overflow-hidden">
        {error ? (
          <div className="flex items-center justify-center py-12 text-red-400 text-sm gap-2">
            <XCircle size={16} /> {error}
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-12 text-slate-500 text-sm gap-2">
            <RefreshCw size={16} className="animate-spin" /> Loading healings…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500 text-sm gap-2">
            <HeartPulse size={28} className="text-slate-700" />
            No healing attempts match your filters
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1e293b]">
                  <th className="text-left py-3 px-4 text-xs text-slate-500 font-medium uppercase tracking-wider">Time</th>
                  <th className="text-left py-3 px-4 text-xs text-slate-500 font-medium uppercase tracking-wider">Test</th>
                  <th className="text-left py-3 px-4 text-xs text-slate-500 font-medium uppercase tracking-wider hidden md:table-cell">Locator</th>
                  <th className="text-center py-3 px-4 text-xs text-slate-500 font-medium uppercase tracking-wider">Status</th>
                  <th className="text-center py-3 px-4 text-xs text-slate-500 font-medium uppercase tracking-wider">Strategy</th>
                  <th className="text-center py-3 px-4 text-xs text-slate-500 font-medium uppercase tracking-wider">Confidence</th>
                  <th className="text-center py-3 px-4 text-xs text-slate-500 font-medium uppercase tracking-wider hidden lg:table-cell">Cost</th>
                  <th className="text-center py-3 px-4 text-xs text-slate-500 font-medium uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((h: Healing) => {
                  const stratConfig = STRATEGY_CONFIG[h?.strategy] ?? STRATEGY_CONFIG.rule_based;
                  const StratIcon = stratConfig?.icon ?? Cpu;
                  const isSuccess = h?.status === 'healed';
                  const conf = (h?.confidence ?? 0) * 100;

                  return (
                    <tr key={h?.id ?? Math.random()} className="border-b border-[#1e293b]/50 hover:bg-[#1e293b]/30 transition-colors">
                      <td className="py-3 px-4 text-xs text-slate-400 font-mono whitespace-nowrap">{formatTime(h?.timestamp ?? '')}</td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-white truncate max-w-[200px]">{h?.testName ?? ''}</div>
                        <div className="text-xs text-slate-500 truncate max-w-[200px]">{h?.repository ?? ''}</div>
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        <code className="text-xs text-slate-400 bg-[#0f172a] px-2 py-1 rounded font-mono truncate block max-w-[180px]">{h?.failedLocator ?? ''}</code>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isSuccess ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-400"><CheckCircle2 size={14} /> Healed</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-red-400"><XCircle size={14} /> Failed</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${stratConfig?.color ?? ''}`}>
                          <StratIcon size={12} />
                          {stratConfig?.label ?? 'Unknown'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`text-xs font-mono font-semibold ${
                          conf >= 90 ? 'text-emerald-400' : conf >= 70 ? 'text-amber-400' : 'text-red-400'
                        }`}>
                          {conf?.toFixed?.(0) ?? '0'}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center hidden lg:table-cell">
                        <span className="text-xs font-mono text-slate-400">{formatCost(h?.cost)}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Link
                          href={`/healings/${h?.id ?? 0}`}
                          className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          <ExternalLink size={12} /> View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
