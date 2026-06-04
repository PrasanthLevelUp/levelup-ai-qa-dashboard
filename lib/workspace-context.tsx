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
  // time range
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
  timeRange: { value: 'sprint' }, setTimeRange: noop,
  quickStats: null,
  workspaceHeaders: {},
});

const envKey = (pid: number) => `levelup_env_${pid}`;
const sprintKey = (pid: number) => `levelup_sprint_${pid}`;
const rangeKey = (pid: number) => `levelup_timerange_${pid}`;

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

  const workspaceHeaders = useMemo((): Record<string, string> => {
    const h: Record<string, string> = {};
    if (projectId) h['x-project-id'] = String(projectId);
    if (activeEnvironment) h['x-environment-id'] = String(activeEnvironment.id);
    if (activeSprint) h['x-sprint-id'] = String(activeSprint.id);
    return h;
  }, [projectId, activeEnvironment, activeSprint]);

  const value: WorkspaceContextType = {
    environments, activeEnvironment, setActiveEnvironment, environmentsLoading, refreshEnvironments,
    sprints, currentSprint, activeSprint, setActiveSprint, sprintProgress, sprintsLoading, refreshSprints,
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

/** Headers (project + environment + sprint) for client-side fetches. */
export function useWorkspaceHeaders(): Record<string, string> {
  return useContext(WorkspaceContext).workspaceHeaders;
}
