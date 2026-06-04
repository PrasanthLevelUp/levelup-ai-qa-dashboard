'use client';

import { useState } from 'react';
import { useProjectContext, TimeRange } from '@/lib/workspace-context';
import { CalendarRange, ChevronDown, Check } from 'lucide-react';

const PRESETS: { value: string; label: string }[] = [
  { value: 'sprint', label: 'Current Sprint' },
  { value: 'last_7_days', label: 'Last 7 days' },
  { value: 'last_30_days', label: 'Last 30 days' },
  { value: 'last_90_days', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
  { value: 'custom', label: 'Custom range' },
];

function labelFor(range: TimeRange): string {
  const preset = PRESETS.find((p) => p.value === range.value);
  if (range.value === 'custom' && range.start && range.end) {
    return `${range.start} → ${range.end}`;
  }
  return preset?.label || 'Current Sprint';
}

export function TimeRangeSelector() {
  const { timeRange, setTimeRange } = useProjectContext();
  const [open, setOpen] = useState(false);
  const [customStart, setCustomStart] = useState(timeRange.start || '');
  const [customEnd, setCustomEnd] = useState(timeRange.end || '');

  const applyCustom = () => {
    if (customStart && customEnd) {
      setTimeRange({ value: 'custom', start: customStart, end: customEnd });
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-200 bg-[#1e293b] hover:bg-[#283548] border border-[#334155] transition-all max-w-[220px]"
      >
        <CalendarRange size={13} className="text-amber-400 flex-shrink-0" />
        <span className="truncate flex-1 text-left">{labelFor(timeRange)}</span>
        <ChevronDown size={13} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-60 bg-[#0f1729] border border-[#334155] rounded-lg shadow-xl">
            {PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => {
                  if (p.value === 'custom') return; // handled below
                  setTimeRange({ value: p.value });
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs transition-colors ${
                  timeRange.value === p.value ? 'bg-amber-500/10 text-amber-400' : 'text-slate-300 hover:bg-[#1e293b]'
                } ${p.value === 'custom' ? 'cursor-default hover:bg-transparent' : ''}`}
              >
                <span className="truncate flex-1 text-left">{p.label}</span>
                {timeRange.value === p.value && p.value !== 'custom' && <Check size={12} className="text-amber-400" />}
              </button>
            ))}
            <div className="border-t border-[#1e293b] p-3 space-y-2">
              <div className="text-[10px] uppercase tracking-wide text-slate-500">Custom range</div>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full px-2 py-1.5 rounded bg-[#1e293b] border border-[#334155] text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
              />
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full px-2 py-1.5 rounded bg-[#1e293b] border border-[#334155] text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
              />
              <button
                onClick={applyCustom}
                disabled={!customStart || !customEnd}
                className="w-full px-2 py-1.5 rounded text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-all disabled:opacity-40"
              >
                Apply
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
