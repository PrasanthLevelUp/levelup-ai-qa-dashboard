'use client';
import { DollarSign, TrendingDown, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';

interface CostData {
  traditionalCost: number;
  actualCost: number;
  saved: number;
  percentage: number;
}

export function CostSavingsPanel({ data }: { data: CostData | null }) {
  const safe = data ?? { traditionalCost: 0, actualCost: 0, saved: 0, percentage: 0 };
  const { ref, inView } = useInView({ triggerOnce: true });
  const [animatedPct, setAnimatedPct] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const target = safe.percentage ?? 0;
    const duration = 1200;
    const start = Date.now();
    const timer = setInterval(() => {
      const p = Math.min((Date.now() - start) / duration, 1);
      setAnimatedPct(target * (1 - Math.pow(1 - p, 3)));
      if (p >= 1) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [inView, safe.percentage]);

  return (
    <div ref={ref} className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign size={18} className="text-emerald-400" />
        <h3 className="text-sm font-semibold text-white">Cost Savings</h3>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Traditional AI Cost</span>
          <span className="text-sm font-mono text-slate-300 line-through">${safe.traditionalCost?.toFixed?.(2) ?? '0.00'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">LevelUp AI Cost</span>
          <span className="text-sm font-mono text-emerald-400">${safe.actualCost?.toFixed?.(2) ?? '0.00'}</span>
        </div>
        <div className="h-px bg-[#1e293b]" />
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-white">Total Saved</span>
          <span className="text-xl font-bold font-mono text-emerald-400">${safe.saved?.toFixed?.(2) ?? '0.00'}</span>
        </div>

        {/* Savings bar */}
        <div className="relative h-3 bg-[#1e293b] rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-1000"
            style={{ width: `${Math.min(animatedPct, 100)}%` }}
          />
        </div>
        <div className="text-center">
          <span className="text-2xl font-bold font-mono text-emerald-400">{animatedPct?.toFixed?.(1) ?? '0'}%</span>
          <span className="text-xs text-slate-400 ml-2">cost reduction</span>
        </div>
      </div>
    </div>
  );
}
