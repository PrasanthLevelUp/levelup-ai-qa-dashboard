'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BookOpen, Search, Check, X, ChevronDown, ChevronUp,
  Hash, Loader2, AlertTriangle, FolderOpen, Sparkles,
  Info,
} from 'lucide-react';
import { useProject } from '@/lib/project-context';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface KnowledgeItem {
  id: number;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  tags: string[];
  related_modules: string[];
  token_count?: number;
  created_at: string;
}

interface KnowledgeSelectorProps {
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  /** Optional context for smart suggestions */
  contextTitle?: string;
  contextDescription?: string;
}

/* ------------------------------------------------------------------ */
/*  Token estimation — rough heuristic                                 */
/* ------------------------------------------------------------------ */

function estimateTokens(item: KnowledgeItem): number {
  if (item.token_count) return item.token_count;
  const text = `${item.title} ${item.description} ${(item.tags || []).join(' ')}`;
  return Math.ceil(text.length / 4); // ~4 chars per token
}

/* ------------------------------------------------------------------ */
/*  Category colors & icons                                            */
/* ------------------------------------------------------------------ */

const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  'business_rule': { bg: 'bg-blue-500/15', text: 'text-blue-300', border: 'border-blue-500/25' },
  'workflow': { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/25' },
  'api_spec': { bg: 'bg-orange-500/15', text: 'text-orange-300', border: 'border-orange-500/25' },
  'ui_pattern': { bg: 'bg-pink-500/15', text: 'text-pink-300', border: 'border-pink-500/25' },
  'test_pattern': { bg: 'bg-violet-500/15', text: 'text-violet-300', border: 'border-violet-500/25' },
  'data_model': { bg: 'bg-cyan-500/15', text: 'text-cyan-300', border: 'border-cyan-500/25' },
  'security': { bg: 'bg-red-500/15', text: 'text-red-300', border: 'border-red-500/25' },
  'integration': { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/25' },
};

const PRIORITY_DOTS: Record<string, string> = {
  critical: 'bg-red-400',
  high: 'bg-orange-400',
  medium: 'bg-amber-400',
  low: 'bg-slate-400',
};

function getCategoryStyle(cat: string) {
  return CATEGORY_STYLES[cat] || { bg: 'bg-slate-500/15', text: 'text-slate-300', border: 'border-slate-500/25' };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function KnowledgeSelector({
  selectedIds,
  onChange,
  contextTitle = '',
  contextDescription = '',
}: KnowledgeSelectorProps) {
  const { activeProject } = useProject();
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Fetch knowledge items
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const headers: Record<string, string> = {};
        if (activeProject?.id) headers['x-project-id'] = String(activeProject.id);
        const res = await fetch('/api/knowledge?limit=200', { headers });
        if (!res.ok) throw new Error(`Failed to load (${res.status})`);
        const data = await res.json();
        if (!cancelled) {
          setItems(Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeProject?.id]);

  // Group by category
  const categories = useMemo(() => {
    const map: Record<string, KnowledgeItem[]> = {};
    items.forEach(item => {
      const cat = item.category || 'uncategorized';
      if (!map[cat]) map[cat] = [];
      map[cat].push(item);
    });
    return Object.entries(map).sort((a, b) => b[1].length - a[1].length);
  }, [items]);

  // Filter by search
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      item =>
        item.title.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.category?.toLowerCase().includes(q) ||
        (item.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }, [items, searchQuery]);

  // Smart suggestions based on context
  const suggestedIds = useMemo(() => {
    if (!contextTitle && !contextDescription) return [];
    const context = `${contextTitle} ${contextDescription}`.toLowerCase();
    const words = context.split(/\s+/).filter(w => w.length > 3);
    return items
      .map(item => {
        const text = `${item.title} ${item.description} ${(item.tags || []).join(' ')} ${(item.related_modules || []).join(' ')}`.toLowerCase();
        const score = words.reduce((s, w) => s + (text.includes(w) ? 1 : 0), 0);
        return { id: item.id, score };
      })
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(r => r.id);
  }, [items, contextTitle, contextDescription]);

  const toggleItem = useCallback((id: number) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter(i => i !== id) : [...selectedIds, id]);
  }, [selectedIds, onChange]);

  const toggleCategory = useCallback((cat: string) => {
    const catItems = items.filter(i => (i.category || 'uncategorized') === cat);
    const catIds = catItems.map(i => i.id);
    const allSelected = catIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      onChange(selectedIds.filter(id => !catIds.includes(id)));
    } else {
      onChange([...new Set([...selectedIds, ...catIds])]);
    }
  }, [items, selectedIds, onChange]);

  const totalTokens = useMemo(
    () => items.filter(i => selectedIds.includes(i.id)).reduce((s, i) => s + estimateTokens(i), 0),
    [items, selectedIds]
  );

  const selectSuggested = useCallback(() => {
    onChange([...new Set([...selectedIds, ...suggestedIds])]);
  }, [selectedIds, suggestedIds, onChange]);

  // Collapsed summary view
  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-violet-500/30 transition-all text-left group"
      >
        <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
          <BookOpen className="w-4 h-4 text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-200">App Knowledge</span>
            {selectedIds.length > 0 && (
              <span className="text-xs bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full">
                {selectedIds.length} selected
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {selectedIds.length > 0
              ? `~${totalTokens.toLocaleString()} tokens • ~$${(totalTokens * 0.00002).toFixed(3)} est.`
              : 'Select knowledge items to improve test generation accuracy'}
          </p>
        </div>
        <ChevronDown className="w-4 h-4 text-slate-500 group-hover:text-violet-400 transition-colors" />
      </button>
    );
  }

  return (
    <div className="rounded-xl bg-slate-800/50 border border-violet-500/30 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/50">
        <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
          <BookOpen className="w-4 h-4 text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">App Knowledge</span>
            {selectedIds.length > 0 && (
              <span className="text-xs bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full">
                {selectedIds.length} selected • ~{totalTokens.toLocaleString()} tokens
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">Select relevant knowledge for more accurate test generation</p>
        </div>
        <button
          type="button"
          onClick={() => setIsExpanded(false)}
          className="p-1.5 hover:bg-slate-700/50 rounded-lg transition-all"
        >
          <ChevronUp className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Search + Suggestions */}
      <div className="px-4 pt-3 pb-2 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search knowledge items..."
            className="w-full bg-slate-900/50 border border-slate-600/50 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-slate-500 hover:text-white" />
            </button>
          )}
        </div>

        {/* AI Suggestions */}
        {suggestedIds.length > 0 && !searchQuery && (
          <button
            type="button"
            onClick={selectSuggested}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/15 transition-all text-left"
          >
            <Sparkles className="w-4 h-4 text-violet-400 flex-shrink-0" />
            <span className="text-xs text-violet-300">
              <strong>Smart suggestion:</strong> {suggestedIds.length} relevant item{suggestedIds.length !== 1 ? 's' : ''} found based on your title & description
            </span>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pb-4 max-h-72 overflow-y-auto scrollbar-thin">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
            <span className="text-sm text-slate-400 ml-2">Loading knowledge...</span>
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 py-4 text-sm text-red-400">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8">
            <BookOpen className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No knowledge items yet</p>
            <p className="text-xs text-slate-500 mt-1">Add items in the App Knowledge page to enrich test generation</p>
          </div>
        ) : searchQuery ? (
          /* Flat filtered list */
          <div className="space-y-1.5">
            {filteredItems.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">No items match "{searchQuery}"</p>
            )}
            {filteredItems.map(item => (
              <KnowledgeItemRow
                key={item.id}
                item={item}
                selected={selectedIds.includes(item.id)}
                suggested={suggestedIds.includes(item.id)}
                onToggle={() => toggleItem(item.id)}
              />
            ))}
          </div>
        ) : (
          /* Categorized list */
          <div className="space-y-2">
            {categories.map(([cat, catItems]) => {
              const catIds = catItems.map(i => i.id);
              const selectedCount = catIds.filter(id => selectedIds.includes(id)).length;
              const allSelected = selectedCount === catIds.length;
              const isOpen = expandedCategory === cat;

              return (
                <div key={cat} className="rounded-lg border border-slate-700/30 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedCategory(isOpen ? null : cat)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-700/20 transition-all text-left"
                  >
                    {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500 -rotate-90" />}
                    <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide flex-1">
                      {cat.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] text-slate-500">{catItems.length} item{catItems.length !== 1 ? 's' : ''}</span>
                    {selectedCount > 0 && (
                      <span className="text-[10px] bg-violet-500/20 text-violet-300 px-1.5 py-0.5 rounded">
                        {selectedCount}/{catItems.length}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); toggleCategory(cat); }}
                      className={`text-[10px] px-1.5 py-0.5 rounded transition-all ${
                        allSelected
                          ? 'bg-violet-500/30 text-violet-300 hover:bg-red-500/20 hover:text-red-300'
                          : 'bg-slate-700/50 text-slate-400 hover:bg-violet-500/20 hover:text-violet-300'
                      }`}
                    >
                      {allSelected ? 'Deselect All' : 'Select All'}
                    </button>
                  </button>
                  {isOpen && (
                    <div className="border-t border-slate-700/30 px-2 py-1.5 space-y-1">
                      {catItems.map(item => (
                        <KnowledgeItemRow
                          key={item.id}
                          item={item}
                          selected={selectedIds.includes(item.id)}
                          suggested={suggestedIds.includes(item.id)}
                          onToggle={() => toggleItem(item.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer — token summary */}
      {selectedIds.length > 0 && (
        <div className="px-4 py-2.5 border-t border-slate-700/50 bg-slate-900/30 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Hash className="w-3.5 h-3.5" />
            <span>~{totalTokens.toLocaleString()} tokens</span>
            <span className="text-slate-600">•</span>
            <span>~${(totalTokens * 0.00002).toFixed(3)} est. cost</span>
          </div>
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs text-slate-500 hover:text-red-400 transition-colors"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Item Row                                                           */
/* ------------------------------------------------------------------ */

function KnowledgeItemRow({
  item,
  selected,
  suggested,
  onToggle,
}: {
  item: KnowledgeItem;
  selected: boolean;
  suggested: boolean;
  onToggle: () => void;
}) {
  const style = getCategoryStyle(item.category);
  const tokens = estimateTokens(item);

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full flex items-start gap-2.5 px-3 py-2 rounded-lg transition-all text-left ${
        selected
          ? 'bg-violet-500/15 border border-violet-500/30'
          : suggested
          ? 'bg-slate-800/80 border border-amber-500/20 hover:border-violet-500/30'
          : 'bg-slate-800/30 border border-transparent hover:bg-slate-700/30'
      }`}
    >
      {/* Checkbox */}
      <div className={`w-4 h-4 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${
        selected ? 'bg-violet-500 border-violet-400' : 'border-slate-600 bg-slate-800'
      }`}>
        {selected && <Check className="w-3 h-3 text-white" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-slate-200 truncate">{item.title}</span>
          {suggested && !selected && (
            <span title="Suggested"><Sparkles className="w-3 h-3 text-amber-400 flex-shrink-0" /></span>
          )}
        </div>
        {item.description && (
          <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{item.description}</p>
        )}
        <div className="flex items-center gap-1.5 mt-1">
          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${style.bg} ${style.text} ${style.border}`}>
            {(item.category || 'uncategorized').replace(/_/g, ' ')}
          </span>
          {item.priority && (
            <span className="flex items-center gap-1 text-[10px] text-slate-500">
              <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOTS[item.priority] || 'bg-slate-500'}`} />
              {item.priority}
            </span>
          )}
          <span className="text-[10px] text-slate-600 ml-auto">~{tokens} tok</span>
        </div>
      </div>
    </button>
  );
}
