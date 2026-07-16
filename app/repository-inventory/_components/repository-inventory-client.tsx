'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  FolderSearch,
  FlaskConical,
  Layers,
  ShieldCheck,
  FileCode2,
  Tag,
  Boxes,
} from 'lucide-react';
import { useProject, useProjectHeaders } from '@/lib/project-context';
import { toast } from 'sonner';

/* ── Types (mirror backend getRepositoryTestInventoryGrouped) ────────────── */
interface InventoryTest {
  id: string;
  repository_id: number | null;
  file_path: string;
  test_name: string;
  feature: string | null;
  flow: string | null;
  page: string | null;
  tags: string[];
  assertions: string[];
  pom_methods: string[];
  framework: string | null;
  confidence: number;
  metadata: Record<string, unknown>;
}
interface FeatureGroup {
  feature: string;
  testCount: number;
  avgConfidence: number;
  tests: InventoryTest[];
}
interface InventoryResult {
  totalTests: number;
  totalFeatures: number;
  frameworks: string[];
  groups: FeatureGroup[];
}
interface RepoListItem {
  id: string;
  name: string;
  url?: string;
  branch?: string;
}

function confidenceColor(c: number): string {
  if (c >= 80) return 'text-emerald-400';
  if (c >= 60) return 'text-blue-300';
  if (c >= 40) return 'text-amber-400';
  return 'text-slate-400';
}

export default function RepositoryInventoryClient() {
  const { activeProject } = useProject();
  const projectId = activeProject?.id;
  const projectHeaders = useProjectHeaders();

  const [repos, setRepos] = useState<RepoListItem[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [inventory, setInventory] = useState<InventoryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  /* ── Load repositories for the active project ─────────────────────────── */
  const fetchRepos = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/repositories`).then(r => r.json());
      const list = Array.isArray(res) ? res : res.repositories || [];
      setRepos(list.map((r: any) => ({ ...r, id: String(r.id) })));
    } catch (err) {
      console.error('Failed to load repositories:', err);
    }
  }, [projectId]);

  /* ── Load persisted inventory (grouped + searchable) ──────────────────── */
  const fetchInventory = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedRepo) params.append('repository_id', selectedRepo);
      if (search.trim()) params.append('search', search.trim());
      const res = await fetch(`/api/repository-inventory?${params.toString()}`, {
        headers: projectHeaders,
      });
      const data = await res.json();
      if (res.ok) {
        setInventory(data);
      } else {
        toast.error(data.error || 'Failed to load inventory');
        setInventory(null);
      }
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, selectedRepo, search]);

  useEffect(() => {
    fetchRepos();
  }, [fetchRepos]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  /* ── Trigger a deterministic scan of the selected repository ──────────── */
  const runScan = async () => {
    if (!selectedRepo) {
      toast.error('Select a repository to scan');
      return;
    }
    setScanning(true);
    try {
      const res = await fetch('/api/repository-inventory/scan', {
        method: 'POST',
        headers: { ...projectHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ repositoryId: Number(selectedRepo) }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        toast.success(
          `Scanned ${data.scanned.testFilesScanned} files · ${data.scanned.testsFound} tests · persisted ${data.persisted}`,
        );
        await fetchInventory();
      } else {
        toast.error(data.error || 'Scan failed');
      }
    } catch (err) {
      console.error('Scan error:', err);
      toast.error('Scan failed');
    } finally {
      setScanning(false);
    }
  };

  const toggle = (feature: string) =>
    setExpanded(prev => ({ ...prev, [feature]: !prev[feature] }));

  const stats = useMemo(() => {
    return {
      tests: inventory?.totalTests ?? 0,
      features: inventory?.totalFeatures ?? 0,
      frameworks: inventory?.frameworks ?? [],
      avgConfidence:
        inventory && inventory.groups.length
          ? Math.round(
              inventory.groups.reduce((s, g) => s + g.avgConfidence * g.testCount, 0) /
                Math.max(1, inventory.totalTests),
            )
          : 0,
    };
  }, [inventory]);

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-white">Repository Coverage Inventory</h1>
          <p className="text-slate-400 mt-1 text-sm max-w-2xl">
            A deterministic map of the tests that <span className="text-slate-200">already exist</span> in your
            repository — extracted by static analysis, no AI. See what&apos;s covered before generating anything new.
          </p>
          <div className="flex items-center flex-wrap gap-x-5 gap-y-1 mt-3 text-sm">
            <span className="text-slate-300">
              <span className="font-semibold text-white">{stats.tests.toLocaleString()}</span>{' '}
              <span className="text-slate-400">Tests</span>
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400">
              <span className="font-medium text-violet-300">{stats.features.toLocaleString()}</span> Features
            </span>
            {stats.frameworks.length > 0 && (
              <>
                <span className="text-slate-600">·</span>
                <span className="text-slate-400">
                  Frameworks{' '}
                  <span className="font-medium text-blue-300">{stats.frameworks.join(', ')}</span>
                </span>
              </>
            )}
            {stats.tests > 0 && (
              <>
                <span className="text-slate-600">·</span>
                <span className="text-slate-400 inline-flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-slate-500" />
                  Avg confidence{' '}
                  <span className={`font-medium ${confidenceColor(stats.avgConfidence)}`}>
                    {stats.avgConfidence}%
                  </span>
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchInventory} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={runScan} disabled={scanning || !selectedRepo}>
            <FolderSearch className={`h-4 w-4 mr-2 ${scanning ? 'animate-pulse' : ''}`} />
            {scanning ? 'Scanning…' : 'Scan Repository'}
          </Button>
        </div>
      </div>

      {/* Controls: repo selector + search */}
      <Card className="p-4 bg-[#1a1f2e] border-slate-800">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Boxes className="h-4 w-4 text-slate-500" />
            <select
              value={selectedRepo}
              onChange={e => setSelectedRepo(e.target.value)}
              className="bg-[#0f172a] border border-slate-700 text-slate-200 text-sm rounded-md px-3 py-2 min-w-[220px] focus:outline-none focus:ring-1 focus:ring-violet-500"
            >
              <option value="">All repositories</option>
              {repos.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search tests, features, pages, tags…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-[#0f172a] border-slate-700"
            />
          </div>
        </div>
      </Card>

      {/* Body */}
      {loading ? (
        <Card className="p-12 bg-[#1a1f2e] border-slate-800 text-center text-slate-400">
          <RefreshCw className="h-6 w-6 mx-auto mb-3 animate-spin text-slate-500" />
          Loading inventory…
        </Card>
      ) : !inventory || inventory.totalTests === 0 ? (
        <Card className="p-12 bg-[#1a1f2e] border-slate-800 text-center">
          <FolderSearch className="h-10 w-10 mx-auto mb-3 text-slate-600" />
          <p className="text-slate-300 font-medium">No inventory yet</p>
          <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
            {repos.length === 0
              ? 'Add a repository to this project first, then scan it to build the inventory.'
              : 'Select a repository and click "Scan Repository" to deterministically extract its existing tests.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {inventory.groups.map(group => {
            const isOpen = expanded[group.feature] ?? false;
            return (
              <Card key={group.feature} className="bg-[#1a1f2e] border-slate-800 overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggle(group.feature)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    )}
                    <Layers className="h-4 w-4 text-violet-400" />
                    <span className="font-semibold text-white">{group.feature}</span>
                    <Badge className="bg-violet-500/15 text-violet-300 border-violet-500/30">
                      {group.testCount} {group.testCount === 1 ? 'test' : 'tests'}
                    </Badge>
                  </div>
                  <span className={`text-xs font-medium ${confidenceColor(group.avgConfidence)}`}>
                    {group.avgConfidence}% avg confidence
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-800 divide-y divide-slate-800/70">
                    {group.tests.map(t => (
                      <div key={t.id} className="px-5 py-3.5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <FlaskConical className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                              <span className="text-slate-200 text-sm">{t.test_name}</span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap mt-1.5 text-xs text-slate-500">
                              <span className="inline-flex items-center gap-1 font-mono">
                                <FileCode2 className="h-3 w-3" />
                                {t.file_path}
                              </span>
                              {t.page && (
                                <>
                                  <span className="text-slate-700">·</span>
                                  <span>Page: <span className="text-slate-300">{t.page}</span></span>
                                </>
                              )}
                              {t.flow && (
                                <>
                                  <span className="text-slate-700">·</span>
                                  <span>Flow: <span className="text-slate-300">{t.flow}</span></span>
                                </>
                              )}
                              {t.framework && (
                                <>
                                  <span className="text-slate-700">·</span>
                                  <span className="text-blue-300/80">{t.framework}</span>
                                </>
                              )}
                            </div>
                            {/* Tags / assertions / POM methods */}
                            <div className="flex items-center gap-1.5 flex-wrap mt-2">
                              {t.tags.map(tag => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center gap-1 text-[11px] bg-slate-700/40 text-slate-300 rounded px-1.5 py-0.5"
                                >
                                  <Tag className="h-2.5 w-2.5" />
                                  {tag}
                                </span>
                              ))}
                              {t.assertions.slice(0, 6).map((a, i) => (
                                <span
                                  key={`${a}-${i}`}
                                  className="text-[11px] bg-emerald-500/10 text-emerald-300 rounded px-1.5 py-0.5"
                                >
                                  {a}
                                </span>
                              ))}
                              {t.pom_methods.slice(0, 6).map((m, i) => (
                                <span
                                  key={`${m}-${i}`}
                                  className="text-[11px] bg-blue-500/10 text-blue-300 rounded px-1.5 py-0.5 font-mono"
                                >
                                  {m}
                                </span>
                              ))}
                            </div>
                          </div>
                          <span className={`text-xs font-semibold shrink-0 ${confidenceColor(t.confidence)}`}>
                            {t.confidence}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
