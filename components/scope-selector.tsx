'use client';

/**
 * ScopeSelector — the single global "what am I looking at?" control.
 * ==================================================================
 * Lives in the GlobalContextBar and replaces the ad-hoc 7d/14d/30d/90d filters
 * that used to live on individual dashboards. Changing it once re-scopes the
 * whole product. Four modes:
 *
 *   • Current Sprint       — bound to the active sprint
 *   • Current Environment  — everything in the active environment (no time bound)
 *   • Custom Time Range    — an explicit start/end window
 *   • External Release     — a release ref from Jira / GitHub / Git / Azure.
 *                            Provider resolution is Phase 4, so the providers
 *                            render as "Soon" and are not yet selectable.
 */

import { useRef, useState } from 'react';
import {
  useWorkspaceScope,
  useProjectSprints,
  SCOPE_LABELS,
  EXTERNAL_PROVIDER_LABELS,
  type ScopeMode,
  type ExternalProvider,
  type WorkspaceScope,
} from '@/lib/workspace-context';
import { Telescope, ChevronDown, Check, Rocket, MapPin, CalendarRange, GitBranch, type LucideIcon } from 'lucide-react';
import { AnchoredMenu } from '@/components/ui/anchored-menu';

const MODE_ICONS: Record<ScopeMode, LucideIcon> = {
  current_sprint: Rocket,
  current_environment: MapPin,
  custom_range: CalendarRange,
  external_release: GitBranch,
};

const MODE_HINTS: Record<ScopeMode, string> = {
  current_sprint: 'Scope data to the active sprint',
  current_environment: 'Everything in the active environment',
  custom_range: 'Pick an explicit start / end date',
  external_release: 'A release from Jira, GitHub, Git or Azure',
};

const PROVIDER_ORDER: ExternalProvider[] = ['jira_version', 'github_release', 'git_tag', 'azure_release'];

/** Short label for the button, e.g. "Custom · Mar 1 – Mar 14". */
function buttonLabel(scope: WorkspaceScope, sprintName: string | null): string {
  switch (scope.mode) {
    case 'current_sprint':
      return sprintName ? `Sprint · ${sprintName}` : SCOPE_LABELS.current_sprint;
    case 'current_environment':
      return SCOPE_LABELS.current_environment;
    case 'custom_range':
      if (scope.start && scope.end) return `Custom · ${scope.start} – ${scope.end}`;
      return SCOPE_LABELS.custom_range;
    case 'external_release':
      return scope.ref ? `Release · ${scope.ref}` : SCOPE_LABELS.external_release;
    default:
      return 'Scope';
  }
}

export function ScopeSelector({ compact = false }: { compact?: boolean }) {
  const { scope, setScope } = useWorkspaceScope();
  const { activeSprint } = useProjectSprints();
  const [open, setOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(scope.mode === 'custom_range');
  const [customStart, setCustomStart] = useState(scope.start ?? '');
  const [customEnd, setCustomEnd] = useState(scope.end ?? '');
  const btnRef = useRef<HTMLButtonElement>(null);

  const ActiveIcon = MODE_ICONS[scope.mode] || Telescope;

  function choose(mode: ScopeMode) {
    if (mode === 'custom_range') { setShowCustom(true); return; }
    setShowCustom(false);
    setScope({ mode });
    setOpen(false);
  }

  function applyCustom() {
    if (!customStart || !customEnd) return;
    setScope({ mode: 'custom_range', start: customStart, end: customEnd });
    setOpen(false);
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen(!open)}
        title={`Scope (what am I looking at?): ${buttonLabel(scope, activeSprint?.name ?? null)}`}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-200 bg-[#1e293b] hover:bg-[#283548] border border-[#334155] transition-all max-w-[240px]"
      >
        <ActiveIcon size={13} className="text-sky-400 flex-shrink-0" />
        <span className="truncate flex-1 text-left">{buttonLabel(scope, activeSprint?.name ?? null)}</span>
        <ChevronDown size={13} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnchoredMenu open={open} onClose={() => setOpen(false)} anchorRef={btnRef} width={288}>
        <div className="px-3 py-2 border-b border-[#1e293b]">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-400">Scope</p>
          <p className="text-[10px] text-slate-500 leading-tight mt-0.5">One global filter — every dashboard reads it.</p>
        </div>

        {(['current_sprint', 'current_environment', 'custom_range', 'external_release'] as ScopeMode[]).map((mode) => {
          const Icon = MODE_ICONS[mode];
          const selected = scope.mode === mode;
          const isExternal = mode === 'external_release';
          return (
            <div key={mode}>
              <button
                onClick={() => !isExternal && choose(mode)}
                disabled={isExternal}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs transition-colors ${
                  selected ? 'bg-sky-500/10 text-sky-400' : 'text-slate-300 hover:bg-[#1e293b]'
                } ${isExternal ? 'cursor-not-allowed opacity-70' : ''}`}
              >
                <Icon size={13} className="flex-shrink-0 text-slate-400" />
                <span className="flex flex-col items-start flex-1 min-w-0">
                  <span className="truncate w-full text-left">{SCOPE_LABELS[mode]}</span>
                  <span className="text-[9px] text-slate-500">{MODE_HINTS[mode]}</span>
                </span>
                {isExternal && (
                  <span className="text-[8px] px-1 py-0.5 rounded bg-slate-500/15 text-slate-400 flex-shrink-0 uppercase tracking-wide">Soon</span>
                )}
                {selected && !isExternal && <Check size={12} className="text-sky-400 flex-shrink-0" />}
              </button>

              {/* Custom range date inputs */}
              {mode === 'custom_range' && showCustom && (
                <div className="px-3 py-2 bg-[#0b1220] border-y border-[#1e293b] space-y-2">
                  <label className="block text-[9px] uppercase tracking-wider text-slate-500">
                    Start
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="mt-0.5 w-full rounded bg-[#1e293b] border border-[#334155] px-2 py-1 text-xs text-slate-200"
                    />
                  </label>
                  <label className="block text-[9px] uppercase tracking-wider text-slate-500">
                    End
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="mt-0.5 w-full rounded bg-[#1e293b] border border-[#334155] px-2 py-1 text-xs text-slate-200"
                    />
                  </label>
                  <button
                    onClick={applyCustom}
                    disabled={!customStart || !customEnd}
                    className="w-full rounded bg-sky-500/15 text-sky-400 border border-sky-500/20 py-1 text-xs font-medium hover:bg-sky-500/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Apply range
                  </button>
                </div>
              )}

              {/* External providers (Phase 4 — disabled placeholders) */}
              {isExternal && (
                <div className="px-3 pb-2 bg-[#0b1220] border-b border-[#1e293b]">
                  {PROVIDER_ORDER.map((p) => (
                    <div key={p} className="flex items-center gap-2 px-2 py-1.5 text-[11px] text-slate-500">
                      <span className="w-1 h-1 rounded-full bg-slate-600 flex-shrink-0" />
                      <span className="flex-1">{EXTERNAL_PROVIDER_LABELS[p]}</span>
                      <span className="text-[8px] px-1 py-0.5 rounded bg-slate-500/10 text-slate-500 uppercase tracking-wide">Soon</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </AnchoredMenu>
    </>
  );
}
