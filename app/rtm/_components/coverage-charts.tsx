'use client';

import { Card } from '@/components/ui/card';
import { BarChart3, PieChart } from 'lucide-react';

/* Matches backend rtm-service getStatistics() shapes */
export interface CategoryStat {
  category: string | null;
  total: number;
  covered: number;
  passed: number;
  avg_coverage: number;
}

export interface PriorityStat {
  priority: string | null;
  total: number;
  covered: number;
  passed: number;
  avg_coverage: number;
}

export interface RtmStatistics {
  by_category: CategoryStat[];
  by_priority: PriorityStat[];
  trends: { date: string; requirements_created: number; requirements_covered: number }[];
}

const PRIORITY_COLORS: Record<string, string> = {
  Critical: 'bg-red-500',
  High: 'bg-orange-500',
  Medium: 'bg-yellow-500',
  Low: 'bg-blue-500',
};

function pct(part: number, total: number): number {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function HBar({ label, covered, total, colorClass }: { label: string; covered: number; total: number; colorClass: string }) {
  const coveragePct = pct(covered, total);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-200 font-medium">{label || 'Uncategorized'}</span>
        <span className="text-slate-400">
          {covered}/{total} <span className="text-slate-500">({coveragePct}%)</span>
        </span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-slate-700/60 overflow-hidden">
        <div className={`h-full rounded-full ${colorClass} transition-all`} style={{ width: `${coveragePct}%` }} />
      </div>
    </div>
  );
}

export default function CoverageCharts({ stats, loading }: { stats: RtmStatistics | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <Card key={i} className="bg-[#1a1f2e] border-slate-700 p-6 animate-pulse h-64" />
        ))}
      </div>
    );
  }

  if (!stats || (stats.by_category.length === 0 && stats.by_priority.length === 0)) {
    return (
      <Card className="bg-[#1a1f2e] border-slate-700 p-10 text-center">
        <BarChart3 className="mx-auto h-10 w-10 text-slate-600" />
        <p className="mt-3 text-slate-400">No analytics data available yet.</p>
        <p className="text-sm text-slate-500">Add requirements and link test cases to populate coverage analytics.</p>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Coverage by Category */}
      <Card className="bg-[#1a1f2e] border-slate-700 p-6">
        <div className="mb-5 flex items-center gap-2">
          <PieChart className="h-5 w-5 text-violet-400" />
          <h3 className="text-base font-semibold text-white">Coverage by Category</h3>
        </div>
        <div className="space-y-4">
          {stats.by_category.length === 0 ? (
            <p className="text-sm text-slate-500">No category data.</p>
          ) : (
            stats.by_category.map((c, i) => (
              <HBar
                key={`${c.category}-${i}`}
                label={c.category || 'Uncategorized'}
                covered={c.covered}
                total={c.total}
                colorClass="bg-violet-500"
              />
            ))
          )}
        </div>
      </Card>

      {/* Coverage by Priority */}
      <Card className="bg-[#1a1f2e] border-slate-700 p-6">
        <div className="mb-5 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-violet-400" />
          <h3 className="text-base font-semibold text-white">Coverage by Priority</h3>
        </div>
        <div className="space-y-4">
          {stats.by_priority.length === 0 ? (
            <p className="text-sm text-slate-500">No priority data.</p>
          ) : (
            stats.by_priority.map((p, i) => (
              <HBar
                key={`${p.priority}-${i}`}
                label={p.priority || 'Unspecified'}
                covered={p.covered}
                total={p.total}
                colorClass={PRIORITY_COLORS[p.priority || ''] || 'bg-blue-500'}
              />
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
