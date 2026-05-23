'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  BookOpen, Plus, Search, Filter, X, ChevronDown, ChevronRight,
  Loader2, RefreshCw, Trash2, Edit3, Eye, Tag, ArrowRight,
  BarChart3, Link2, AlertTriangle, CheckCircle2, Clock, Layers,
  Hash, Globe, Cpu, Bug, Shield, Workflow, Database, Boxes,
  TestTubeDiagonal, FileText, ChevronLeft, Save, XCircle,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types & Constants                                                  */
/* ------------------------------------------------------------------ */

interface KnowledgeItem {
  id: string;
  company_id: string;
  category: CategoryType;
  title: string;
  description: string;
  metadata: Record<string, any>;
  tags: string[];
  related_modules: string[];
  status: 'active' | 'deprecated' | 'draft';
  priority: 'critical' | 'high' | 'medium' | 'low';
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface KnowledgeRelationship {
  id: string;
  source_id: string;
  target_id: string;
  relationship_type: string;
  source_title?: string;
  target_title?: string;
  source_category?: string;
  target_category?: string;
  created_at: string;
}

interface KnowledgeStats {
  total: number;
  active: number;
  deprecated: number;
  draft: number;
  relationships: number;
  categories: number;
}

type CategoryType =
  | 'business_rule' | 'workflow' | 'architecture' | 'dependency'
  | 'integration' | 'automation' | 'manual_test' | 'bug_pattern' | 'domain';

type ViewMode = 'list' | 'detail' | 'create' | 'edit';

const CATEGORIES: { value: CategoryType; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'business_rule', label: 'Business Rule', icon: FileText, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'workflow', label: 'Workflow', icon: Workflow, color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { value: 'architecture', label: 'Architecture', icon: Layers, color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  { value: 'dependency', label: 'Dependency', icon: Boxes, color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { value: 'integration', label: 'Integration', icon: Globe, color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { value: 'automation', label: 'Automation', icon: Cpu, color: 'bg-violet-500/20 text-violet-400 border-violet-500/30' },
  { value: 'manual_test', label: 'Manual Test', icon: TestTubeDiagonal, color: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
  { value: 'bug_pattern', label: 'Bug Pattern', icon: Bug, color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { value: 'domain', label: 'Domain', icon: Database, color: 'bg-teal-500/20 text-teal-400 border-teal-500/30' },
];

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  low: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  deprecated: 'bg-red-500/20 text-red-400 border-red-500/30',
  draft: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  active: CheckCircle2,
  deprecated: XCircle,
  draft: Clock,
};

const RELATIONSHIP_TYPES = [
  { value: 'depends_on', label: 'Depends On' },
  { value: 'related_to', label: 'Related To' },
  { value: 'blocks', label: 'Blocks' },
  { value: 'parent_of', label: 'Parent Of' },
  { value: 'child_of', label: 'Child Of' },
];

const PAGE_SIZE = 20;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getCategoryMeta(cat: CategoryType) {
  return CATEGORIES.find(c => c.value === cat) || CATEGORIES[0];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function formatDateFull(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function KnowledgeClient() {
  // View state
  const [view, setView] = useState<ViewMode>('list');
  const [selectedItem, setSelectedItem] = useState<KnowledgeItem | null>(null);
  const [relationships, setRelationships] = useState<KnowledgeRelationship[]>([]);

  // Data state
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [allTags, setAllTags] = useState<{ tag: string; count: number }[]>([]);
  const [categoryDist, setCategoryDist] = useState<{ category: string; count: number }[]>([]);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [filterTag, setFilterTag] = useState<string>('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('updated_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Loading/error
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search input ref
  const searchRef = useRef<HTMLInputElement>(null);

  /* ---- Fetch Items ---- */
  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (filterCategory) params.set('category', filterCategory);
      if (filterStatus) params.set('status', filterStatus);
      if (filterPriority) params.set('priority', filterPriority);
      if (filterTag) params.set('tag', filterTag);
      params.set('page', String(page));
      params.set('limit', String(PAGE_SIZE));
      params.set('sort_by', sortBy);
      params.set('sort_dir', sortDir);

      const endpoint = searchQuery.trim()
        ? `/api/knowledge/search?q=${encodeURIComponent(searchQuery.trim())}&${params.toString()}`
        : `/api/knowledge?${params.toString()}`;

      const res = await fetch(endpoint, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch');
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterCategory, filterStatus, filterPriority, filterTag, page, sortBy, sortDir]);

  /* ---- Fetch Stats & Meta ---- */
  const fetchMeta = useCallback(async () => {
    try {
      const [sRes, tRes, cRes] = await Promise.all([
        fetch('/api/knowledge/stats', { cache: 'no-store' }),
        fetch('/api/knowledge/tags', { cache: 'no-store' }),
        fetch('/api/knowledge/categories', { cache: 'no-store' }),
      ]);
      if (sRes.ok) {
        const raw = await sRes.json();
        // Backend returns { total, byCategory, byStatus, byPriority, recentCount, tagCloud }
        // Frontend expects { total, active, draft, deprecated, relationships, categories }
        const byStatus = raw.byStatus || raw.by_status || {};
        const byCategory = raw.byCategory || raw.by_category || {};
        setStats({
          total: raw.total ?? 0,
          active: byStatus.active ?? 0,
          draft: byStatus.draft ?? 0,
          deprecated: byStatus.deprecated ?? 0,
          relationships: raw.relationships ?? 0,
          categories: Object.keys(byCategory).length,
        });
      }
      if (tRes.ok) setAllTags(await tRes.json());
      if (cRes.ok) setCategoryDist(await cRes.json());
    } catch { /* non-critical */ }
  }, []);

  /* ---- Fetch Single + Relationships ---- */
  const fetchItem = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/knowledge/${id}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Not found');
      setSelectedItem(data.item);
      setRelationships(data.relationships || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ---- Load on mount & filter change ---- */
  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => { fetchMeta(); }, [fetchMeta]);

  /* ---- Keyboard shortcuts ---- */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setView('create');
        setSelectedItem(null);
      }
      if (e.key === '/' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape') {
        if (view !== 'list') { setView('list'); setSelectedItem(null); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [view]);

  /* ---- Delete Handler ---- */
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this knowledge item?')) return;
    try {
      const res = await fetch(`/api/knowledge/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      if (view === 'detail') { setView('list'); setSelectedItem(null); }
      fetchItems();
      fetchMeta();
    } catch (e: any) {
      setError(e.message);
    }
  };

  /* ---- View Item ---- */
  const handleView = (item: KnowledgeItem) => {
    setSelectedItem(item);
    fetchItem(item.id);
    setView('detail');
  };

  /* ---- Edit Item ---- */
  const handleEdit = (item: KnowledgeItem) => {
    setSelectedItem(item);
    setView('edit');
  };

  /* ---- After Save ---- */
  const handleSaved = () => {
    setView('list');
    setSelectedItem(null);
    fetchItems();
    fetchMeta();
  };

  /* ---- Pagination ---- */
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const activeFilterCount = [filterCategory, filterStatus, filterPriority, filterTag].filter(Boolean).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">Application Knowledge</h1>
            <p className="text-sm text-slate-400">
              Enterprise knowledge graph — business rules, workflows, architecture, dependencies & more
            </p>
          </div>
          {view === 'list' && (
            <button
              onClick={() => { setView('create'); setSelectedItem(null); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors shadow-lg shadow-violet-600/20"
            >
              <Plus className="w-4 h-4" />
              New Item
              <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[10px] bg-violet-500/40 rounded">N</kbd>
            </button>
          )}
          {view !== 'list' && (
            <button
              onClick={() => { setView('list'); setSelectedItem(null); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 text-sm font-medium transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to List
              <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[10px] bg-slate-600/40 rounded">Esc</kbd>
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto hover:text-red-300"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Stats Bar */}
      {view === 'list' && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <StatCard label="Total Items" value={stats.total} icon={Layers} />
          <StatCard label="Active" value={stats.active} icon={CheckCircle2} color="text-emerald-400" />
          <StatCard label="Draft" value={stats.draft} icon={Clock} color="text-amber-400" />
          <StatCard label="Deprecated" value={stats.deprecated} icon={XCircle} color="text-red-400" />
          <StatCard label="Relationships" value={stats.relationships} icon={Link2} color="text-blue-400" />
          <StatCard label="Categories" value={stats.categories} icon={Hash} color="text-purple-400" />
        </div>
      )}

      {/* Filter Bar */}
      {view === 'list' && (
        <div className="mb-6 space-y-3">
          <div className="flex flex-wrap gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search knowledge items… (press /)"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40"
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category Filter */}
            <select
              value={filterCategory}
              onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
              className="px-3 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
              className="px-3 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="deprecated">Deprecated</option>
            </select>

            {/* Priority Filter */}
            <select
              value={filterPriority}
              onChange={(e) => { setFilterPriority(e.target.value); setPage(1); }}
              className="px-3 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
            >
              <option value="">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {/* Refresh */}
            <button
              onClick={() => { fetchItems(); fetchMeta(); }}
              disabled={loading}
              className="px-3 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Tag Filter / Active Filters */}
          {(allTags.length > 0 || activeFilterCount > 0) && (
            <div className="flex flex-wrap items-center gap-2">
              {activeFilterCount > 0 && (
                <button
                  onClick={() => { setFilterCategory(''); setFilterStatus(''); setFilterPriority(''); setFilterTag(''); setSearchQuery(''); setPage(1); }}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                >
                  <X className="w-3 h-3" /> Clear {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}
                </button>
              )}
              {filterTag && (
                <span className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-violet-500/10 text-violet-400 border border-violet-500/20">
                  <Tag className="w-3 h-3" /> {filterTag}
                  <button onClick={() => { setFilterTag(''); setPage(1); }}><X className="w-3 h-3" /></button>
                </span>
              )}
              {!filterTag && allTags.slice(0, 12).map(t => (
                <button
                  key={t.tag}
                  onClick={() => { setFilterTag(t.tag); setPage(1); }}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-slate-700/30 text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
                >
                  <Tag className="w-3 h-3" /> {t.tag}
                  <span className="text-slate-600">({t.count})</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content Area */}
      {view === 'list' && <ItemList items={items} loading={loading} onView={handleView} onEdit={handleEdit} onDelete={handleDelete} page={page} totalPages={totalPages} total={total} onPageChange={setPage} />}
      {view === 'detail' && selectedItem && <ItemDetail item={selectedItem} relationships={relationships} onEdit={() => handleEdit(selectedItem)} onDelete={() => handleDelete(selectedItem.id)} onView={handleView} onRefresh={() => fetchItem(selectedItem.id)} allItems={items} />}
      {(view === 'create' || view === 'edit') && <ItemForm item={view === 'edit' ? selectedItem : null} onSaved={handleSaved} onCancel={() => { setView(selectedItem ? 'detail' : 'list'); }} allItems={items} />}

      {/* Category Distribution */}
      {view === 'list' && categoryDist.length > 0 && (
        <div className="mt-6 p-4 bg-slate-800/30 border border-slate-700/50 rounded-xl">
          <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-violet-400" />
            Category Distribution
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
            {CATEGORIES.map(cat => {
              const dist = categoryDist.find(d => d.category === cat.value);
              const count = dist ? Number(dist.count) : 0;
              return (
                <button
                  key={cat.value}
                  onClick={() => { setFilterCategory(cat.value); setPage(1); }}
                  className="p-2 rounded-lg bg-slate-800/50 border border-slate-700/30 hover:border-violet-500/30 transition-colors text-center"
                >
                  <cat.icon className="w-4 h-4 mx-auto mb-1 text-slate-400" />
                  <div className="text-lg font-bold text-white">{count}</div>
                  <div className="text-[10px] text-slate-500 truncate">{cat.label}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat Card                                                          */
/* ------------------------------------------------------------------ */

function StatCard({ label, value, icon: Icon, color = 'text-white' }: { label: string; value: number; icon: React.ElementType; color?: string }) {
  return (
    <div className="p-3 bg-slate-800/30 border border-slate-700/50 rounded-xl">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs text-slate-500">{label}</span>
      </div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Item List                                                          */
/* ------------------------------------------------------------------ */

function ItemList({
  items, loading, onView, onEdit, onDelete,
  page, totalPages, total, onPageChange,
}: {
  items: KnowledgeItem[]; loading: boolean;
  onView: (i: KnowledgeItem) => void; onEdit: (i: KnowledgeItem) => void; onDelete: (id: string) => void;
  page: number; totalPages: number; total: number; onPageChange: (p: number) => void;
}) {
  if (loading && items.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading knowledge items…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <BookOpen className="w-12 h-12 mx-auto mb-3 text-slate-600" />
        <p className="text-slate-400 mb-1">No knowledge items found</p>
        <p className="text-xs text-slate-600">Press <kbd className="px-1.5 py-0.5 bg-slate-700/50 rounded text-slate-400">N</kbd> to create your first item</p>
      </div>
    );
  }

  return (
    <div>
      <div className="text-xs text-slate-500 mb-2">{total} item{total !== 1 ? 's' : ''} {loading && <Loader2 className="inline w-3 h-3 animate-spin ml-1" />}</div>
      <div className="space-y-2">
        {items.map(item => {
          const cat = getCategoryMeta(item.category);
          const StatusIcon = STATUS_ICONS[item.status] || Clock;
          return (
            <div
              key={item.id}
              className="group p-4 bg-slate-800/30 border border-slate-700/50 rounded-xl hover:border-violet-500/30 hover:bg-slate-800/50 transition-all cursor-pointer"
              onClick={() => onView(item)}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cat.color.split(' ').slice(0, 1).join(' ')}`}>
                  <cat.icon className={`w-4 h-4 ${cat.color.split(' ')[1]}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-medium text-white truncate">{item.title}</h3>
                    <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${cat.color}`}>
                      {cat.label}
                    </span>
                    <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${PRIORITY_COLORS[item.priority]}`}>
                      {item.priority}
                    </span>
                    <span className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border ${STATUS_COLORS[item.status]}`}>
                      <StatusIcon className="w-3 h-3" />
                      {item.status}
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-xs text-slate-400 line-clamp-1 mb-1.5">{item.description}</p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    {item.tags.slice(0, 4).map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-slate-700/40 text-slate-400">
                        <Tag className="w-2.5 h-2.5" /> {tag}
                      </span>
                    ))}
                    {item.tags.length > 4 && <span className="text-[10px] text-slate-600">+{item.tags.length - 4}</span>}
                    {item.related_modules.length > 0 && (
                      <span className="text-[10px] text-slate-600">• {item.related_modules.slice(0, 2).join(', ')}{item.related_modules.length > 2 ? ` +${item.related_modules.length - 2}` : ''}</span>
                    )}
                    <span className="text-[10px] text-slate-600 ml-auto">{formatDate(item.updated_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={(e) => { e.stopPropagation(); onEdit(item); }} className="p-1.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-white" title="Edit">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} className="p-1.5 rounded hover:bg-red-500/10 text-slate-400 hover:text-red-400" title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="px-3 py-1.5 rounded-lg text-sm bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-slate-400">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="px-3 py-1.5 rounded-lg text-sm bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Item Detail                                                        */
/* ------------------------------------------------------------------ */

function ItemDetail({
  item, relationships, onEdit, onDelete, onView, onRefresh, allItems,
}: {
  item: KnowledgeItem; relationships: KnowledgeRelationship[];
  onEdit: () => void; onDelete: () => void;
  onView: (i: KnowledgeItem) => void; onRefresh: () => void;
  allItems: KnowledgeItem[];
}) {
  const cat = getCategoryMeta(item.category);
  const StatusIcon = STATUS_ICONS[item.status] || Clock;
  const [showRelForm, setShowRelForm] = useState(false);
  const [relTarget, setRelTarget] = useState('');
  const [relType, setRelType] = useState('related_to');
  const [relSaving, setRelSaving] = useState(false);

  const addRelationship = async () => {
    if (!relTarget) return;
    setRelSaving(true);
    try {
      const res = await fetch(`/api/knowledge/${item.id}/relationships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_id: relTarget, relationship_type: relType }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      setShowRelForm(false);
      setRelTarget('');
      onRefresh();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setRelSaving(false);
    }
  };

  const removeRelationship = async (relId: string) => {
    if (!confirm('Remove this relationship?')) return;
    try {
      await fetch(`/api/knowledge/relationships/${relId}`, { method: 'DELETE' });
      onRefresh();
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="p-6 bg-slate-800/30 border border-slate-700/50 rounded-xl">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${cat.color.split(' ').slice(0, 1).join(' ')}`}>
            <cat.icon className={`w-6 h-6 ${cat.color.split(' ')[1]}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-white mb-2">{item.title}</h2>
            <div className="flex items-center gap-2 flex-wrap mb-4">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium border ${cat.color}`}>{cat.label}</span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium border ${PRIORITY_COLORS[item.priority]}`}>{item.priority}</span>
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs border ${STATUS_COLORS[item.status]}`}>
                <StatusIcon className="w-3 h-3" /> {item.status}
              </span>
            </div>
            {item.description && (
              <div className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{item.description}</div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={onEdit} className="px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5" /> Edit
            </button>
            <button onClick={onDelete} className="px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium transition-colors border border-red-500/20 flex items-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        </div>
      </div>

      {/* Meta Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Tags */}
        {item.tags.length > 0 && (
          <div className="p-4 bg-slate-800/30 border border-slate-700/50 rounded-xl">
            <h4 className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1"><Tag className="w-3 h-3" /> Tags</h4>
            <div className="flex flex-wrap gap-1.5">
              {item.tags.map(tag => (
                <span key={tag} className="px-2 py-0.5 rounded text-xs bg-violet-500/10 text-violet-400 border border-violet-500/20">{tag}</span>
              ))}
            </div>
          </div>
        )}
        {/* Modules */}
        {item.related_modules.length > 0 && (
          <div className="p-4 bg-slate-800/30 border border-slate-700/50 rounded-xl">
            <h4 className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1"><Boxes className="w-3 h-3" /> Related Modules</h4>
            <div className="flex flex-wrap gap-1.5">
              {item.related_modules.map(mod => (
                <span key={mod} className="px-2 py-0.5 rounded text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20">{mod}</span>
              ))}
            </div>
          </div>
        )}
        {/* Timestamps */}
        <div className="p-4 bg-slate-800/30 border border-slate-700/50 rounded-xl">
          <h4 className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1"><Clock className="w-3 h-3" /> Timestamps</h4>
          <div className="space-y-1 text-xs text-slate-400">
            <div>Created: {formatDateFull(item.created_at)}</div>
            <div>Updated: {formatDateFull(item.updated_at)}</div>
            {item.created_by && <div>By: {item.created_by}</div>}
          </div>
        </div>
      </div>

      {/* Metadata */}
      {item.metadata && Object.keys(item.metadata).length > 0 && (
        <div className="p-4 bg-slate-800/30 border border-slate-700/50 rounded-xl">
          <h4 className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1"><Database className="w-3 h-3" /> Metadata</h4>
          <pre className="text-xs text-slate-400 bg-slate-900/50 p-3 rounded-lg overflow-x-auto">
            {JSON.stringify(item.metadata, null, 2)}
          </pre>
        </div>
      )}

      {/* Relationships */}
      <div className="p-4 bg-slate-800/30 border border-slate-700/50 rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-medium text-slate-500 flex items-center gap-1"><Link2 className="w-3 h-3" /> Relationships ({relationships.length})</h4>
          <button
            onClick={() => setShowRelForm(!showRelForm)}
            className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>

        {showRelForm && (
          <div className="mb-3 p-3 bg-slate-900/50 rounded-lg space-y-2">
            <div className="flex gap-2">
              <select value={relType} onChange={e => setRelType(e.target.value)} className="flex-1 px-2 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded text-xs text-slate-300 focus:outline-none">
                {RELATIONSHIP_TYPES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <select value={relTarget} onChange={e => setRelTarget(e.target.value)} className="flex-[2] px-2 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded text-xs text-slate-300 focus:outline-none">
                <option value="">Select target item…</option>
                {allItems.filter(i => i.id !== item.id).map(i => (
                  <option key={i.id} value={i.id}>{i.title} ({getCategoryMeta(i.category).label})</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowRelForm(false)} className="px-2 py-1 text-xs text-slate-400 hover:text-white">Cancel</button>
              <button onClick={addRelationship} disabled={!relTarget || relSaving} className="px-3 py-1 rounded bg-violet-600 hover:bg-violet-500 text-white text-xs disabled:opacity-40">
                {relSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Add'}
              </button>
            </div>
          </div>
        )}

        {relationships.length === 0 && !showRelForm && (
          <p className="text-xs text-slate-600">No relationships yet</p>
        )}
        <div className="space-y-1.5">
          {relationships.map(rel => (
            <div key={rel.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/30 text-xs group">
              <span className="text-slate-400">
                {rel.source_id === item.id ? item.title : (rel.source_title || rel.source_id)}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-500 text-[10px]">
                {RELATIONSHIP_TYPES.find(r => r.value === rel.relationship_type)?.label || rel.relationship_type}
              </span>
              <ArrowRight className="w-3 h-3 text-slate-600" />
              <span className="text-violet-400">
                {rel.source_id === item.id ? (rel.target_title || rel.target_id) : item.title}
              </span>
              <button
                onClick={() => removeRelationship(rel.id)}
                className="ml-auto p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-all"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Item Form (Create / Edit)                                          */
/* ------------------------------------------------------------------ */

function ItemForm({
  item, onSaved, onCancel, allItems,
}: {
  item: KnowledgeItem | null; onSaved: () => void; onCancel: () => void; allItems: KnowledgeItem[];
}) {
  const isEdit = !!item;
  const [title, setTitle] = useState(item?.title || '');
  const [category, setCategory] = useState<CategoryType>(item?.category || 'business_rule');
  const [description, setDescription] = useState(item?.description || '');
  const [status, setStatus] = useState<string>(item?.status || 'draft');
  const [priority, setPriority] = useState<string>(item?.priority || 'medium');
  const [tagsInput, setTagsInput] = useState(item?.tags?.join(', ') || '');
  const [modulesInput, setModulesInput] = useState(item?.related_modules?.join(', ') || '');
  const [metadataInput, setMetadataInput] = useState(item?.metadata ? JSON.stringify(item.metadata, null, 2) : '{}');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const parseTags = (s: string) => s.split(',').map(t => t.trim()).filter(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setFormError('Title is required'); return; }
    setFormError(null);
    setSaving(true);

    let metadata = {};
    try {
      metadata = metadataInput.trim() ? JSON.parse(metadataInput) : {};
    } catch {
      setFormError('Invalid JSON in metadata');
      setSaving(false);
      return;
    }

    const payload = {
      title: title.trim(),
      category,
      description: description.trim(),
      status,
      priority,
      tags: parseTags(tagsInput),
      related_modules: parseTags(modulesInput),
      metadata,
    };

    try {
      const url = isEdit ? `/api/knowledge/${item!.id}` : '/api/knowledge';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      onSaved();
    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      <div className="p-6 bg-slate-800/30 border border-slate-700/50 rounded-xl">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          {isEdit ? <Edit3 className="w-5 h-5 text-violet-400" /> : <Plus className="w-5 h-5 text-violet-400" />}
          {isEdit ? 'Edit Knowledge Item' : 'Create Knowledge Item'}
        </h3>

        {formError && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> {formError}
          </div>
        )}

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., User login must enforce 2FA for admin roles"
              className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
              autoFocus
            />
          </div>

          {/* Category + Priority + Status row */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value as CategoryType)} className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-lg text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500/40">
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-lg text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500/40">
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-lg text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500/40">
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="deprecated">Deprecated</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of this knowledge item…"
              rows={6}
              className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 resize-y"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Tags <span className="text-slate-600">(comma-separated)</span></label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g., auth, login, security, 2fa"
              className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
            />
            {tagsInput && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {parseTags(tagsInput).map(tag => (
                  <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] bg-violet-500/10 text-violet-400 border border-violet-500/20">{tag}</span>
                ))}
              </div>
            )}
          </div>

          {/* Related Modules */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Related Modules <span className="text-slate-600">(comma-separated)</span></label>
            <input
              type="text"
              value={modulesInput}
              onChange={(e) => setModulesInput(e.target.value)}
              placeholder="e.g., Authentication, User Management, Dashboard"
              className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
            />
          </div>

          {/* Metadata */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Metadata <span className="text-slate-600">(JSON)</span></label>
            <textarea
              value={metadataInput}
              onChange={(e) => setMetadataInput(e.target.value)}
              placeholder='{"key": "value"}'
              rows={4}
              className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-lg text-sm text-slate-300 font-mono placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 resize-y"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving || !title.trim()}
          className="px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors shadow-lg shadow-violet-600/20 disabled:opacity-40 flex items-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isEdit ? 'Save Changes' : 'Create Item'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 text-sm font-medium transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
