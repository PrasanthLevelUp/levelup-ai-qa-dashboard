'use client';
import Link from 'next/link';
import { CheckCircle2, XCircle, ExternalLink, Cpu, Brain, Sparkles } from 'lucide-react';

interface Healing {
  id: number;
  timestamp: string;
  testName: string;
  repository: string;
  failedLocator: string;
  status: string;
  strategy: string;
  confidence: number;
}

const STRATEGY_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  rule_based: { label: 'Rule', color: 'text-emerald-400 bg-emerald-500/10', icon: Cpu },
  pattern_match: { label: 'Pattern', color: 'text-blue-400 bg-blue-500/10', icon: Brain },
  ai: { label: 'AI', color: 'text-amber-400 bg-amber-500/10', icon: Sparkles },
};

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d?.toLocaleString?.('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) ?? iso;
  } catch { return iso ?? ''; }
}

export function RecentHealingsTable({ healings }: { healings: Healing[] }) {
  const safeHealings = healings ?? [];

  if (safeHealings.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-500 text-sm">
        No healing attempts found
      </div>
    );
  }

  return (
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
            <th className="text-center py-3 px-4 text-xs text-slate-500 font-medium uppercase tracking-wider">Details</th>
          </tr>
        </thead>
        <tbody>
          {safeHealings.map((h: Healing) => {
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
  );
}
