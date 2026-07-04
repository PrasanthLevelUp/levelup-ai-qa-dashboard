/**
 * Intelligence Score Component
 * Phase 5 UI: Displays the Intelligence Orchestrator's grounding score
 * across Test Case Lab, Script Gen, and Healing features.
 * 
 * Shows:
 * - Overall grounded% vs AI% split
 * - Per-source breakdown
 * - Human-readable summary
 */

'use client';

import { Brain, Sparkles, Info } from 'lucide-react';
import { useMemo } from 'react';

export interface IntelligenceScore {
  /** Overall grounding 0-100 (weighted across the sources that returned data). */
  grounded: number;
  /** Share attributed to raw AI generation — the inverse of `grounded`. */
  aiContribution: number;
  /**
   * Per-source grounding breakdown with UI-friendly labels, e.g.
   * `{ 'Repository Match': 95, 'Knowledge Match': 87, 'Pattern Match': 98 }`.
   * Only includes sources that returned usable data.
   */
  bySource: Record<string, number>;
  /** Human-readable one-liner for direct UI display. */
  summary: string;
}

interface IntelligenceScoreProps {
  score: IntelligenceScore;
  /** Optional: show compact view (no source breakdown) */
  compact?: boolean;
  /** Optional: custom title */
  title?: string;
  className?: string;
}

export function IntelligenceScore({ 
  score, 
  compact = false, 
  title = "Intelligence Score",
  className = ""
}: IntelligenceScoreProps) {
  const { grounded, aiContribution, bySource, summary } = score;

  // Sort sources by score (highest first) for the breakdown
  const sortedSources = useMemo(() => {
    return Object.entries(bySource)
      .sort(([, a], [, b]) => b - a)
      .map(([source, value]) => ({ source, value }));
  }, [bySource]);

  // Determine color based on grounded percentage
  const scoreColor = useMemo(() => {
    if (grounded >= 90) return 'emerald'; // Excellent grounding
    if (grounded >= 70) return 'blue';    // Good grounding
    if (grounded >= 50) return 'amber';   // Moderate grounding
    return 'orange';                       // Low grounding
  }, [grounded]);

  const colorClasses = {
    emerald: {
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      bar: 'bg-emerald-500',
      text: 'text-emerald-400',
    },
    blue: {
      badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      bar: 'bg-blue-500',
      text: 'text-blue-400',
    },
    amber: {
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      bar: 'bg-amber-500',
      text: 'text-amber-400',
    },
    orange: {
      badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      bar: 'bg-orange-500',
      text: 'text-orange-400',
    },
  };

  const colors = colorClasses[scoreColor];

  return (
    <div className={`bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Brain className="w-4 h-4 text-violet-400" />
        <h4 className="text-sm font-medium text-slate-200">{title}</h4>
        <div className="group relative">
          <Info className="w-3.5 h-3.5 text-slate-500 cursor-help" />
          <div className="absolute left-0 top-6 w-64 bg-slate-900 border border-slate-700 rounded-md p-2 text-xs text-slate-300 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50">
            Shows how much of this generation was grounded in real intelligence 
            (repository code, app profile, test data, patterns) vs. AI inference.
          </div>
        </div>
      </div>

      {/* Main Score Display */}
      <div className="flex items-center gap-4 mb-3">
        {/* Grounded Badge */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border ${colors.badge}`}>
          <Brain className="w-4 h-4" />
          <span className="text-lg font-bold">{grounded}%</span>
          <span className="text-xs opacity-75">grounded</span>
        </div>

        {/* AI Contribution Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border bg-purple-500/15 text-purple-300 border-purple-500/30">
          <Sparkles className="w-4 h-4" />
          <span className="text-lg font-bold">{aiContribution}%</span>
          <span className="text-xs opacity-75">AI</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative h-2 bg-slate-700/50 rounded-full overflow-hidden mb-3">
        <div 
          className={`absolute left-0 top-0 h-full ${colors.bar} transition-all`}
          style={{ width: `${grounded}%` }}
        />
        <div 
          className="absolute right-0 top-0 h-full bg-purple-500"
          style={{ width: `${aiContribution}%` }}
        />
      </div>

      {/* Summary */}
      <p className="text-xs text-slate-400 mb-3 italic">
        {summary}
      </p>

      {/* Per-Source Breakdown (unless compact mode) */}
      {!compact && sortedSources.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-700/50">
          <div className="text-xs font-medium text-slate-400 mb-2">Source Breakdown:</div>
          <div className="space-y-2">
            {sortedSources.map(({ source, value }) => (
              <div key={source} className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-slate-300 truncate">{source}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="w-16 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${colors.bar}`}
                      style={{ width: `${value}%` }}
                    />
                  </div>
                  <span className={`text-xs font-medium ${colors.text} w-10 text-right`}>
                    {value}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact inline badge version for use in tables or compact spaces
 */
export function IntelligenceScoreBadge({ score }: { score: IntelligenceScore }) {
  const { grounded, aiContribution } = score;
  
  const scoreColor = grounded >= 90 ? 'emerald' : grounded >= 70 ? 'blue' : grounded >= 50 ? 'amber' : 'orange';
  
  const colorClasses = {
    emerald: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    blue: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    amber: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    orange: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  };

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border text-xs ${colorClasses[scoreColor]}`}>
      <Brain className="w-3 h-3" />
      <span className="font-medium">{grounded}%</span>
      <span className="opacity-60">grounded</span>
      <span className="opacity-40">·</span>
      <Sparkles className="w-3 h-3 text-purple-400" />
      <span className="font-medium text-purple-300">{aiContribution}%</span>
      <span className="opacity-60 text-purple-300">AI</span>
    </div>
  );
}
