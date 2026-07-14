'use client';

/**
 * Workspace Context (Phase 1 Foundation)
 * ======================================
 * Layered on top of the existing ProjectProvider (`@/lib/project-context`),
 * this provider tracks the active **environment**, **sprint** and **time range**
 * for the currently-selected project and exposes them through three focused
 * hooks:
 *   • useProjectEnvironments() — environments list + active environment
 *   • useProjectSprints()      — sprints list + current/active sprint + progress
 *   • useProjectContext()      — the unified slice (env + sprint + time range +
 *                                quick stats + the workspace request headers)
 *
 * Selections persist to localStorage (per project) for instant restore and are
 * best-effort synced to the backend (`/api/users/me/context/:projectId`) so the
 * choice follows the user across devices. Everything degrades gracefully when a
 * project has no environments/sprints yet (backward compatible).
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useProject } from './project-context';

export interface ProjectEnvironment {
  id: number;
  project_id: number;
  name: string;
  base_url: string | null;
  description: string | null;
  environment_type: string;
  is_default: boolean;
  is_active: boolean;
  health_status: string | null;
  last_health_check_at: string | null;
}

export interface ProjectSprint {
  id: number;
  project_id: number;
  name: string;
  sprint_type: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  is_current: boolean;
  goals: string | null;
}

export interface SprintProgress {
  sprintId: number;
  name: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  totalDays: number | null;
  elapsedDays: number | null;
  remainingDays: number | null;
  percentComplete: number | null;
  isOverdue: boolean;
}

export interface QuickStats {
  healingSuccessRate: number | null;
  passed: number;
  failed: number;
  testExecutions: number;
  riskGrade: string | null;
}

export interface TimeRange {
  value: string; // 'sprint' | 'last_7_days' | 'last_30_days' | 'all' | 'custom'
  start?: string | null;
  end?: string | null;
}

/**
 * Workspace Scope — the single global "what am I looking at?" selector.
 * ====================================================================
 * Replaces per-page 7d/14d/30d/90d filters with ONE control in the context
 * bar. Every dashboard reads the same scope, so changing it once re-scopes the
 * whole product. Environment is always present; the scope answers *how* to
 * bound the data on top of the active Project + Environment (+ optional Sprint).
 *
 *   • current_sprint       — bound to the active sprint
 *   • current_environment  — everything in the active environment (no time bound)
 *   • custom_range         — an explicit start/end date window
 *   • external_release     — a release ref owned by an external provider
 *                            (Jira Version / GitHub Release / Git Tag / Azure).
 *                            Provider resolution is Phase 4 — the modes render
 *                            but are not yet wired to live data.
 */
export type ScopeMode = 'current_sprint' | 'current_environment' | 'custom_range' | 'external_release';
export type ExternalProvider = 'jira_version' | 'github_release' | 'git_tag' | 'azure_release';

export interface WorkspaceScope {
  mode: ScopeMode;
  start?: string | null;              // custom_range
  end?: string | null;                // custom_range
  provider?: ExternalProvider | null; // external_release
  ref?: string | null;                // external_release — the version/tag/release id
}

const DEFAULT_SCOPE: WorkspaceScope = { mode: 'current_sprint' };

/**
 * Encode a scope into the backend's free-form `time_range` VARCHAR so it
 * persists through the EXISTING /api/users/me/context route with no schema
 * change. custom_range carries dates via time_range_start/end; external_release
 * packs provider+ref into the string ("external:jira_version:v3.2").
 */
function encodeScope(scope: WorkspaceScope): string {
  if (scope.mode === 'external_release') {
    return `external:${scope.provider ?? ''}:${scope.ref ?? ''}`;
  }
  return scope.mode;
}

/** Inverse of encodeScope — tolerant of legacy time_range values. */
function decodeScope(raw: string | null, start?: string | null, end?: string | null): WorkspaceScope {
  if (!raw) return { ...DEFAULT_SCOPE };
  if (raw.startsWith('external:')) {
    const [, provider, ref] = raw.split(':');
    return { mode: 'external_release', provider: (provider || null) as ExternalProvider | null, ref: ref || null };
  }
  switch (raw) {
    case 'current_sprint':
    case 'sprint':
      return { mode: 'current_sprint' };
    case 'current_environment':
    case 'all':
      return { mode: 'current_environment' };
    case 'custom_range':
    case 'custom':
      return { mode: 'custom_range', start: start ?? null, end: end ?? null };
    // Legacy fixed windows collapse onto a custom range so nothing breaks.
    case 'last_7_days':
    case 'last_30_days':
      return { mode: 'current_environment' };
    default:
      return { ...DEFAULT_SCOPE };
  }
}

/** Derive the legacy TimeRange shape from a scope for backward-compat consumers. */
function scopeToTimeRange(scope: WorkspaceScope): TimeRange {
  switch (scope.mode) {
    case 'current_sprint':      return { value: 'sprint' };
    case 'current_environment': return { value: 'all' };
    case 'custom_range':        return { value: 'custom', start: scope.start ?? null, end: scope.end ?? null };
    case 'external_release':    return { value: 'all' }; // until provider resolution lands (Phase 4)
    default:                    return { value: 'sprint' };
  }
}

export const SCOPE_LABELS: Record<ScopeMode, string> = {
  current_sprint: 'Current Sprint',
  current_environment: 'Current Environment',
  custom_range: 'Custom Time Range',
  external_release: 'External Release',
};

export const EXTERNAL_PROVIDER_LABELS: Record<ExternalProvider, string> = {
  jira_version: 'Jira Version',
  github_release: 'GitHub Release',
  git_tag: 'Git Tag',
  azure_release: 'Azure DevOps Release',
};

interface WorkspaceContextType {
  // environments
  environments: ProjectEnvironment[];
  activeEnvironment: ProjectEnvironment | null;
  setActiveEnvironment: (env: ProjectEnvironment | null) => void;
  environmentsLoading: boolean;
  refreshEnvironments: () => Promise<void>;
  // sprints
  sprints: ProjectSprint[];
  currentSprint: ProjectSprint | null;
  activeSprint: ProjectSprint | null;
  setActiveSprint: (sprint: ProjectSprint | null) => void;
  sprintProgress: SprintProgress | null;
  sprintsLoading: boolean;
  refreshSprints: () => Promise<void>;
  // scope — the single global "what am I looking at?" selector
  scope: WorkspaceScope;
  setScope: (scope: WorkspaceScope) => void;
  // time range (derived from scope; kept for backward-compat consumers)
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
  // quick stats
  quickStats: QuickStats | null;
  // request headers for downstream fetches
  workspaceHeaders: Record<string, string>;
}

const noop = () => {};
const WorkspaceContext = createContext<WorkspaceContextType>({
  environments: [], activeEnvironment: null, setActiveEnvironment: noop, environmentsLoading: false, refreshEnvironments: async () => {},
  sprints: [], currentSprint: null, activeSprint: null, setActiveSprint: noop, sprintProgress: null, sprintsLoading: false, refreshSprints: async () => {},
  scope: { ...DEFAULT_SCOPE }, setScope: noop,
  timeRange: { value: 'sprint' }, setTimeRange: noop,
  quickStats: null,
  workspaceHeaders: {},
});

const envKey = (pid: number) => `levelup_env_${pid}`;
const sprintKey = (pid: number) => `levelup_sprint_${pid}`;
const rangeKey = (pid: number) => `levelup_timerange_${pid}`;
const scopeKey = (pid: number) => `levelup_scope_${pid}`;

function readLs(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem(key); } catch { return null; }
}
function writeLs(key: string, value: string | null) {
  if (typeof window === 'undefined') return;
  try { value === null ? localStorage.removeItem(key) : localStorage.setItem(key, value); } catch { /* ignore */ }
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { activeProject } = useProject();
  const projectId = activeProject?.id ?? null;

  const [environments, setEnvironments] = useState<ProjectEnvironment[]>([]);
  const [activeEnvironment, setActiveEnvironmentState] = useState<ProjectEnvironment | null>(null);
  const [environmentsLoading, setEnvironmentsLoading] = useState(false);

  const [sprints, setSprints] = useState<ProjectSprint[]>([]);
  const [currentSprint, setCurrentSprint] = useState<ProjectSprint | null>(null);
  const [activeSprint, setActiveSprintState] = useState<ProjectSprint | null>(null);
  const [sprintProgress, setSprintProgress] = useState<SprintProgress | null>(null);
  const [sprintsLoading, setSprintsLoading] = useState(false);

  const [scope, setScopeState] = useState<WorkspaceScope>({ ...DEFAULT_SCOPE });
  const timeRange = useMemo(() => scopeToTimeRange(scope), [scope]);
  const [quickStats, setQuickStats] = useState<QuickStats | null>(null);

  // Avoid syncing to backend before the initial restore completes.
  const restoredRef = useRef(false);

  /* ── Persist + backend sync ─────────────────────────────────────── */
  const syncContext = useCallback((envId: number | null, sprintId: number | null, sc: WorkspaceScope) => {
    if (!projectId) return;
    // Scope persists through the existing route by reusing the free-form
    // `time_range` field — no backend schema change required.
    fetch(`/api/users/me/context/${projectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        environment_id: envId,
        sprint_id: sprintId,
        time_range: encodeScope(sc),
        time_range_start: sc.mode === 'custom_range' ? (sc.start ?? null) : null,
        time_range_end: sc.mode === 'custom_range' ? (sc.end ?? null) : null,
      }),
    }).catch(() => { /* best-effort */ });
  }, [projectId]);

  /* ── Fetch environments ─────────────────────────────────────────── */
  const refreshEnvironments = useCallback(async () => {
    if (!projectId) { setEnvironments([]); setActiveEnvironmentState(null); return; }
    setEnvironmentsLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/environments`, { cache: 'no-store' });
      const data = res.ok ? await res.json() : { environments: [] };
      const list: ProjectEnvironment[] = data.environments || [];
      setEnvironments(list);
      // Restore selection: localStorage → default → first
      const savedId = readLs(envKey(projectId));
      const saved = savedId ? list.find((e) => e.id === parseInt(savedId, 10)) : null;
      const fallback = list.find((e) => e.is_default) || list[0] || null;
      setActiveEnvironmentState(saved || fallback);
    } catch {
      setEnvironments([]);
      setActiveEnvironmentState(null);
    } finally {
      setEnvironmentsLoading(false);
    }
  }, [projectId]);

  /* ── Fetch sprints + current ────────────────────────────────────── */
  const refreshSprints = useCallback(async () => {
    if (!projectId) { setSprints([]); setActiveSprintState(null); setCurrentSprint(null); setSprintProgress(null); return; }
    setSprintsLoading(true);
    try {
      const [listRes, curRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/sprints`, { cache: 'no-store' }),
        fetch(`/api/projects/${projectId}/sprints/current`, { cache: 'no-store' }),
      ]);
      const listData = listRes.ok ? await listRes.json() : { sprints: [] };
      const curData = curRes.ok ? await curRes.json() : { sprint: null, progress: null };
      const list: ProjectSprint[] = listData.sprints || [];
      setSprints(list);
      setCurrentSprint(curData.sprint || null);
      // Restore selection: localStorage → current → first
      const savedId = readLs(sprintKey(projectId));
      const saved = savedId ? list.find((s) => s.id === parseInt(savedId, 10)) : null;
      const fallback = curData.sprint || list[0] || null;
      const chosen = saved || fallback;
      setActiveSprintState(chosen);
      // progress for the chosen sprint (use current's progress if it matches)
      if (chosen && curData.sprint && chosen.id === curData.sprint.id) {
        setSprintProgress(curData.progress || null);
      } else {
        setSprintProgress(null);
      }
    } catch {
      setSprints([]);
      setActiveSprintState(null);
      setCurrentSprint(null);
      setSprintProgress(null);
    } finally {
      setSprintsLoading(false);
    }
  }, [projectId]);

  /* ── Restore saved time range + reload on project change ────────── */
  useEffect(() => {
    restoredRef.current = false;
    if (projectId) {
      // Prefer the new scope key; fall back to the legacy time-range key.
      const savedScope = readLs(scopeKey(projectId));
      if (savedScope) {
        try { setScopeState(JSON.parse(savedScope) as WorkspaceScope); }
        catch { setScopeState({ ...DEFAULT_SCOPE }); }
      } else {
        const legacy = readLs(rangeKey(projectId));
        setScopeState(decodeScope(legacy));
      }
    }
    refreshEnvironments();
    refreshSprints();
    // mark restore done on next tick
    const t = setTimeout(() => { restoredRef.current = true; }, 0);
    return () => clearTimeout(t);
  }, [projectId, refreshEnvironments, refreshSprints]);

  /* ── Fetch quick stats whenever the active sprint changes ───────── */
  useEffect(() => {
    let cancelled = false;
    async function loadStats() {
      if (!projectId || !activeSprint) { setQuickStats(null); return; }
      try {
        const res = await fetch(`/api/projects/${projectId}/sprints/${activeSprint.id}/metrics`, { cache: 'no-store' });
        if (!res.ok) { if (!cancelled) setQuickStats(null); return; }
        const data = await res.json();
        const m = data.metrics || {};
        const total = (m.passed || 0) + (m.failed || 0);
        const passRate = total > 0 ? (m.passed / total) * 100 : null;
        const riskGrade = passRate === null ? null
          : passRate >= 95 ? 'A' : passRate >= 85 ? 'B' : passRate >= 70 ? 'C' : passRate >= 50 ? 'D' : 'F';
        if (!cancelled) {
          setQuickStats({
            healingSuccessRate: m.healingSuccessRate ?? null,
            passed: m.passed || 0,
            failed: m.failed || 0,
            testExecutions: m.testExecutions || 0,
            riskGrade,
          });
        }
      } catch {
        if (!cancelled) setQuickStats(null);
      }
    }
    loadStats();
    return () => { cancelled = true; };
  }, [projectId, activeSprint]);

  /* ── Setters that persist + sync ────────────────────────────────── */
  const setActiveEnvironment = useCallback((env: ProjectEnvironment | null) => {
    setActiveEnvironmentState(env);
    if (projectId) {
      writeLs(envKey(projectId), env ? String(env.id) : null);
      syncContext(env ? env.id : null, activeSprint ? activeSprint.id : null, scope);
    }
  }, [projectId, activeSprint, scope, syncContext]);

  const setActiveSprint = useCallback((sprint: ProjectSprint | null) => {
    setActiveSprintState(sprint);
    if (projectId) {
      writeLs(sprintKey(projectId), sprint ? String(sprint.id) : null);
      syncContext(activeEnvironment ? activeEnvironment.id : null, sprint ? sprint.id : null, scope);
    }
  }, [projectId, activeEnvironment, scope, syncContext]);

  const setScope = useCallback((next: WorkspaceScope) => {
    setScopeState(next);
    if (projectId) {
      writeLs(scopeKey(projectId), JSON.stringify(next));
      // Keep the legacy key roughly in sync for any old reader.
      writeLs(rangeKey(projectId), encodeScope(next));
      syncContext(activeEnvironment ? activeEnvironment.id : null, activeSprint ? activeSprint.id : null, next);
    }
  }, [projectId, activeEnvironment, activeSprint, syncContext]);

  // Backward-compat shim: map a legacy TimeRange write onto the scope model.
  const setTimeRange = useCallback((range: TimeRange) => {
    setScope(decodeScope(range.value, range.start, range.end));
  }, [setScope]);

  const workspaceHeaders = useMemo((): Record<string, string> => {
    const h: Record<string, string> = {};
    if (projectId) h['x-project-id'] = String(projectId);
    if (activeEnvironment) h['x-environment-id'] = String(activeEnvironment.id);
    if (activeSprint) h['x-sprint-id'] = String(activeSprint.id);
    // Scope headers — Phase 3 backend routers read these to bound queries.
    h['x-scope-mode'] = scope.mode;
    if (scope.mode === 'custom_range') {
      if (scope.start) h['x-scope-start'] = scope.start;
      if (scope.end) h['x-scope-end'] = scope.end;
    }
    if (scope.mode === 'external_release') {
      if (scope.provider) h['x-scope-provider'] = scope.provider;
      if (scope.ref) h['x-scope-ref'] = scope.ref;
    }
    return h;
  }, [projectId, activeEnvironment, activeSprint, scope]);

  const value: WorkspaceContextType = {
    environments, activeEnvironment, setActiveEnvironment, environmentsLoading, refreshEnvironments,
    sprints, currentSprint, activeSprint, setActiveSprint, sprintProgress, sprintsLoading, refreshSprints,
    scope, setScope,
    timeRange, setTimeRange,
    quickStats,
    workspaceHeaders,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

/* ── Focused hooks ──────────────────────────────────────────────────── */

export function useWorkspace() {
  return useContext(WorkspaceContext);
}

export function useProjectEnvironments() {
  const c = useContext(WorkspaceContext);
  return {
    environments: c.environments,
    activeEnvironment: c.activeEnvironment,
    setActiveEnvironment: c.setActiveEnvironment,
    loading: c.environmentsLoading,
    refresh: c.refreshEnvironments,
  };
}

export function useProjectSprints() {
  const c = useContext(WorkspaceContext);
  return {
    sprints: c.sprints,
    currentSprint: c.currentSprint,
    activeSprint: c.activeSprint,
    setActiveSprint: c.setActiveSprint,
    progress: c.sprintProgress,
    loading: c.sprintsLoading,
    refresh: c.refreshSprints,
  };
}

export function useProjectContext() {
  return useContext(WorkspaceContext);
}

/** The global scope selector ("what am I looking at?"). */
export function useWorkspaceScope() {
  const c = useContext(WorkspaceContext);
  return { scope: c.scope, setScope: c.setScope };
}

/** Headers (project + environment + sprint) for client-side fetches. */
export function useWorkspaceHeaders(): Record<string, string> {
  return useContext(WorkspaceContext).workspaceHeaders;
}
