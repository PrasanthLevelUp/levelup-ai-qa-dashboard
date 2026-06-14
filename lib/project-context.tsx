'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Page routes that do NOT require authentication. Keep in sync with the page
 * (non-API) public paths in `middleware.ts`. On these routes the user is not
 * authenticated yet, so we must NOT call authenticated APIs like /api/projects
 * — doing so fires a request that 401s on the login screen (info leak + noisy
 * console errors + poor UX).
 */
const PUBLIC_PREFIXES = ['/login', '/pricing', '/demo-video', '/reels'];

function isPublicRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export interface Project {
  id: number;
  name: string;
  description: string | null;
  repo_count: string | number;
  is_active: boolean;
  created_at: string;
}

interface ProjectContextType {
  projects: Project[];
  activeProject: Project | null;
  setActiveProject: (project: Project) => void;
  loading: boolean;
  error: string | null;
  refreshProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType>({
  projects: [],
  activeProject: null,
  setActiveProject: () => {},
  loading: true,
  error: null,
  refreshProjects: async () => {},
});

export function useProject() {
  return useContext(ProjectContext);
}

/**
 * Returns headers object with x-project-id set from the active project.
 * Use in client-side fetch calls to scope requests to the active project.
 * Returns empty object if no active project (backward compatible).
 */
export function useProjectHeaders(): Record<string, string> {
  const { activeProject } = useProject();
  const projectId = activeProject?.id;
  return useMemo((): Record<string, string> => {
    if (!projectId) return {};
    return { 'x-project-id': String(projectId) };
  }, [projectId]);
}

/**
 * Standalone helper to get project-id from localStorage (for non-hook contexts).
 * Prefer useProjectHeaders() in React components.
 */
export function getStoredProjectId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
}

const STORAGE_KEY = 'levelup_active_project_id';

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const onPublicRoute = isPublicRoute(pathname);

  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProjectState] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const res = await fetch('/api/projects');
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        const statusMsg = res.status === 401 ? 'Session expired — please log in again'
          : res.status === 403 ? 'Access denied'
          : `Failed to load projects (${res.status})`;
        console.error('Projects fetch failed:', res.status, errText);
        setError(statusMsg);
        return;
      }
      const data = await res.json();
      const list: Project[] = data.projects || [];
      setProjects(list);
      setError(null);

      // Restore previously selected project from localStorage
      const savedId = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      const savedProject = savedId ? list.find(p => p.id === parseInt(savedId, 10)) : null;

      if (savedProject) {
        setActiveProjectState(savedProject);
      } else if (list.length > 0) {
        // Auto-select first project
        setActiveProjectState(list[0]);
        if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, String(list[0].id));
      }
    } catch (err: any) {
      console.error('Failed to fetch projects:', err);
      setError('Network error — could not reach server');
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Skip authenticated data fetching on public routes (e.g. the login page).
    // The user has no session yet, so /api/projects would 401. Once the user
    // logs in and is redirected to an authenticated route, `pathname` changes,
    // `onPublicRoute` flips to false, and this effect re-runs to load projects.
    if (onPublicRoute) {
      setProjects([]);
      setActiveProjectState(null);
      setError(null);
      setLoading(false);
      return;
    }
    fetchProjects();
  }, [onPublicRoute, fetchProjects]);

  const setActiveProject = useCallback((project: Project) => {
    setActiveProjectState(project);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(project.id));
    }
  }, []);

  return (
    <ProjectContext.Provider
      value={{
        projects,
        activeProject,
        setActiveProject,
        loading,
        error,
        refreshProjects: fetchProjects,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}
