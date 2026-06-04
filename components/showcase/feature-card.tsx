'use client';
import Link from 'next/link';
import { ArrowUpRight, LucideIcon } from 'lucide-react';

export type FeatureColor = 'emerald' | 'blue' | 'amber' | 'purple' | 'rose' | 'cyan' | 'indigo' | 'teal';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  color: FeatureColor;
  /** Primary live stat value (already formatted) — optional */
  stat?: string;
  /** Label below the stat */
  statLabel?: string;
  /** Whether the live stat is still loading */
  loading?: boolean;
}

const COLOR_MAP: Record<FeatureColor, { grad: string; ring: string; text: string; iconBg: string; glow: string }> = {
  emerald: { grad: 'from-emerald-500/10', ring: 'hover:border-emerald-500/40', text: 'text-emerald-400', iconBg: 'bg-emerald-500/10', glow: 'bg-emerald-500/10' },
  blue: { grad: 'from-blue-500/10', ring: 'hover:border-blue-500/40', text: 'text-blue-400', iconBg: 'bg-blue-500/10', glow: 'bg-blue-500/10' },
  amber: { grad: 'from-amber-500/10', ring: 'hover:border-amber-500/40', text: 'text-amber-400', iconBg: 'bg-amber-500/10', glow: 'bg-amber-500/10' },
  purple: { grad: 'from-purple-500/10', ring: 'hover:border-purple-500/40', text: 'text-purple-400', iconBg: 'bg-purple-500/10', glow: 'bg-purple-500/10' },
  rose: { grad: 'from-rose-500/10', ring: 'hover:border-rose-500/40', text: 'text-rose-400', iconBg: 'bg-rose-500/10', glow: 'bg-rose-500/10' },
  cyan: { grad: 'from-cyan-500/10', ring: 'hover:border-cyan-500/40', text: 'text-cyan-400', iconBg: 'bg-cyan-500/10', glow: 'bg-cyan-500/10' },
  indigo: { grad: 'from-indigo-500/10', ring: 'hover:border-indigo-500/40', text: 'text-indigo-400', iconBg: 'bg-indigo-500/10', glow: 'bg-indigo-500/10' },
  teal: { grad: 'from-teal-500/10', ring: 'hover:border-teal-500/40', text: 'text-teal-400', iconBg: 'bg-teal-500/10', glow: 'bg-teal-500/10' },
};

export function FeatureCard({ title, description, icon: Icon, href, color, stat, statLabel, loading }: FeatureCardProps) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.emerald;
  return (
    <Link
      href={href}
      className={`group relative flex flex-col rounded-xl border border-[#1e293b] bg-gradient-to-br ${c.grad} via-[#0f172a] to-[#0f172a] p-5 overflow-hidden transition-all duration-300 ${c.ring} hover:shadow-lg hover:shadow-black/30 hover:-translate-y-0.5`}
    >
      {/* glow */}
      <div className={`absolute -top-8 -right-8 w-28 h-28 ${c.glow} rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

      <div className="relative flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-lg ${c.iconBg}`}>
          <Icon size={20} className={c.text} />
        </div>
        <ArrowUpRight size={16} className="text-slate-600 group-hover:text-slate-300 transition-colors" />
      </div>

      <h3 className="relative text-sm font-semibold text-white mb-1">{title}</h3>
      <p className="relative text-xs text-slate-400 leading-relaxed flex-1">{description}</p>

      {(stat !== undefined || loading) && (
        <div className="relative mt-4 pt-3 border-t border-[#1e293b]">
          {loading ? (
            <div className="h-7 w-20 animate-pulse bg-[#1e293b] rounded-md" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold font-mono tracking-tight ${c.text}`}>{stat}</span>
              {statLabel && <span className="text-[11px] text-slate-500">{statLabel}</span>}
            </div>
          )}
        </div>
      )}
    </Link>
  );
}
