'use client';
import { useEffect, useState, useRef } from 'react';
import { TrendingUp, TrendingDown, LucideIcon } from 'lucide-react';
import { useInView } from 'react-intersection-observer';

interface MetricCardProps {
  title: string;
  value: number;
  suffix?: string;
  trend?: 'up' | 'down';
  trendLabel?: string;
  icon: LucideIcon;
  color: 'emerald' | 'blue' | 'amber' | 'purple';
  format?: 'number' | 'percent' | 'compact';
}

const COLOR_MAP = {
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', icon: 'text-emerald-500' },
  blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', icon: 'text-blue-500' },
  amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', icon: 'text-amber-500' },
  purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400', icon: 'text-purple-500' },
};

function formatValue(value: number, format: string, suffix: string): string {
  if (format === 'percent') return `${value?.toFixed?.(1) ?? '0'}%`;
  if (format === 'compact') {
    if (value >= 1000000) return `${(value / 1000000)?.toFixed?.(1) ?? '0'}M`;
    if (value >= 1000) return `${(value / 1000)?.toFixed?.(1) ?? '0'}K`;
    return `${Math.round(value ?? 0)}`;
  }
  return `${Math.round(value ?? 0)}${suffix}`;
}

export function MetricCard({ title, value, suffix = '', trend, trendLabel, icon: Icon, color, format = 'number' }: MetricCardProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const { ref, inView } = useInView({ triggerOnce: true });
  const colors = COLOR_MAP[color] ?? COLOR_MAP.emerald;

  useEffect(() => {
    if (!inView) return;
    const target = value ?? 0;
    const duration = 1000;
    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(target * eased);
      if (progress >= 1) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [inView, value]);

  return (
    <div
      ref={ref}
      className={`rounded-xl border ${colors.border} ${colors.bg} p-5 transition-all duration-300 hover:shadow-lg hover:shadow-black/20`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</span>
        <div className={`p-2 rounded-lg ${colors.bg}`}>
          <Icon size={16} className={colors.icon} />
        </div>
      </div>
      <div className="flex items-end justify-between">
        <span className={`text-3xl font-bold font-mono tracking-tight ${colors.text}`}>
          {formatValue(displayValue, format ?? 'number', suffix ?? '')}
        </span>
        {trend && (
          <div className={`flex items-center gap-1 text-xs ${
            trend === 'up' ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{trendLabel ?? ''}</span>
          </div>
        )}
      </div>
    </div>
  );
}
