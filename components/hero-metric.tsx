'use client';
import { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { Zap, Brain, TrendingUp } from 'lucide-react';

interface HeroMetricProps {
  aiCallsPrevented: number;
  ruleEngineCount: number;
  patternEngineCount: number;
  aiEngineCount: number;
  totalHealings: number;
}

export function HeroMetric({ aiCallsPrevented, ruleEngineCount, patternEngineCount, aiEngineCount, totalHealings }: HeroMetricProps) {
  const { ref, inView } = useInView({ triggerOnce: true });
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const target = aiCallsPrevented ?? 0;
    const duration = 1500;
    const start = Date.now();
    const timer = setInterval(() => {
      const p = Math.min((Date.now() - start) / duration, 1);
      setAnimatedValue(target * (1 - Math.pow(1 - p, 4)));
      if (p >= 1) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [inView, aiCallsPrevented]);

  const safeTotal = totalHealings || 1;
  const rulePercent = ((ruleEngineCount ?? 0) / safeTotal * 100);
  const patternPercent = ((patternEngineCount ?? 0) / safeTotal * 100);
  const aiPercent = ((aiEngineCount ?? 0) / safeTotal * 100);

  return (
    <div
      ref={ref}
      className="relative rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-[#0f172a] to-blue-500/5 p-6 overflow-hidden"
    >
      {/* Glow effect */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

      <div className="relative flex flex-col lg:flex-row items-start lg:items-center gap-6">
        {/* Left: Hero Number */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10">
              <Zap size={16} className="text-emerald-400" />
            </div>
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              AI Calls Prevented
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">
              Hero KPI
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl lg:text-6xl font-bold font-mono text-emerald-400 tracking-tight">
              {animatedValue?.toFixed?.(1) ?? '0'}%
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-2">
            of healings resolved <span className="text-white font-medium">without any AI tokens</span> — using deterministic rules and learned patterns
          </p>
        </div>

        {/* Right: Breakdown */}
        <div className="flex-shrink-0 w-full lg:w-80">
          <div className="space-y-3">
            {/* Rule Engine */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Rule Engine
                  <span className="text-[10px] text-slate-500">(0 tokens)</span>
                </span>
                <span className="text-xs font-mono text-emerald-400">{rulePercent?.toFixed?.(0) ?? '0'}%</span>
              </div>
              <div className="h-2 bg-[#1e293b] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-1000"
                  style={{ width: inView ? `${rulePercent}%` : '0%' }}
                />
              </div>
            </div>

            {/* Pattern Engine */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  Pattern Engine
                  <span className="text-[10px] text-slate-500">(0 tokens)</span>
                </span>
                <span className="text-xs font-mono text-blue-400">{patternPercent?.toFixed?.(0) ?? '0'}%</span>
              </div>
              <div className="h-2 bg-[#1e293b] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-1000"
                  style={{ width: inView ? `${patternPercent}%` : '0%' }}
                />
              </div>
            </div>

            {/* AI Engine */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  AI Engine
                  <span className="text-[10px] text-slate-500">(costs tokens)</span>
                </span>
                <span className="text-xs font-mono text-amber-400">{aiPercent?.toFixed?.(0) ?? '0'}%</span>
              </div>
              <div className="h-2 bg-[#1e293b] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-1000"
                  style={{ width: inView ? `${aiPercent}%` : '0%' }}
                />
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-[#1e293b] flex items-center gap-2">
            <Brain size={14} className="text-slate-500" />
            <p className="text-[11px] text-slate-500">
              System intelligence increases as Pattern Engine learns more fixes
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
