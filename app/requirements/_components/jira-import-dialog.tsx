'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, ExternalLink, Download } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface JiraProject {
  key: string;
  name: string;
  id?: string;
}

interface JiraIssueType {
  id?: string;
  name: string;
  subtask?: boolean;
}

interface JiraImportDialogProps {
  open: boolean;
  onClose: (refresh: boolean) => void;
  /** Full workspace headers (project + environment + sprint) so imported
   *  requirements are stamped with the active project/env/sprint. */
  workspaceHeaders: Record<string, string>;
}

export default function JiraImportDialog({ open, onClose, workspaceHeaders }: JiraImportDialogProps) {
  // Connection / load state
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [notConnected, setNotConnected] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Data
  const [projects, setProjects] = useState<JiraProject[]>([]);
  const [issueTypes, setIssueTypes] = useState<JiraIssueType[]>([]);

  // Selections
  const [selectedProject, setSelectedProject] = useState('');
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  // Import
  const [importing, setImporting] = useState(false);

  const resetState = useCallback(() => {
    setProjects([]);
    setIssueTypes([]);
    setSelectedProject('');
    setSelectedTypes([]);
    setNotConnected(false);
    setLoadError(null);
    setImporting(false);
  }, []);

  // Load projects when the dialog opens.
  useEffect(() => {
    if (!open) return;
    resetState();
    let cancelled = false;
    (async () => {
      try {
        setLoadingProjects(true);
        const res = await fetch('/api/requirements/jira/projects', { headers: workspaceHeaders });
        const data = await res.json();
        if (cancelled) return;
        if (res.status === 400 && data?.code === 'JIRA_NOT_CONNECTED') {
          setNotConnected(true);
          return;
        }
        if (!res.ok || data?.success === false) {
          setLoadError(data?.error || 'Failed to load Jira projects');
          return;
        }
        const list: JiraProject[] = data.data || data.projects || data || [];
        setProjects(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setLoadError('Failed to load Jira projects');
      } finally {
        if (!cancelled) setLoadingProjects(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Load issue types when a project is selected.
  useEffect(() => {
    if (!open || !selectedProject) {
      setIssueTypes([]);
      setSelectedTypes([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoadingTypes(true);
        setIssueTypes([]);
        setSelectedTypes([]);
        const res = await fetch(
          `/api/requirements/jira/issue-types?projectKey=${encodeURIComponent(selectedProject)}`,
          { headers: workspaceHeaders }
        );
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || data?.success === false) {
          toast.error(data?.error || 'Failed to load issue types');
          return;
        }
        const list: JiraIssueType[] = data.data || data.issueTypes || data || [];
        const filtered = (Array.isArray(list) ? list : []).filter((t) => !t.subtask);
        setIssueTypes(filtered);
        // Pre-select common requirement-bearing types if present.
        const defaults = filtered
          .map((t) => t.name)
          .filter((n) => ['Story', 'Epic'].includes(n));
        setSelectedTypes(defaults);
      } catch {
        if (!cancelled) toast.error('Failed to load issue types');
      } finally {
        if (!cancelled) setLoadingTypes(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject, open]);

  const toggleType = (name: string) => {
    setSelectedTypes((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name]
    );
  };

  const handleImport = async () => {
    if (!selectedProject) {
      toast.error('Select a Jira project');
      return;
    }
    if (selectedTypes.length === 0) {
      toast.error('Select at least one issue type');
      return;
    }
    try {
      setImporting(true);
      const res = await fetch('/api/requirements/jira/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...workspaceHeaders },
        body: JSON.stringify({ projectKey: selectedProject, issueTypes: selectedTypes }),
      });
      const data = await res.json();
      if (!res.ok || data?.success === false) {
        throw new Error(data?.error || 'Import failed');
      }
      const imported = data.imported ?? data.data?.imported ?? 0;
      const updated = data.updated ?? data.data?.updated ?? 0;
      const skipped = data.skipped ?? data.data?.skipped ?? 0;
      toast.success(
        `Imported ${imported}, updated ${updated}${skipped ? `, skipped ${skipped}` : ''}`
      );
      onClose(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to import from Jira');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose(false)}>
      <DialogContent className="max-w-lg bg-[#1a1f2e] border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-violet-400" />
            Import from Jira
          </DialogTitle>
        </DialogHeader>

        {/* Not connected — send the user to Tools → Jira */}
        {notConnected ? (
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
              <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-200">
                <p className="font-medium">Jira isn&apos;t connected yet.</p>
                <p className="mt-1 text-amber-200/80">
                  Connect your Jira workspace under Tools → Jira, then come back here to import.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-700">
              <Button variant="outline" onClick={() => onClose(false)}>
                Cancel
              </Button>
              <Link href="/tools">
                <Button>
                  Go to Tools → Jira
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        ) : loadError ? (
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
              <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
              <div className="text-sm text-red-200">{loadError}</div>
            </div>
            <div className="flex justify-end pt-2 border-t border-slate-700">
              <Button variant="outline" onClick={() => onClose(false)}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5 py-1">
            {/* Step 1 — Project */}
            <div className="space-y-1.5">
              <Label>Jira Project</Label>
              {loadingProjects ? (
                <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading projects…
                </div>
              ) : (
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0f172a] border border-slate-700 rounded-lg text-slate-200"
                >
                  <option value="">Select a project…</option>
                  {projects.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.name} ({p.key})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Step 2 — Issue types */}
            {selectedProject && (
              <div className="space-y-2">
                <Label>Issue Types</Label>
                {loadingTypes ? (
                  <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading issue types…
                  </div>
                ) : issueTypes.length === 0 ? (
                  <p className="text-sm text-slate-400">No importable issue types found for this project.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {issueTypes.map((t) => {
                      const checked = selectedTypes.includes(t.name);
                      return (
                        <button
                          key={t.name}
                          type="button"
                          onClick={() => toggleType(t.name)}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                            checked
                              ? 'border-violet-500 bg-violet-500/10 text-violet-200'
                              : 'border-slate-700 bg-[#0f172a] text-slate-300 hover:border-slate-600'
                          }`}
                        >
                          <span
                            className={`flex h-4 w-4 items-center justify-center rounded border ${
                              checked ? 'border-violet-400 bg-violet-500' : 'border-slate-600'
                            }`}
                          >
                            {checked && <span className="text-[10px] text-white">✓</span>}
                          </span>
                          {t.name}
                        </button>
                      );
                    })}
                  </div>
                )}
                {selectedTypes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedTypes.map((t) => (
                      <Badge key={t} variant="outline" className="text-violet-300 border-violet-500/30">
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            <p className="text-xs text-slate-500">
              Issues become requirements tagged with their Jira key. Re-importing updates existing
              requirements instead of creating duplicates.
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-700">
              <Button variant="outline" onClick={() => onClose(false)} disabled={importing}>
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={importing || !selectedProject || selectedTypes.length === 0}
              >
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing…
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Import
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
