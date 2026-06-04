'use client';

import { useState, useEffect, useCallback } from 'react';
import { useProject, type Project } from '@/lib/project-context';
import {
  FolderKanban, Plus, GitBranch, Trash2, Edit3, Check, X, Globe,
  Loader2, ExternalLink, ChevronRight, Cpu, Settings, Calendar
} from 'lucide-react';

interface Repository {
  id: number;
  project_id: number;
  name: string;
  url: string;
  branch: string;
  type: string;
  role?: string;
  created_at: string;
}

const RELEASE_CYCLE_TYPES = [
  { value: 'continuous', label: 'Continuous Deployment' },
  { value: 'sprint', label: 'Sprint-based' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'custom', label: 'Custom' },
];

const REPO_ROLES = [
  { value: 'primary', label: 'Primary' },
  { value: 'frontend', label: 'Frontend' },
  { value: 'backend', label: 'Backend' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'shared', label: 'Shared/Lib' },
  { value: 'admin', label: 'Admin' },
];

const ROLE_COLORS: Record<string, string> = {
  primary: 'text-blue-400 bg-blue-500/10',
  frontend: 'text-purple-400 bg-purple-500/10',
  backend: 'text-amber-400 bg-amber-500/10',
  mobile: 'text-pink-400 bg-pink-500/10',
  shared: 'text-slate-400 bg-slate-500/10',
  admin: 'text-red-400 bg-red-500/10',
};

export function ProjectsClient() {
  const { projects, activeProject, setActiveProject, refreshProjects, loading: projectsLoading } = useProject();
  const [selectedProject, setSelectedProject] = useState<(Project & {
    repositories?: Repository[];
    release_cycle_type?: string | null;
    release_cycle_days?: number | null;
    release_day_of_week?: number | null;
    release_timezone?: string | null;
    overview_default_range?: string | null;
  }) | null>(null);
  const [loading, setLoading] = useState(false);

  // Create project form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [creating, setCreating] = useState(false);

  // Add repo form
  const [showAddRepo, setShowAddRepo] = useState(false);
  const [repoName, setRepoName] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [repoBranch, setRepoBranch] = useState('main');
  const [repoType, setRepoType] = useState('web');
  const [repoRole, setRepoRole] = useState('primary');
  const [addingRepo, setAddingRepo] = useState(false);

  // Release cycle config
  const [showReleaseConfig, setShowReleaseConfig] = useState(false);
  const [releaseCycleType, setReleaseCycleType] = useState('continuous');
  const [releaseCycleDays, setReleaseCycleDays] = useState(14);
  const [releaseDayOfWeek, setReleaseDayOfWeek] = useState<number | null>(null);
  const [releaseTimezone, setReleaseTimezone] = useState('UTC');
  const [overviewDefaultRange, setOverviewDefaultRange] = useState('7d');
  const [savingRelease, setSavingRelease] = useState(false);

  const loadProjectDetail = useCallback(async (projectId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) return;
      const data = await res.json();
      setSelectedProject(data.project);
    } catch (err) {
      console.error('Failed to load project:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeProject) {
      loadProjectDetail(activeProject.id);
    }
  }, [activeProject, loadProjectDetail]);

  // Keep the release-config form in sync with the saved project values so the
  // form reflects what is persisted (rather than always showing defaults,
  // which made saved config appear to "vanish").
  useEffect(() => {
    if (!selectedProject) return;
    setReleaseCycleType(selectedProject.release_cycle_type ?? 'continuous');
    setReleaseCycleDays(selectedProject.release_cycle_days ?? 14);
    setReleaseDayOfWeek(selectedProject.release_day_of_week ?? null);
    setReleaseTimezone(selectedProject.release_timezone ?? 'UTC');
    setOverviewDefaultRange(selectedProject.overview_default_range ?? '7d');
  }, [selectedProject]);

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName.trim(), description: newProjectDesc.trim() || null }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to create project');
        return;
      }
      const data = await res.json();
      await refreshProjects();
      setActiveProject(data.project);
      setShowCreateForm(false);
      setNewProjectName('');
      setNewProjectDesc('');
    } catch (err: any) {
      alert('Failed to create project: ' + err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleAddRepo(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProject || !repoName.trim() || !repoUrl.trim()) return;
    setAddingRepo(true);
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/repositories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: repoName.trim(),
          url: repoUrl.trim(),
          branch: repoBranch || 'main',
          type: repoType || 'web',
          role: repoRole || 'primary',
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to add repository');
        return;
      }
      await loadProjectDetail(selectedProject.id);
      await refreshProjects();
      setShowAddRepo(false);
      setRepoName('');
      setRepoUrl('');
      setRepoBranch('main');
      setRepoType('web');
      setRepoRole('primary');
    } catch (err: any) {
      alert('Failed to add repository: ' + err.message);
    } finally {
      setAddingRepo(false);
    }
  }

  async function handleSaveReleaseConfig() {
    if (!selectedProject) return;
    setSavingRelease(true);
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/release-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          release_cycle_type: releaseCycleType,
          release_cycle_days: releaseCycleDays,
          release_day_of_week: releaseDayOfWeek,
          release_timezone: releaseTimezone,
          overview_default_range: overviewDefaultRange,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to save release config');
        return;
      }
      setShowReleaseConfig(false);
      // Re-fetch so the form reflects what was actually persisted.
      await loadProjectDetail(selectedProject.id);
    } catch (err: any) {
      alert('Failed to save: ' + err.message);
    } finally {
      setSavingRelease(false);
    }
  }

  async function handleDeleteProject(id: number) {
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      await refreshProjects();
      setSelectedProject(null);
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  }

  const repos = selectedProject?.repositories || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white font-display">Projects</h2>
          <p className="text-sm text-slate-400 mt-1">
            Manage projects and their repositories. All features are scoped to the active project.
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          New Project
        </button>
      </div>

      {/* Create Project Form */}
      {showCreateForm && (
        <div className="bg-[#0f1729] border border-emerald-500/20 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Create New Project</h3>
          <form onSubmit={handleCreateProject} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Project Name *</label>
              <input
                type="text"
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
                placeholder="e.g., E-Commerce Platform QA"
                className="w-full px-3 py-2 bg-[#1e293b] border border-[#334155] rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
              <textarea
                value={newProjectDesc}
                onChange={e => setNewProjectDesc(e.target.value)}
                placeholder="Optional description of the project"
                rows={2}
                className="w-full px-3 py-2 bg-[#1e293b] border border-[#334155] rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={creating || !newProjectName.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {creating ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Create Project
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 text-slate-400 hover:text-white text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projectsLoading ? (
          <div className="col-span-full flex items-center justify-center py-12 text-slate-400">
            <Loader2 size={20} className="animate-spin mr-2" />
            Loading projects...
          </div>
        ) : projects.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-400">
            <FolderKanban size={48} className="mx-auto mb-4 text-slate-600" />
            <p className="text-lg font-medium text-slate-300 mb-2">No projects yet</p>
            <p className="text-sm">Create your first project to start organizing your QA work.</p>
          </div>
        ) : (
          projects.map(p => (
            <button
              key={p.id}
              onClick={() => { setActiveProject(p); loadProjectDetail(p.id); }}
              className={`text-left p-4 rounded-xl border transition-all ${
                activeProject?.id === p.id
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-[#0f1729] border-[#1e293b] hover:border-[#334155]'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FolderKanban size={16} className={activeProject?.id === p.id ? 'text-emerald-400' : 'text-slate-500'} />
                  <h3 className="font-semibold text-white text-sm">{p.name}</h3>
                </div>
                {activeProject?.id === p.id && (
                  <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">Active</span>
                )}
              </div>
              {p.description && <p className="text-xs text-slate-400 mb-2 line-clamp-2">{p.description}</p>}
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><GitBranch size={11} /> {p.repo_count} repo{Number(p.repo_count) !== 1 ? 's' : ''}</span>
                <span>{new Date(p.created_at).toLocaleDateString()}</span>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Selected Project Details */}
      {selectedProject && (
        <div className="bg-[#0f1729] border border-[#1e293b] rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <FolderKanban size={18} className="text-emerald-400" />
                {selectedProject.name}
              </h3>
              {selectedProject.description && (
                <p className="text-sm text-slate-400 mt-1">{selectedProject.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowReleaseConfig(!showReleaseConfig)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e293b] hover:bg-[#283548] border border-[#334155] text-slate-300 rounded-lg text-xs font-medium transition-colors"
                title="Release Cycle Settings"
              >
                <Settings size={13} />
                Release Config
              </button>
              <button
                onClick={() => handleDeleteProject(selectedProject.id)}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Delete project"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          {/* Release Cycle Configuration */}
          {showReleaseConfig && (
            <div className="p-4 bg-[#1e293b] rounded-lg border border-[#334155] space-y-4">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <Calendar size={14} className="text-emerald-400" />
                Release Cycle Configuration
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Release Cycle Type</label>
                  <select
                    value={releaseCycleType}
                    onChange={e => setReleaseCycleType(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0f1729] border border-[#334155] rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    {RELEASE_CYCLE_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                {(releaseCycleType === 'sprint' || releaseCycleType === 'custom') && (
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Cycle Duration (days)</label>
                    <input
                      type="number"
                      value={releaseCycleDays}
                      onChange={e => setReleaseCycleDays(parseInt(e.target.value) || 14)}
                      min={1}
                      max={365}
                      className="w-full px-3 py-2 bg-[#0f1729] border border-[#334155] rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}
                {releaseCycleType === 'sprint' && (
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Sprint Start Day</label>
                    <select
                      value={releaseDayOfWeek ?? ''}
                      onChange={e => setReleaseDayOfWeek(e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-3 py-2 bg-[#0f1729] border border-[#334155] rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">Not set</option>
                      <option value="0">Sunday</option>
                      <option value="1">Monday</option>
                      <option value="2">Tuesday</option>
                      <option value="3">Wednesday</option>
                      <option value="4">Thursday</option>
                      <option value="5">Friday</option>
                      <option value="6">Saturday</option>
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Overview Default Range</label>
                  <select
                    value={overviewDefaultRange}
                    onChange={e => setOverviewDefaultRange(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0f1729] border border-[#334155] rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="7d">7 Days</option>
                    <option value="14d">14 Days</option>
                    <option value="30d">30 Days</option>
                    <option value="90d">90 Days</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Timezone</label>
                  <select
                    value={releaseTimezone}
                    onChange={e => setReleaseTimezone(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0f1729] border border-[#334155] rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern (US)</option>
                    <option value="America/Chicago">Central (US)</option>
                    <option value="America/Los_Angeles">Pacific (US)</option>
                    <option value="Europe/London">London</option>
                    <option value="Asia/Kolkata">India (IST)</option>
                    <option value="Asia/Tokyo">Tokyo</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSaveReleaseConfig}
                  disabled={savingRelease}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  {savingRelease ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                  Save Config
                </button>
                <button
                  onClick={() => setShowReleaseConfig(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white text-xs transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Repositories */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-white">Repositories</h4>
              <button
                onClick={() => setShowAddRepo(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e293b] hover:bg-[#283548] border border-[#334155] text-slate-300 rounded-lg text-xs font-medium transition-colors"
              >
                <Plus size={12} />
                Add Repository
              </button>
            </div>

            {/* Add Repo Form */}
            {showAddRepo && (
              <form onSubmit={handleAddRepo} className="mb-4 p-4 bg-[#1e293b] rounded-lg border border-[#334155] space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Repository Name *</label>
                    <input
                      type="text"
                      value={repoName}
                      onChange={e => setRepoName(e.target.value)}
                      placeholder="e.g., e2e-tests"
                      className="w-full px-3 py-2 bg-[#0f1729] border border-[#334155] rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">GitHub URL *</label>
                    <input
                      type="text"
                      value={repoUrl}
                      onChange={e => setRepoUrl(e.target.value)}
                      placeholder="https://github.com/org/repo"
                      className="w-full px-3 py-2 bg-[#0f1729] border border-[#334155] rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Branch</label>
                    <input
                      type="text"
                      value={repoBranch}
                      onChange={e => setRepoBranch(e.target.value)}
                      placeholder="main"
                      className="w-full px-3 py-2 bg-[#0f1729] border border-[#334155] rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Type</label>
                    <select
                      value={repoType}
                      onChange={e => setRepoType(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0f1729] border border-[#334155] rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="web">Web (E2E Tests)</option>
                      <option value="api">API Tests</option>
                      <option value="mobile">Mobile Tests</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Role</label>
                    <select
                      value={repoRole}
                      onChange={e => setRepoRole(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0f1729] border border-[#334155] rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                    >
                      {REPO_ROLES.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={addingRepo || !repoName.trim() || !repoUrl.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    {addingRepo ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                    Add Repository
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddRepo(false)}
                    className="px-4 py-2 text-slate-400 hover:text-white text-xs transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Repo List */}
            {loading ? (
              <div className="flex items-center justify-center py-8 text-slate-400">
                <Loader2 size={16} className="animate-spin mr-2" />
                Loading...
              </div>
            ) : repos.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <GitBranch size={32} className="mx-auto mb-2 text-slate-600" />
                <p className="text-sm">No repositories yet. Add one to get started.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {repos.map(r => (
                  <div key={r.id} className="flex items-center gap-3 p-3 bg-[#1e293b] rounded-lg border border-[#334155]">
                    <GitBranch size={14} className="text-emerald-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-white">{r.name}</span>
                        <span className="text-[10px] uppercase tracking-wider text-slate-500 bg-[#0f1729] px-1.5 py-0.5 rounded">{r.type}</span>
                        {r.role && r.role !== 'primary' && (
                          <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-medium ${ROLE_COLORS[r.role] || ROLE_COLORS.primary}`}>
                            {r.role}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500">({r.branch})</span>
                      </div>
                      <p className="text-xs text-slate-400 truncate">{r.url}</p>
                    </div>
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-slate-400 hover:text-white transition-colors"
                      title="Open in GitHub"
                    >
                      <ExternalLink size={13} />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
