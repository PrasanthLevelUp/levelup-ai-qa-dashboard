'use client';
import { useEffect, useState } from 'react';
import { BookOpen, Cpu, Brain, Sparkles, CheckCircle2 } from 'lucide-react';

interface Pattern {
  id: number;
  testName: string;
  failedLocator: string;
  healedLocator: string;
  strategy: string;
  confidence: number;
  successCount: number;
  usageCount: number;
  avgTokensSaved: number;
}

const STRAT_ICONS: Record<string, any> = { rule_based: Cpu, pattern_match: Brain, ai: Sparkles };
const STRAT_COLORS: Record<string, string> = { rule_based: 'text-emerald-400', pattern_match: 'text-blue-400', ai: 'text-amber-400' };
const STRAT_LABELS: Record<string, string> = { rule_based: 'Rule Engine', pattern_match: 'Pattern Engine', ai: 'AI Engine' };

export function PatternsClient() {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats/patterns')
      .then((r: any) => r?.json?.())
      .then((data: any) => setPatterns(data ?? []))
      .catch((err: any) => console.error('Patterns error:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white font-display tracking-tight flex items-center gap-2">
          <BookOpen size={24} className="text-blue-400" /> Learned Patterns
        </h1>
        <p className="text-sm text-slate-400 mt-1">Patterns the system has learned from previous healings</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
        </div>
      ) : (patterns ?? []).length === 0 ? (
        <div className="text-center py-20 text-slate-500">No learned patterns yet</div>
      ) : (
        <div className="grid gap-4">
          {(patterns ?? []).map((p: Pattern) => {
            const Icon = STRAT_ICONS[p?.strategy] ?? Cpu;
            return (
              <div key={p?.id ?? Math.random()} className="rounded-xl border border-[#1e293b] bg-[#1e293b]/30 p-5 hover:bg-[#1e293b]/50 transition-all">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-white truncate">{p?.testName ?? ''}</h3>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <span className="text-xs text-red-400 font-medium">Failed Locator</span>
                        <code className="block text-xs font-mono text-slate-400 bg-[#0f172a] px-2 py-1 rounded mt-1 truncate">{p?.failedLocator ?? ''}</code>
                      </div>
                      <div>
                        <span className="text-xs text-emerald-400 font-medium">Healed Locator</span>
                        <code className="block text-xs font-mono text-slate-400 bg-[#0f172a] px-2 py-1 rounded mt-1 truncate">{p?.healedLocator ?? ''}</code>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="text-center">
                      <div className={`flex items-center gap-1 ${STRAT_COLORS[p?.strategy] ?? 'text-slate-400'}`}>
                        <Icon size={14} />
                        <span>{STRAT_LABELS[p?.strategy] ?? 'Unknown'}</span>
                      </div>
                    </div>
                    <div className="text-center">
                      <span className="text-slate-500 block">Confidence</span>
                      <span className="text-white font-mono font-semibold">{((p?.confidence ?? 0) * 100)?.toFixed?.(0) ?? '0'}%</span>
                    </div>
                    <div className="text-center">
                      <span className="text-slate-500 block">Successes</span>
                      <span className="text-emerald-400 font-mono font-semibold flex items-center justify-center gap-1">
                        <CheckCircle2 size={12} /> {p?.successCount ?? 0}
                      </span>
                    </div>
                    <div className="text-center">
                      <span className="text-slate-500 block">Tokens Saved</span>
                      <span className="text-amber-400 font-mono font-semibold">{p?.avgTokensSaved ?? 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
