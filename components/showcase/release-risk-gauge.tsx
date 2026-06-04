'use client';
import Link from 'next/link';
import { ShieldCheck, ArrowUpRight } from 'lucide-react';

interface ReleaseRiskGaugeProps {
  data: {
    overallScore?: number;
    grade?: string;
    recommendation?: string;
    summary?: string;
  } | null;
  loading?: boolean;
}

/* score is 0-100 where higher = more risk */
function gradeColor(grade?: string): { text: string; ring: string; bg: string } {
  switch (grade) {
    case 'A': return { text: 'text-emerald-400', ring: 'stroke-emerald-400', bg: 'bg-emerald-500/10' };
    case 'B': return { text: 'text-teal-400', ring: 'stroke-teal-400', bg: 'bg-teal-500/10' };
    case 'C': return { text: 'text-amber-400', ring: 'stroke-amber-400', bg: 'bg-amber-500/10' };
    case 'D': return { text: 'text-orange-400', ring: 'stroke-orange-400', bg: 'bg-orange-500/10' };
    case 'F': return { text: 'text-red-400', ring: 'stroke-red-400', bg: 'bg-red-500/10' };
    default: return { text: 'text-slate-400', ring: 'stroke-slate-500', bg: 'bg-slate-500/10' };
  }
}

export function ReleaseRiskGauge({ data, loading }: ReleaseRiskGaugeProps) {
  const score = Math.max(0, Math.min(100, Number(data?.overallScore ?? 0)));
  const grade = data?.grade ?? '—';
  const colors = gradeColor(data?.grade);
  // readiness = inverse of risk score
  const readiness = 100 - score;
  const radius = 52;
  const circ = 2 * Math.PI * radius;
  const dash = (readiness / 100) * circ;

  return (
    <div className="rounded-xl border border-[#1e293b] bg-[#1e293b]/30 p-5 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-indigo-400" />
          <h3 className="text-sm font-semibold text-white">Release Readiness</h3>
        </div>
        <Link href="/release-risk" className="text-slate-600 hover:text-slate-300 transition-colors">
          <ArrowUpRight size={16} />
        </Link>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="h-32 w-32 rounded-full animate-pulse bg-[#1e293b]" />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="relative">
            <svg width="140" height="140" className="-rotate-90">
              <circle cx="70" cy="70" r={radius} fill="none" stroke="#1e293b" strokeWidth="10" />
              <circle
                cx="70" cy="70" r={radius} fill="none"
                className={colors.ring}
                strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${dash} ${circ}`}
                style={{ transition: 'stroke-dasharray 1s ease-out' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-4xl font-bold ${colors.text}`}>{grade}</span>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Grade</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 text-center mt-3 leading-relaxed line-clamp-2">
            {data?.recommendation || data?.summary || 'No release risk data for this period.'}
          </p>
          <div className="mt-2 flex items-center gap-1.5">
            <span className={`text-[11px] px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} font-medium`}>
              Risk score {Math.round(score)}/100
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
