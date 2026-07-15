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
 * Workspace Time (WHEN) — the single time dimension. "Sprint" is just one kind
 * of time, not a separate hierarchy level. Every mode resolves to a concrete
 * window (start/end) plus an optional sprintId so the transport adapters can
 * emit either a sprint id (header-aware routers) or a date range (query-based
 * slice endpoints) without the page ever knowing which.
 */
export type TimeMode = 'current_sprint' | 'last_7_days' | 'last_14_days' | 'last_30_days' | 'custom';

export interface WorkspaceTime {
  mode: TimeMode;
  start: string | null; // ISO (inclusive) — null when a sprint has no dates
  end: string | null;   // ISO (inclusive)
  sprintId: number | null; // set only in current_sprint mode when a sprint is active
  label: string;        // human label, e.g. "Sprint 24" / "Last 7 Days"
}

/**
 * WorkspaceAdapter — the ONLY place headers / query params are constructed from
 * Workspace state. Pages call `toHeaders()` or `toQuery()` depending on the
 * backend contract they already consume; they never hand-build either. Keeping
 * both here means a future dashboard-API migration removes the query adapter
 * without touching a single page.
 */
export interface WorkspaceAdapter {
  /**
   * Header transport (for the ~20 routers behind contextMiddleware). Emits
   * x-project-id / x-environment-id and EITHER x-sprint-id (sprint mode) OR
   * x-date-start / x-date-end (date modes). Set includeEnvironment=false for
   * pages whose data has no environment dimension (e.g. Executions).
   */
  toHeaders: (opts?: { includeEnvironment?: boolean }) => Record<string, string>;
  /**
   * Query transport (for the query-based dashboard / rca slice endpoints).
   * Always resolves Time to startDate/endDate (sprint → its date window).
   */
  toQuery: (opts?: { includeEnvironment?: boolean }) => Record<string, string>;
}

const DAYS_BY_MODE: Partial<Record<TimeMode, number>> = {
  last_7_days: 7,
  last_14_days: 14,
  last_30_days: 30,
};

export const TIME_MODE_LABELS: Record<TimeMode, string> = {
  current_sprint: 'Current Sprint',
  last_7_days: 'Last 7 Days',
  last_14_days: 'Last 14 Days',
  last_30_days: 'Last 30 Days',
  custom: 'Custom Range',
};

/** Resolve a TimeMode (+ active sprint / custom range) into a concrete window. */
function computeTimeWindow(
  mode: TimeMode,
  activeSprint: ProjectSprint | null,
  custom: { start: string | null; end: string | null },
): WorkspaceTime {
  if (mode === 'current_sprint') {
    return {
      mode,
      start: activeSprint?.start_date ?? null,
      end: activeSprint?.end_date ?? null,
      sprintId: activeSprint?.id ?? null,
      label: activeSprint?.name ?? 'Current Sprint',
    };
  }
  if (mode === 'custom') {
    return { mode, start: custom.start, end: custom.end, sprintId: null, label: 'Custom Range' };
  }
  const days = DAYS_BY_MODE[mode] ?? 30;
  const now = new Date();
  const start = new Date(now.getTime() - days * 86_400_000);
  return {
    mode,
    start: start.toISOString(),
    end: now.toISOString(),
    sprintId: null,
    label: TIME_MODE_LABELS[mode],
  };
}

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
  // time range (legacy — retained for backward compat; derived from timeMode)
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
  // time (WHEN) — the unified dimension
  timeMode: TimeMode;
  setTimeMode: (mode: TimeMode) => void;
  customRange: { start: string | null; end: string | null };
  setCustomRange: (range: { start: string | null; end: string | null }) => void;
  time: WorkspaceTime;
  // quick stats
  quickStats: QuickStats | null;
  // request headers for downstream fetches (legacy: project + env + sprint)
  workspaceHeaders: Record<string, string>;
  // transport adapter — the single place headers/query are built from state
  adapter: WorkspaceAdapter;
}

const noop = () => {};
const WorkspaceContext = createContext<WorkspaceContextType>({
  environments: [], activeEnvironment: null, setActiveEnvironment: noop, environmentsLoading: false, refreshEnvironments: async () => {},
  sprints: [], currentSprint: null, activeSprint: null, setActiveSprint: noop, sprintProgress: null, sprintsLoading: false, refreshSprints: async () => {},
  timeRange: { value: 'sprint' }, setTimeRange: noop,
  timeMode: 'current_sprint', setTimeMode: noop, customRange: { start: null, end: null }, setCustomRange: noop,
  time: { mode: 'current_sprint', start: null, end: null, sprintId: null, label: 'Current Sprint' },
  quickStats: null,
  workspaceHeaders: {},
  adapter: { toHeaders: () => ({}), toQuery: () => ({}) },
});

const envKey = (pid: number) => `levelup_env_${pid}`;
const sprintKey = (pid: number) => `levelup_sprint_${pid}`;
const rangeKey = (pid: number) => `levelup_timerange_${pid}`;
const timeModeKey = (pid: number) => `levelup_timemode_${pid}`;
const customRangeKey = (pid: number) => `levelup_customrange_${pid}`;

/** All valid time modes, for validating persisted values. */
const TIME_MODES: TimeMode[] = ['current_sprint', 'last_7_days', 'last_14_days', 'last_30_days', 'custom'];

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

  const [timeRange, setTimeRangeState] = useState<TimeRange>({ value: 'sprint' });
  const [timeMode, setTimeModeState] = useState<TimeMode>('current_sprint');
  const [customRange, setCustomRangeState] = useState<{ start: string | null; end: string | null }>({ start: null, end: null });
  const [quickStats, setQuickStats] = useState<QuickStats | null>(null);

  // Avoid syncing to backend before the initial restore completes.
  const restoredRef = useRef(false);

  /* ── Persist + backend sync ─────────────────────────────────────── */
  const syncContext = useCallback((envId: number | null, sprintId: number | null, range: TimeRange) => {
    if (!projectId) return;
    fetch(`/api/users/me/context/${projectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        environment_id: envId,
        sprint_id: sprintId,
        time_range: range.value,
        time_range_start: range.start ?? null,
        time_range_end: range.end ?? null,
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
      const savedRange = readLs(rangeKey(projectId));
      setTimeRangeState(savedRange ? { value: savedRange } : { value: 'sprint' });
      // Restore unified time mode (WHEN)
      const savedMode = readLs(timeModeKey(projectId));
      setTimeModeState(savedMode && (TIME_MODES as string[]).includes(savedMode) ? (savedMode as TimeMode) : 'current_sprint');
      const savedCustom = readLs(customRangeKey(projectId));
      if (savedCustom) {
        try {
          const parsed = JSON.parse(savedCustom);
          setCustomRangeState({ start: parsed.start ?? null, end: parsed.end ?? null });
        } catch { setCustomRangeState({ start: null, end: null }); }
      } else {
        setCustomRangeState({ start: null, end: null });
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
      syncContext(env ? env.id : null, activeSprint ? activeSprint.id : null, timeRange);
    }
  }, [projectId, activeSprint, timeRange, syncContext]);

  const setActiveSprint = useCallback((sprint: ProjectSprint | null) => {
    setActiveSprintState(sprint);
    if (projectId) {
      writeLs(sprintKey(projectId), sprint ? String(sprint.id) : null);
      syncContext(activeEnvironment ? activeEnvironment.id : null, sprint ? sprint.id : null, timeRange);
    }
  }, [projectId, activeEnvironment, timeRange, syncContext]);

  const setTimeRange = useCallback((range: TimeRange) => {
    setTimeRangeState(range);
    if (projectId) {
      writeLs(rangeKey(projectId), range.value);
      syncContext(activeEnvironment ? activeEnvironment.id : null, activeSprint ? activeSprint.id : null, range);
    }
  }, [projectId, activeEnvironment, activeSprint, syncContext]);

  /* ── Unified Time (WHEN) — derive concrete window + setters ─────── */
  const time = useMemo(
    () => computeTimeWindow(timeMode, activeSprint, customRange),
    [timeMode, activeSprint, customRange],
  );

  const setTimeMode = useCallback((mode: TimeMode) => {
    setTimeModeState(mode);
    if (projectId) {
      writeLs(timeModeKey(projectId), mode);
      // Keep the legacy time_range value roughly in sync for backend persistence.
      const rangeValue = mode === 'current_sprint' ? 'sprint' : mode;
      syncContext(
        activeEnvironment ? activeEnvironment.id : null,
        activeSprint ? activeSprint.id : null,
        { value: rangeValue, start: mode === 'custom' ? customRange.start : null, end: mode === 'custom' ? customRange.end : null },
      );
    }
  }, [projectId, activeEnvironment, activeSprint, customRange, syncContext]);

  const setCustomRange = useCallback((range: { start: string | null; end: string | null }) => {
    setCustomRangeState(range);
    if (projectId) {
      writeLs(customRangeKey(projectId), JSON.stringify(range));
      if (timeMode === 'custom') {
        syncContext(
          activeEnvironment ? activeEnvironment.id : null,
          activeSprint ? activeSprint.id : null,
          { value: 'custom', start: range.start, end: range.end },
        );
      }
    }
  }, [projectId, activeEnvironment, activeSprint, timeMode, syncContext]);

  const workspaceHeaders = useMemo((): Record<string, string> => {
    const h: Record<string, string> = {};
    if (projectId) h['x-project-id'] = String(projectId);
    if (activeEnvironment) h['x-environment-id'] = String(activeEnvironment.id);
    if (activeSprint) h['x-sprint-id'] = String(activeSprint.id);
    return h;
  }, [projectId, activeEnvironment, activeSprint]);

  /* ── Transport adapter — the ONLY place headers/query are built ──── */
  const adapter = useMemo((): WorkspaceAdapter => {
    const toHeaders = (opts?: { includeEnvironment?: boolean }): Record<string, string> => {
      const includeEnv = opts?.includeEnvironment !== false;
      const h: Record<string, string> = {};
      if (projectId) h['x-project-id'] = String(projectId);
      if (includeEnv && activeEnvironment) h['x-environment-id'] = String(activeEnvironment.id);
      // Time transport: sprint id when in current-sprint mode with a live sprint,
      // otherwise the resolved date window.
      if (time.mode === 'current_sprint' && time.sprintId != null) {
        h['x-sprint-id'] = String(time.sprintId);
      }
      if (time.start) h['x-date-start'] = time.start;
      if (time.end) h['x-date-end'] = time.end;
      return h;
    };
    const toQuery = (opts?: { includeEnvironment?: boolean }): Record<string, string> => {
      const includeEnv = opts?.includeEnvironment !== false;
      const q: Record<string, string> = {};
      if (projectId) q.projectId = String(projectId);
      if (includeEnv && activeEnvironment) q.environmentId = String(activeEnvironment.id);
      if (time.start) q.startDate = time.start;
      if (time.end) q.endDate = time.end;
      return q;
    };
    return { toHeaders, toQuery };
  }, [projectId, activeEnvironment, time]);

  const value: WorkspaceContextType = {
    environments, activeEnvironment, setActiveEnvironment, environmentsLoading, refreshEnvironments,
    sprints, currentSprint, activeSprint, setActiveSprint, sprintProgress, sprintsLoading, refreshSprints,
    timeRange, setTimeRange,
    timeMode, setTimeMode, customRange, setCustomRange, time,
    quickStats,
    workspaceHeaders,
    adapter,
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

/** Headers (project + environment + sprint) for client-side fetches. */
export function useWorkspaceHeaders(): Record<string, string> {
  return useContext(WorkspaceContext).workspaceHeaders;
}

/** The unified Time (WHEN) dimension + its mode setters. */
export function useWorkspaceTime() {
  const c = useContext(WorkspaceContext);
  return {
    time: c.time,
    timeMode: c.timeMode,
    setTimeMode: c.setTimeMode,
    customRange: c.customRange,
    setCustomRange: c.setCustomRange,
  };
}

/**
 * The transport adapter — the single sanctioned way for a page to turn Workspace
 * state into request headers or query params. Pages MUST use this instead of
 * hand-building x-* headers or ?projectId=… strings.
 */
export function useWorkspaceAdapter(): WorkspaceAdapter {
  return useContext(WorkspaceContext).adapter;
}
