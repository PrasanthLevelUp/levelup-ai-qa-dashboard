'use client';

/* -------------------------------------------------------------------------- */
/*  ProfileDetail                                                             */
/*  Rich, data-driven breakdown of a crawled Application Profile.            */
/*  Renders inside the expanded profile row to showcase the cached           */
/*  intelligence that powers 30× faster, grounded script generation.         */
/* -------------------------------------------------------------------------- */

import { useMemo, useEffect, useState, useCallback } from 'react';
import {
  Network,
  Loader2,
  AlertTriangle,
  Shield,
  Zap,
  KeyRound,
  Fingerprint,
  Boxes,
  MousePointerClick,
  Type as TypeIcon,
  Link as LinkIcon,
  ChevronDownSquare,
  CheckSquare,
  FileText,
  Target,
  Sparkles,
  Calendar,
  Clock,
  Timer,
  Layers,
  ShieldCheck,
  ShieldAlert,
  History,
  GitCompare,
  Gauge,
  PlusCircle,
  MinusCircle,
  RefreshCw,
  ArrowRightLeft,
  Search,
  Copy,
  Check,
  Crosshair,
  ChevronRight,
  Brain,
  ListOrdered,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types (loose — crawl_data shape varies between single & multi-page)       */
/* -------------------------------------------------------------------------- */

interface ProfileLike {
  id: string;
  base_url: string;
  app_fingerprint: string | null;
  crawl_data: any;
  auth_required: boolean;
  auth_config?: {
    loginUrl?: string;
    hasCredentials?: boolean;
    username?: string;
  } | null;
  crawled_at: string;
  expires_at: string;
  page_count: number;
  total_elements: number;
  total_forms: number;
  total_interactive: number;
  status: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

/* -- App Profile versioning & change-engine shapes (from new API endpoints) -- */

interface CoverageData {
  version: number;
  coveragePct: number;
  crawledPages: number;
  discoveredPages: number;
  elementCount: number;
  formCount: number;
  selectorCount: number;
  capturedAt: string | null;
}

interface VersionRow {
  version: number;
  coveragePct: number;
  pageCount: number;
  discoveredPages: number;
  elementCount: number;
  formCount: number;
  selectorCount: number;
  createdAt: string;
}

type ChangeType =
  | 'PAGE_ADDED' | 'PAGE_REMOVED'
  | 'ELEMENT_ADDED' | 'ELEMENT_REMOVED'
  | 'LOCATOR_CHANGED' | 'TEXT_CHANGED'
  | 'FORM_ADDED' | 'FORM_REMOVED'
  | 'NAVIGATION_CHANGED';

interface ChangeRow {
  id: number;
  versionFrom: number;
  versionTo: number;
  type: ChangeType;
  page: string | null;
  oldValue: string | null;
  newValue: string | null;
  detail: string | null;
  severity: 'low' | 'medium' | 'high' | null;
  createdAt: string;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const CHANGE_META: Record<ChangeType, { label: string; icon: any; color: string; chip: string }> = {
  PAGE_ADDED:        { label: 'Page added',     icon: PlusCircle,     color: 'text-emerald-300', chip: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' },
  PAGE_REMOVED:      { label: 'Page removed',   icon: MinusCircle,    color: 'text-red-300',     chip: 'bg-red-500/10 text-red-300 border-red-500/20' },
  ELEMENT_ADDED:     { label: 'Element added',  icon: PlusCircle,     color: 'text-emerald-300', chip: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' },
  ELEMENT_REMOVED:   { label: 'Element removed',icon: MinusCircle,    color: 'text-orange-300',  chip: 'bg-orange-500/10 text-orange-300 border-orange-500/20' },
  LOCATOR_CHANGED:   { label: 'Locator changed',icon: ArrowRightLeft, color: 'text-violet-300',  chip: 'bg-violet-500/10 text-violet-300 border-violet-500/20' },
  TEXT_CHANGED:      { label: 'Text changed',   icon: TypeIcon,       color: 'text-sky-300',     chip: 'bg-sky-500/10 text-sky-300 border-sky-500/20' },
  FORM_ADDED:        { label: 'Form added',     icon: PlusCircle,     color: 'text-emerald-300', chip: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' },
  FORM_REMOVED:      { label: 'Form removed',   icon: MinusCircle,    color: 'text-red-300',     chip: 'bg-red-500/10 text-red-300 border-red-500/20' },
  NAVIGATION_CHANGED:{ label: 'Navigation changed', icon: LinkIcon,   color: 'text-amber-300',   chip: 'bg-amber-500/10 text-amber-300 border-amber-500/20' },
};

function coverageColor(pct: number): string {
  if (pct >= 70) return 'text-emerald-300';
  if (pct >= 40) return 'text-amber-300';
  return 'text-red-300';
}

function coverageBar(pct: number): string {
  if (pct >= 70) return 'bg-emerald-500';
  if (pct >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function expiresIn(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days >= 1) return `${days} day${days !== 1 ? 's' : ''}`;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  return `${hours}h`;
}

/** Pull a flat list of element-like records from any crawl_data shape. */
function collectElements(crawlData: any): any[] {
  if (!crawlData) return [];
  const out: any[] = [];
  if (Array.isArray(crawlData.pages) && crawlData.pages.length > 0) {
    for (const p of crawlData.pages) {
      if (Array.isArray(p?.elements)) out.push(...p.elements);
    }
  }
  // Single-page crawl result: elements live at the top level.
  if (out.length === 0 && Array.isArray(crawlData.elements)) {
    out.push(...crawlData.elements);
  }
  return out;
}

/** Pull a flat list of forms from any crawl_data shape. */
function collectForms(crawlData: any): any[] {
  if (!crawlData) return [];
  const out: any[] = [];
  if (Array.isArray(crawlData.pages) && crawlData.pages.length > 0) {
    for (const p of crawlData.pages) {
      if (Array.isArray(p?.forms)) {
        for (const f of p.forms) out.push({ ...f, _pageTitle: p.title, _pageUrl: p.finalUrl || p.url });
      }
    }
  }
  if (out.length === 0 && Array.isArray(crawlData.forms)) {
    out.push(...crawlData.forms);
  }
  return out;
}

/** Build a normalized sitemap list from any crawl_data shape. */
function collectPages(crawlData: any): any[] {
  if (!crawlData) return [];
  if (Array.isArray(crawlData.siteMap) && crawlData.siteMap.length > 0) {
    return crawlData.siteMap.map((n: any) => ({
      url: n.url,
      title: n.title,
      pageType: n.pageType,
      elementCount: n.elementCount ?? 0,
      formCount: n.formCount ?? 0,
    }));
  }
  if (Array.isArray(crawlData.pages) && crawlData.pages.length > 0) {
    return crawlData.pages.map((p: any) => ({
      url: p.finalUrl || p.url,
      title: p.title,
      pageType: p.pageType,
      elementCount: Array.isArray(p.elements) ? p.elements.length : (p.interactiveElements ?? 0),
      formCount: Array.isArray(p.forms) ? p.forms.length : 0,
    }));
  }
  // Single page
  if (crawlData.url || crawlData.title) {
    return [{
      url: crawlData.finalUrl || crawlData.url,
      title: crawlData.title,
      pageType: crawlData.pageType,
      elementCount: Array.isArray(crawlData.elements) ? crawlData.elements.length : 0,
      formCount: Array.isArray(crawlData.forms) ? crawlData.forms.length : 0,
    }];
  }
  return [];
}

/** Classify an element into a friendly interactive category. */
function classifyElement(el: any): string {
  const tag = String(el?.tag || '').toLowerCase();
  const type = String(el?.type || '').toLowerCase();
  const role = String(el?.role || el?.ariaRole || '').toLowerCase();

  if (tag === 'a' || role === 'link') return 'link';
  if (tag === 'button' || role === 'button' || type === 'submit' || type === 'button') return 'button';
  if (tag === 'select' || role === 'combobox' || role === 'listbox') return 'select';
  if (tag === 'textarea') return 'input';
  if (type === 'checkbox' || role === 'checkbox') return 'checkbox';
  if (type === 'radio' || role === 'radio') return 'radio';
  if (tag === 'input') return 'input';
  return 'other';
}

interface StrategyTally {
  dataTestId: number;
  id: number;
  name: number;
  role: number;
  text: number;
  css: number;
  xpath: number;
}

/** Determine the recommended (primary) strategy for an element. */
function recommendedStrategy(el: any): keyof StrategyTally | null {
  const s = el?.selectors;
  if (s?.recommendedStrategy) {
    const r = String(s.recommendedStrategy).toLowerCase();
    if (r.includes('testid')) return 'dataTestId';
    if (r === 'id') return 'id';
    if (r === 'name') return 'name';
    if (r === 'role' || r === 'aria') return 'role';
    if (r === 'text') return 'text';
    if (r === 'css') return 'css';
    if (r === 'xpath') return 'xpath';
  }
  // Derive from available selectors / raw attributes (best → worst).
  // Read the raw DOM attributes too: many apps (e.g. SauceDemo) expose their
  // test hook as `data-test` which the crawler keeps only in `attributes`.
  if (s?.dataTestId || el?.dataTestId || hasRawTestHook(el)) return 'dataTestId';
  if (s?.id || el?.id) return 'id';
  if (s?.name || el?.name) return 'name';
  if (s?.role || el?.role || el?.ariaRole || el?.ariaLabel) return 'role';
  if (s?.text) return 'text';
  if (s?.css) return 'css';
  if (s?.xpath) return 'xpath';
  return null;
}

const STABLE_STRATEGIES = new Set(['dataTestId', 'id', 'name', 'role']);

/* -------------------------------------------------------------------------- */
/*  Saved-locator resolution                                                  */
/*  Turns a crawled element into the concrete, copy-ready locator the         */
/*  generated scripts actually use — so users can SEE (and trust) exactly     */
/*  what LevelUp saved for their app.                                         */
/* -------------------------------------------------------------------------- */

/** Test-hook attribute synonyms, in preference order (matches the backend). */
const TEST_HOOK_ATTRS = [
  'data-testid', 'data-test-id', 'data-test', 'data-qa', 'data-cy',
  'data-test-selector', 'data-automation-id', 'data-automationid', 'data-auto',
];

/** Read the real test-hook attribute (name + value) straight from the DOM. */
function readTestHook(el: any): { attr: string; value: string } | null {
  const attrs = (el?.attributes || {}) as Record<string, string>;
  const lower: Record<string, string> = {};
  for (const k of Object.keys(attrs)) lower[k.toLowerCase()] = attrs[k];
  for (const a of TEST_HOOK_ATTRS) {
    if (lower[a]) return { attr: a, value: lower[a] };
  }
  // Fall back to the normalized selector field the crawler may expose.
  const fromField = el?.selectors?.dataTestId || el?.dataTestId;
  if (fromField) {
    const m = String(fromField).match(/\[([\w-]+)\s*=\s*["']?([^"'\]]+)/);
    if (m) return { attr: m[1], value: m[2] };
    return { attr: 'data-testid', value: String(fromField) };
  }
  return null;
}

/** True when the element carries a raw test-hook attribute in its DOM attrs. */
function hasRawTestHook(el: any): boolean {
  return readTestHook(el) !== null;
}

/** Escape a value for use inside a double-quoted attribute selector. */
function q(v: string): string {
  return String(v).replace(/"/g, '\\"');
}

/**
 * Build the concrete CSS/Playwright locator for an element following the
 * recommended strategy, mirroring how the generator grounds selectors.
 */
function resolveConcreteSelector(el: any, strategy: keyof StrategyTally | null): string {
  const s = el?.selectors || {};
  switch (strategy) {
    case 'dataTestId': {
      const hook = readTestHook(el);
      if (hook) return `[${hook.attr}="${q(hook.value)}"]`;
      break;
    }
    case 'id': {
      const id = s.id || el?.id;
      if (id) return `#${id}`;
      break;
    }
    case 'name': {
      const name = s.name || el?.name;
      if (name) return `[name="${q(name)}"]`;
      break;
    }
    case 'role': {
      const aria = el?.ariaLabel || s.ariaLabel;
      if (aria) return `[aria-label="${q(aria)}"]`;
      const role = el?.role || el?.ariaRole || s.role;
      const tag = String(el?.tag || '').toLowerCase();
      if (role) return `role=${role}`;
      if (tag) return tag;
      break;
    }
    case 'text': {
      const t = s.text || el?.textContent;
      if (t) return `text=${String(t).trim().slice(0, 40)}`;
      break;
    }
    case 'css':
      if (s.css) return String(s.css);
      break;
    case 'xpath':
      if (s.xpath) return String(s.xpath);
      break;
  }
  // Best-effort fallback so a row is never blank.
  return (
    s.css || s.xpath ||
    (s.id || el?.id ? `#${s.id || el?.id}` : '') ||
    String(el?.tag || 'element').toLowerCase()
  );
}

/** Human-friendly label for a locator row. */
function elementLabel(el: any): string {
  const txt = (el?.textContent || el?.text || '').toString().trim();
  const candidate =
    el?.ariaLabel ||
    (txt && txt.length <= 40 ? txt : '') ||
    el?.placeholder ||
    el?.name ||
    el?.id ||
    el?.selectors?.dataTestId ||
    '';
  if (candidate) return String(candidate).trim().slice(0, 60);
  const tag = String(el?.tag || 'element').toLowerCase();
  const type = el?.type ? ` [${el.type}]` : '';
  return `${tag}${type}`;
}

/* -------------------------------------------------------------------------- */
/*  Element Intelligence — client mirror of the backend's single, canonical   */
/*  locator-ranking brain (src/intelligence/element-intelligence.ts). Both    */
/*  Script Generation and Self-Healing consume this SAME ranking, so the      */
/*  dashboard shows users EXACTLY what the engines resolve: one primary       */
/*  locator plus confidence-scored, reasoned alternatives — never invented.   */
/* -------------------------------------------------------------------------- */

/** A single ranked candidate locator (mirrors backend LocatorCandidate). */
interface RankedCandidate {
  /** Ready-to-copy Playwright locator. */
  playwright: string;
  /** Raw CSS / attribute selector (compact display + copy). */
  css: string;
  strategy: keyof StrategyTally | 'placeholder' | 'label';
  /** 0–1 confidence, matching the backend weights. */
  confidence: number;
  reasoning: string;
  stable: boolean;
}

/** Looks like a framework-generated / unstable id — never target it. */
function isDynamicIdClient(id: string | undefined): boolean {
  if (!id) return true;
  return (
    /\d{4,}/.test(id) ||
    /[a-f0-9]{8,}/i.test(id) ||
    /^:r[0-9a-z]+:?$/i.test(id) ||
    /(ember|react|ng-|mui-|css-)/i.test(id)
  );
}

/** Case-insensitive raw-attribute lookup. */
function rawAttr(el: any, key: string): string | undefined {
  const attrs = (el?.attributes || {}) as Record<string, string>;
  if (attrs[key]) return attrs[key];
  const lower = key.toLowerCase();
  for (const k of Object.keys(attrs)) if (k.toLowerCase() === lower && attrs[k]) return attrs[k];
  return undefined;
}

/** Infer a stable ARIA-ish role (mirrors backend inferRole). */
function inferRoleClient(el: any): string {
  if (el?.role) return String(el.role).toLowerCase();
  if (el?.ariaRole) return String(el.ariaRole).toLowerCase();
  const tag = String(el?.tag || '').toLowerCase();
  const t = String(el?.type || rawAttr(el, 'type') || '').toLowerCase();
  if (tag === 'a') return 'link';
  if (tag === 'button') return 'button';
  if (tag === 'input') {
    if (t === 'submit' || t === 'button') return 'button';
    if (t === 'checkbox') return 'checkbox';
    if (t === 'radio') return 'radio';
    return 'textbox';
  }
  if (tag === 'select') return 'combobox';
  if (tag === 'textarea') return 'textbox';
  return '';
}

/**
 * Produce the ranked candidate locators for an element, mirroring the backend
 * `rankLocatorCandidates` priority + confidence exactly (data-test 0.96 →
 * data-testid 0.95 → data-cy 0.93 → data-qa 0.92 → role+name 0.90 → stable id
 * 0.85 → name 0.83 → placeholder/label 0.80 → text 0.75).
 */
function rankCandidatesClient(el: any): RankedCandidate[] {
  const out: RankedCandidate[] = [];
  const seen = new Set<string>();
  const push = (playwright: string, css: string, strategy: RankedCandidate['strategy'], confidence: number, reasoning: string) => {
    if (!playwright || seen.has(playwright)) return;
    seen.add(playwright);
    out.push({ playwright, css, strategy, confidence, reasoning, stable: STABLE_STRATEGIES.has(strategy as string) });
  };

  const dataTest = rawAttr(el, 'data-test');
  const dataTestId = rawAttr(el, 'data-testid') || rawAttr(el, 'data-test-id') || el?.dataTestId || el?.selectors?.dataTestId;
  const dataCy = rawAttr(el, 'data-cy');
  const dataQa = rawAttr(el, 'data-qa');
  const role = inferRoleClient(el);
  const text = String(el?.textContent || el?.text || el?.ariaLabel || el?.nearbyLabel || el?.label || rawAttr(el, 'value') || '').trim();
  const name = el?.name || rawAttr(el, 'name');
  const id = el?.id || rawAttr(el, 'id');
  const placeholder = el?.placeholder || rawAttr(el, 'placeholder');
  const labelText = el?.nearbyLabel || el?.ariaLabel || el?.label || rawAttr(el, 'aria-label');

  if (dataTest) push(`page.locator('[data-test="${q(dataTest)}"]')`, `[data-test="${dataTest}"]`, 'dataTestId', 0.96, `data-test="${dataTest}" — dedicated automation contract`);
  if (dataTestId) {
    const v = String(dataTestId).replace(/^\[[\w-]+\s*=\s*["']?/, '').replace(/["'\]]+$/, '');
    push(`page.getByTestId('${q(v)}')`, `[data-testid="${v}"]`, 'dataTestId', 0.95, `data-testid="${v}" — dedicated automation contract`);
  }
  if (dataCy) push(`page.locator('[data-cy="${q(dataCy)}"]')`, `[data-cy="${dataCy}"]`, 'dataTestId', 0.93, `data-cy="${dataCy}" — dedicated automation hook`);
  if (dataQa) push(`page.locator('[data-qa="${q(dataQa)}"]')`, `[data-qa="${dataQa}"]`, 'dataTestId', 0.92, `data-qa="${dataQa}" — dedicated automation hook`);
  if (role && text) push(`page.getByRole('${role}', { name: '${q(text)}' })`, `role=${role}[name="${text}"]`, 'role', 0.9, `${role} with accessible name "${text}" — resilient to markup changes`);
  if (id && !isDynamicIdClient(id)) push(`page.locator('#${q(id)}')`, `#${id}`, 'id', 0.85, `stable id #${id}`);
  if (name) push(`page.locator('[name="${q(name)}"]')`, `[name="${name}"]`, 'name', 0.83, `name="${name}" — stable for form fields`);
  if (placeholder) push(`page.getByPlaceholder('${q(placeholder)}')`, `[placeholder="${placeholder}"]`, 'placeholder', 0.8, `placeholder "${placeholder}"`);
  if (labelText) push(`page.getByLabel('${q(labelText)}')`, `label="${labelText}"`, 'label', 0.8, `associated label "${labelText}"`);
  if (text && !role) push(`page.getByText('${q(text)}')`, `text=${text}`, 'text', 0.75, `visible text "${text}" — breaks on copy changes`);

  return out;
}

/** Derive a friendly semantic name (client mirror of backend deriveSemanticName). */
function deriveSemanticNameClient(el: any): string {
  const raw =
    rawAttr(el, 'data-test') || rawAttr(el, 'data-testid') || el?.dataTestId || el?.selectors?.dataTestId ||
    el?.ariaLabel || rawAttr(el, 'aria-label') || el?.nearbyLabel || el?.label ||
    String(el?.textContent || el?.text || '').trim() ||
    el?.placeholder || rawAttr(el, 'placeholder') || el?.name || el?.id || '';
  const humanized = String(raw)
    .replace(/[#.\[\]'"`()]/g, ' ')
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
  if (!humanized) return elementLabel(el);
  const base = humanized.split(' ').map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');
  const cat = classifyElement(el);
  const suffix = cat === 'button' ? ' Button' : cat === 'link' ? ' Link' : '';
  const already = /\b(button|link)\b/i.test(base);
  return (already ? base : `${base}${suffix}`).slice(0, 60);
}

const ELEMENT_META: Record<string, { label: string; icon: any; color: string; bar: string }> = {
  button: { label: 'Buttons', icon: MousePointerClick, color: 'text-violet-300', bar: 'bg-violet-500' },
  input: { label: 'Inputs', icon: TypeIcon, color: 'text-sky-300', bar: 'bg-sky-500' },
  link: { label: 'Links', icon: LinkIcon, color: 'text-emerald-300', bar: 'bg-emerald-500' },
  select: { label: 'Dropdowns', icon: ChevronDownSquare, color: 'text-amber-300', bar: 'bg-amber-500' },
  checkbox: { label: 'Checkboxes', icon: CheckSquare, color: 'text-pink-300', bar: 'bg-pink-500' },
  radio: { label: 'Radios', icon: CheckSquare, color: 'text-fuchsia-300', bar: 'bg-fuchsia-500' },
  other: { label: 'Other', icon: Boxes, color: 'text-slate-300', bar: 'bg-slate-500' },
};

const STRATEGY_META: Record<keyof StrategyTally, { label: string; bar: string; tip: string; stable: boolean }> = {
  dataTestId: { label: 'data-testid', bar: 'bg-emerald-500', tip: 'Most stable — survives UI redesigns', stable: true },
  id:         { label: 'id',          bar: 'bg-teal-500',    tip: 'Very stable unique identifier', stable: true },
  name:       { label: 'name',        bar: 'bg-sky-500',     tip: 'Stable for form fields', stable: true },
  role:       { label: 'ARIA / role', bar: 'bg-violet-500',  tip: 'Accessibility-based, resilient', stable: true },
  text:       { label: 'text',        bar: 'bg-amber-500',   tip: 'Readable but breaks on copy changes', stable: false },
  css:        { label: 'CSS',         bar: 'bg-orange-500',  tip: 'Fallback — brittle to layout changes', stable: false },
  xpath:      { label: 'XPath',       bar: 'bg-red-500',     tip: 'Last resort — most fragile', stable: false },
};

const PAGE_TYPE_COLORS: Record<string, string> = {
  login: 'bg-violet-500/10 text-violet-300 border-violet-500/20',
  signup: 'bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/20',
  dashboard: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
  listing: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  form: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  checkout: 'bg-pink-500/10 text-pink-300 border-pink-500/20',
  cart: 'bg-pink-500/10 text-pink-300 border-pink-500/20',
  search: 'bg-teal-500/10 text-teal-300 border-teal-500/20',
};

function pageTypeClass(t?: string): string {
  return PAGE_TYPE_COLORS[String(t || '').toLowerCase()] || 'bg-slate-500/10 text-slate-300 border-slate-500/20';
}

/* -------------------------------------------------------------------------- */
/*  Small UI atoms                                                             */
/* -------------------------------------------------------------------------- */

function StatTile({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string | number; accent: string }) {
  return (
    <div className="bg-[#0f172a] border border-[#2a3040] rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon size={13} className={accent} />
        <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-base font-semibold text-white truncate" title={String(value)}>{value}</p>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, accent, count }: { icon: any; title: string; accent: string; count?: number | string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon size={14} className={accent} />
      <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">{title}</h4>
      {count !== undefined && (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#0f172a] border border-[#2a3040] text-slate-400">{count}</span>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export function ProfileDetail({
  profile,
  onCrawlNow,
  onConfigureAuth,
  crawlBusy,
  getHeaders,
}: {
  profile: ProfileLike;
  onCrawlNow: () => void;
  onConfigureAuth: () => void;
  crawlBusy: boolean;
  /** Provides project-scoping headers (e.g. x-project-id) for API calls. */
  getHeaders?: () => Record<string, string>;
}) {
  /* ── App Profile versioning & change engine (System of Record) ──────────
   * Lazily loaded the moment this detail panel mounts (it only mounts when the
   * row is expanded), so we never pay for it on the list view. All three calls
   * are best-effort: any failure leaves the panel rendering exactly as before. */
  const [coverage, setCoverage] = useState<CoverageData | null>(null);
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [changes, setChanges] = useState<ChangeRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const headers = getHeaders ? getHeaders() : {};
      const [covRes, verRes, chgRes] = await Promise.all([
        fetch(`/api/intelligence/profiles/${profile.id}/coverage`, { headers }),
        fetch(`/api/intelligence/profiles/${profile.id}/versions`, { headers }),
        fetch(`/api/intelligence/profiles/${profile.id}/changes?limit=100`, { headers }),
      ]);
      const [cov, ver, chg] = await Promise.all([covRes.json(), verRes.json(), chgRes.json()]);
      if (cov?.success) setCoverage(cov.data as CoverageData);
      if (ver?.success) setVersions((ver.data || []) as VersionRow[]);
      if (chg?.success) setChanges((chg.data || []) as ChangeRow[]);
    } catch {
      /* non-blocking — the rest of the profile detail still renders */
    } finally {
      setHistoryLoading(false);
    }
  }, [profile.id, getHeaders]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  /* Group changes by version transition (vFrom → vTo), newest first. */
  const changeGroups = useMemo(() => {
    const groups = new Map<string, { from: number; to: number; rows: ChangeRow[] }>();
    for (const c of changes) {
      const key = `${c.versionFrom}->${c.versionTo}`;
      if (!groups.has(key)) groups.set(key, { from: c.versionFrom, to: c.versionTo, rows: [] });
      groups.get(key)!.rows.push(c);
    }
    return Array.from(groups.values()).sort((a, b) => b.to - a.to);
  }, [changes]);

  const crawlData = useMemo(() => {
    const cd = profile.crawl_data;
    if (!cd) return null;
    if (typeof cd === 'string') {
      try { return JSON.parse(cd); } catch { return null; }
    }
    return cd;
  }, [profile.crawl_data]);

  const elements = useMemo(() => collectElements(crawlData), [crawlData]);
  const forms = useMemo(() => collectForms(crawlData), [crawlData]);
  const pages = useMemo(() => collectPages(crawlData), [crawlData]);

  /* Element-type breakdown */
  const typeBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const el of elements) {
      const c = classifyElement(el);
      counts[c] = (counts[c] || 0) + 1;
    }
    const order = ['button', 'input', 'link', 'select', 'checkbox', 'radio', 'other'];
    return order
      .filter(k => counts[k])
      .map(k => ({ key: k, count: counts[k], ...ELEMENT_META[k] }));
  }, [elements]);

  /* Selector-strategy breakdown */
  const { strategyRows, stablePct, capturedCount } = useMemo(() => {
    const tally: StrategyTally = { dataTestId: 0, id: 0, name: 0, role: 0, text: 0, css: 0, xpath: 0 };
    let captured = 0;
    let stable = 0;
    for (const el of elements) {
      const s = recommendedStrategy(el);
      if (!s) continue;
      captured++;
      tally[s]++;
      if (STABLE_STRATEGIES.has(s)) stable++;
    }
    const rows = (Object.keys(tally) as (keyof StrategyTally)[])
      .map(k => ({ key: k, count: tally[k], ...STRATEGY_META[k] }))
      .filter(r => r.count > 0)
      .sort((a, b) => b.count - a.count);
    const pct = captured > 0 ? Math.round((stable / captured) * 100) : 0;
    return { strategyRows: rows, stablePct: pct, capturedCount: captured };
  }, [elements]);

  /* ---------------------------------------------------------------------- */
  /*  Saved Locators — the full, searchable catalogue of grounded selectors  */
  /*  LevelUp persisted for this app. Gives users confidence + visibility    */
  /*  into exactly what the generated scripts target.                        */
  /*  (Future: inline editing — see the section footer note.)                */
  /* ---------------------------------------------------------------------- */
  const [locatorQuery, setLocatorQuery] = useState('');
  const [copiedIdx, setCopiedIdx] = useState<string | null>(null);

  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const savedLocators = useMemo(() => {
    const rows = elements.map((el) => {
      const category = classifyElement(el);
      // The canonical ranked candidates — identical logic to the backend brain.
      const candidates = rankCandidatesClient(el);
      const primary = candidates[0] || null;
      // Fall back to the legacy concrete selector only if nothing ranked (rare).
      const fallbackStrategy = recommendedStrategy(el);
      const primaryStrategy = primary ? primary.strategy : fallbackStrategy;
      return {
        label: deriveSemanticNameClient(el),
        category,
        categoryMeta: ELEMENT_META[category] || ELEMENT_META.other,
        strategy: primaryStrategy,
        strategyMeta: primaryStrategy && STRATEGY_META[primaryStrategy as keyof StrategyTally] ? STRATEGY_META[primaryStrategy as keyof StrategyTally] : null,
        stable: primary ? primary.stable : (fallbackStrategy ? STABLE_STRATEGIES.has(fallbackStrategy) : false),
        selector: primary ? primary.playwright : resolveConcreteSelector(el, fallbackStrategy),
        css: primary ? primary.css : resolveConcreteSelector(el, fallbackStrategy),
        confidence: primary ? primary.confidence : 0.5,
        candidates,
        tag: String(el?.tag || '').toLowerCase(),
      };
    });
    // Highest-confidence (most trustworthy) elements first, then by name.
    rows.sort((a, b) => b.confidence - a.confidence || a.label.localeCompare(b.label));
    return rows;
  }, [elements]);

  const filteredLocators = useMemo(() => {
    const query = locatorQuery.trim().toLowerCase();
    if (!query) return savedLocators;
    return savedLocators.filter((r) =>
      r.label.toLowerCase().includes(query) ||
      r.selector.toLowerCase().includes(query) ||
      r.css.toLowerCase().includes(query) ||
      r.tag.includes(query) ||
      r.candidates.some((c) => c.playwright.toLowerCase().includes(query) || c.reasoning.toLowerCase().includes(query)) ||
      (r.categoryMeta?.label || '').toLowerCase().includes(query) ||
      (r.strategyMeta?.label || '').toLowerCase().includes(query)
    );
  }, [savedLocators, locatorQuery]);

  // Portfolio-level confidence: mean primary confidence across addressable els.
  const intelligenceStats = useMemo(() => {
    const withPrimary = savedLocators.filter((r) => r.candidates.length > 0);
    const addressable = withPrimary.length;
    const avg = addressable > 0
      ? Math.round((withPrimary.reduce((s, r) => s + r.confidence, 0) / addressable) * 100)
      : 0;
    const alts = withPrimary.reduce((s, r) => s + Math.max(0, r.candidates.length - 1), 0);
    return { addressable, avg, alts };
  }, [savedLocators]);

  const copyLocator = useCallback((text: string, key: string) => {
    try {
      navigator.clipboard?.writeText(text);
      setCopiedIdx(key);
      setTimeout(() => setCopiedIdx((cur) => (cur === key ? null : cur)), 1400);
    } catch {
      /* clipboard unavailable — no-op */
    }
  }, []);

  const maxType = Math.max(1, ...typeBreakdown.map(t => t.count));
  const totalElements = profile.total_elements || elements.length;
  const totalForms = profile.total_forms || forms.length;
  const crawlTimeMs = crawlData?.crawlTimeMs ?? crawlData?.crawlTime;

  const hasData = totalElements > 0 || pages.length > 0 || forms.length > 0;
  const isCrawling = profile.status === 'crawling';
  const isError = profile.status === 'error';

  /* ---------------------------- Empty / error ---------------------------- */
  if (isCrawling) {
    return (
      <div className="px-5 py-6 border-t border-[#2a3040] bg-[#0f172a]/50">
        <div className="flex items-center gap-3 p-4 bg-violet-500/5 border border-violet-500/20 rounded-lg">
          <Loader2 size={18} className="text-violet-400 animate-spin flex-shrink-0" />
          <div>
            <p className="text-sm text-violet-200 font-medium">Crawl in progress…</p>
            <p className="text-xs text-violet-300/70 mt-0.5">
              Logging in (if configured), discovering pages and capturing multi-strategy selectors. This view refreshes automatically.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="px-5 py-6 border-t border-[#2a3040] bg-[#0f172a]/50">
        <div className={`flex flex-col items-center text-center gap-3 p-6 rounded-xl border ${
          isError ? 'bg-red-500/5 border-red-500/20' : 'bg-amber-500/5 border-amber-500/20'
        }`}>
          {isError ? <ShieldAlert size={28} className="text-red-400" /> : <AlertTriangle size={28} className="text-amber-400" />}
          <div>
            <p className={`text-sm font-semibold ${isError ? 'text-red-200' : 'text-amber-200'}`}>
              {isError ? 'This crawl ran into an error' : 'No intelligence captured yet'}
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-md">
              {profile.error_message
                ? profile.error_message
                : 'This profile has 0 pages and 0 elements. Run a deep crawl to capture the page structure, forms and stable selectors that power grounded script generation.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
            <button
              onClick={onCrawlNow}
              disabled={crawlBusy}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium transition-colors"
            >
              {crawlBusy ? <Loader2 size={13} className="animate-spin" /> : <Network size={13} />}
              Crawl Now
            </button>
            {profile.auth_required && (
              <button
                onClick={onConfigureAuth}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0f172a] border border-[#334155] text-slate-300 hover:text-amber-300 hover:border-amber-500/30 text-xs transition-colors"
              >
                <KeyRound size={13} /> Check Auth
              </button>
            )}
          </div>
          {profile.auth_required && (
            <p className="text-[11px] text-slate-500 max-w-md">
              Tip: apps behind a login often return 0 pages when credentials are missing or the login form
              selectors changed. Verify the auth configuration, then re-crawl.
            </p>
          )}
        </div>
      </div>
    );
  }

  /* ------------------------------ Full view ------------------------------ */
  return (
    <div className="px-4 sm:px-5 py-5 border-t border-[#2a3040] bg-[#0f172a]/50 space-y-5">
      {/* Value proposition banner */}
      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-gradient-to-r from-violet-500/10 to-fuchsia-500/5 border border-violet-500/20">
        <div className="p-1.5 bg-violet-500/15 rounded-lg flex-shrink-0">
          <Sparkles size={15} className="text-violet-300" />
        </div>
        <p className="text-xs text-violet-100/90 leading-relaxed">
          This cached intelligence — <span className="font-semibold text-white">{totalElements.toLocaleString()} elements</span> across{' '}
          <span className="font-semibold text-white">{pages.length || profile.page_count} page{(pages.length || profile.page_count) !== 1 ? 's' : ''}</span> with real selectors —
          is reused to generate tests <span className="font-semibold text-violet-200">30× faster</span> and grounds every script in your
          app&apos;s actual structure instead of guessed placeholders.
        </p>
      </div>

      {/* Crawl metadata tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <StatTile icon={Layers} label="Pages" value={(pages.length || profile.page_count).toLocaleString()} accent="text-violet-300" />
        <StatTile icon={Boxes} label="Elements" value={totalElements.toLocaleString()} accent="text-sky-300" />
        <StatTile icon={MousePointerClick} label="Interactive" value={(profile.total_interactive || 0).toLocaleString()} accent="text-emerald-300" />
        <StatTile icon={FileText} label="Forms" value={totalForms.toLocaleString()} accent="text-amber-300" />
        <StatTile icon={Calendar} label="Created" value={new Date(profile.created_at).toLocaleDateString()} accent="text-slate-300" />
        <StatTile icon={Clock} label="Expires" value={expiresIn(profile.expires_at)} accent="text-slate-300" />
      </div>

      {/* Fingerprint + crawl time strip */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <Fingerprint size={12} className="text-violet-400" />
          Fingerprint: <span className="font-mono text-slate-300">{profile.app_fingerprint || '—'}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Clock size={12} className="text-slate-500" />
          Updated {timeAgo(profile.updated_at)}
        </span>
        {crawlTimeMs ? (
          <span className="flex items-center gap-1.5">
            <Timer size={12} className="text-slate-500" />
            Crawl took {(crawlTimeMs / 1000).toFixed(1)}s
          </span>
        ) : null}
        {profile.auth_required && (
          <span className="flex items-center gap-1.5 text-amber-300/90">
            <Shield size={12} />
            Authenticated{profile.auth_config?.username ? <> as <span className="font-medium">{profile.auth_config.username}</span></> : ' crawl'}
          </span>
        )}
      </div>

      {/* Crawl coverage — how much of the app the profile actually knows. */}
      {coverage && coverage.discoveredPages > 0 && (
        <div className="bg-[#141a28] border border-[#2a3040] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <SectionHeader icon={Gauge} title="Crawl Coverage" accent="text-violet-400" />
            <span className={`text-sm font-semibold ${coverageColor(coverage.coveragePct)}`}>
              {coverage.coveragePct}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-[#0f172a] overflow-hidden mb-2">
            <div
              className={`h-full rounded-full ${coverageBar(coverage.coveragePct)} transition-all`}
              style={{ width: `${Math.min(100, coverage.coveragePct)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Crawled <span className="font-semibold text-slate-200">{coverage.crawledPages.toLocaleString()}</span> of{' '}
            <span className="font-semibold text-slate-200">{coverage.discoveredPages.toLocaleString()}</span> discovered page{coverage.discoveredPages !== 1 ? 's' : ''}
            {coverage.version > 0 && <> · current snapshot <span className="font-mono text-violet-300">v{coverage.version}</span></>}.
            {coverage.coveragePct < 70 && (
              <span className="text-amber-300/80"> Re-crawl to capture discovered-but-unvisited pages and raise coverage.</span>
            )}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Element type breakdown */}
        {typeBreakdown.length > 0 && (
          <div className="bg-[#141a28] border border-[#2a3040] rounded-xl p-4">
            <SectionHeader icon={Boxes} title="Interactive Elements" accent="text-sky-400" count={totalElements.toLocaleString()} />
            <div className="space-y-2.5">
              {typeBreakdown.map(t => {
                const Icon = t.icon;
                const pct = Math.round((t.count / maxType) * 100);
                return (
                  <div key={t.key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`flex items-center gap-1.5 text-xs ${t.color}`}>
                        <Icon size={12} />
                        {t.label}
                      </span>
                      <span className="text-xs font-medium text-slate-300">{t.count.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#0f172a] overflow-hidden">
                      <div className={`h-full rounded-full ${t.bar} transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Selector strategy breakdown — the moat */}
        {strategyRows.length > 0 && (
          <div className="bg-[#141a28] border border-[#2a3040] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <SectionHeader icon={Target} title="Selector Strategies" accent="text-emerald-400" />
              <span className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${
                stablePct >= 70
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                  : stablePct >= 40
                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                    : 'bg-red-500/10 text-red-300 border-red-500/20'
              }`}>
                {stablePct >= 70 ? <ShieldCheck size={11} /> : <ShieldAlert size={11} />}
                {stablePct}% stable
              </span>
            </div>
            <div className="space-y-2.5">
              {strategyRows.map(r => {
                const pct = capturedCount > 0 ? Math.round((r.count / capturedCount) * 100) : 0;
                return (
                  <div key={r.key} title={r.tip}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="flex items-center gap-1.5 text-xs text-slate-300">
                        <span className={`w-2 h-2 rounded-full ${r.bar}`} />
                        <span className="font-mono">{r.label}</span>
                        {r.stable && <ShieldCheck size={10} className="text-emerald-400/70" />}
                      </span>
                      <span className="text-xs font-medium text-slate-400">{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#0f172a] overflow-hidden">
                      <div className={`h-full rounded-full ${r.bar} transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-500 mt-3 leading-relaxed">
              Multi-strategy locators captured per element. A higher share of <span className="text-emerald-300">data-testid / id / name / ARIA</span> means
              generated scripts resist UI changes and self-heal faster.
            </p>
          </div>
        )}
      </div>

      {/* Discovered pages */}
      {pages.length > 0 && (
        <div className="bg-[#141a28] border border-[#2a3040] rounded-xl p-4">
          <SectionHeader icon={Network} title="Discovered Pages" accent="text-emerald-400" count={pages.length} />
          <div className="space-y-1.5 max-h-64 overflow-auto pr-1">
            {pages.map((n: any, i: number) => (
              <div key={i} className="flex items-center gap-2 sm:gap-3 text-xs bg-[#0f172a] rounded-lg px-2.5 py-2">
                <span className={`text-[9px] px-1.5 py-0.5 rounded border flex-shrink-0 ${pageTypeClass(n.pageType)}`}>
                  {n.pageType || 'page'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-slate-200 truncate font-medium">{n.title || n.url || 'Untitled'}</p>
                  {n.url && n.title && (
                    <p className="text-[10px] text-slate-500 truncate font-mono">{n.url}</p>
                  )}
                </div>
                <span className="text-slate-400 flex-shrink-0 whitespace-nowrap hidden sm:inline">
                  {n.elementCount ?? 0} el · {n.formCount ?? 0} forms
                </span>
                <span className="text-slate-400 flex-shrink-0 whitespace-nowrap sm:hidden">
                  {n.elementCount ?? 0}/{n.formCount ?? 0}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Forms discovered */}
      {forms.length > 0 && (
        <div className="bg-[#141a28] border border-[#2a3040] rounded-xl p-4">
          <SectionHeader icon={FileText} title="Forms Captured" accent="text-amber-400" count={forms.length} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {forms.slice(0, 12).map((f: any, i: number) => {
              const fieldCount = Array.isArray(f.fields) ? f.fields.length : (f.fieldCount ?? 0);
              const label = f.name || f.id || f.action || f._pageTitle || `Form ${i + 1}`;
              return (
                <div key={i} className="flex items-center gap-2.5 bg-[#0f172a] rounded-lg px-3 py-2">
                  <div className="p-1.5 bg-amber-500/10 rounded-md flex-shrink-0">
                    <FileText size={13} className="text-amber-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-200 truncate" title={label}>{label}</p>
                    <p className="text-[10px] text-slate-500">
                      {fieldCount} field{fieldCount !== 1 ? 's' : ''}
                      {f.method ? ` · ${String(f.method).toUpperCase()}` : ''}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          {forms.length > 12 && (
            <p className="text-[10px] text-slate-500 mt-2">+ {forms.length - 12} more form{forms.length - 12 !== 1 ? 's' : ''}</p>
          )}
        </div>
      )}

      {/* Element Intelligence — the single source of truth for locators: one     */}
      {/* primary + confidence-scored, reasoned ranked alternatives, the SAME      */}
      {/* ranking Script Generation and Self-Healing consume server-side.          */}
      {savedLocators.length > 0 && (
        <div className="bg-[#141a28] border border-[#2a3040] rounded-xl p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <SectionHeader icon={Brain} title="Element Intelligence" accent="text-violet-400" count={intelligenceStats.addressable.toLocaleString()} />
            <div className="relative sm:w-64">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                type="text"
                value={locatorQuery}
                onChange={(e) => setLocatorQuery(e.target.value)}
                placeholder="Search element, locator, reasoning…"
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#0f172a] border border-[#2a3040] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500/40"
              />
            </div>
          </div>

          {/* Portfolio confidence summary */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-[#0f172a] rounded-lg px-3 py-2 border border-[#2a3040]">
              <p className="text-[10px] text-slate-500">Addressable elements</p>
              <p className="text-sm font-semibold text-slate-200">{intelligenceStats.addressable.toLocaleString()}</p>
            </div>
            <div className="bg-[#0f172a] rounded-lg px-3 py-2 border border-[#2a3040]">
              <p className="text-[10px] text-slate-500">Avg. primary confidence</p>
              <p className={`text-sm font-semibold ${intelligenceStats.avg >= 90 ? 'text-emerald-300' : intelligenceStats.avg >= 75 ? 'text-amber-300' : 'text-slate-200'}`}>{intelligenceStats.avg}%</p>
            </div>
            <div className="bg-[#0f172a] rounded-lg px-3 py-2 border border-[#2a3040]">
              <p className="text-[10px] text-slate-500">Ranked fallbacks</p>
              <p className="text-sm font-semibold text-slate-200">{intelligenceStats.alts.toLocaleString()}</p>
            </div>
          </div>

          {filteredLocators.length > 0 ? (
            <div className="space-y-1.5 max-h-96 overflow-auto pr-1">
              {filteredLocators.map((r, i) => {
                const Icon = r.categoryMeta?.icon || Boxes;
                const pct = Math.round(r.confidence * 100);
                const isOpen = expandedIdx === i;
                const alternatives = r.candidates.slice(1);
                return (
                  <div
                    key={`${r.selector}-${i}`}
                    className="bg-[#0f172a] rounded-lg border border-transparent hover:border-[#2a3040] transition-colors"
                  >
                    {/* Primary row */}
                    <div className="group flex items-center gap-2.5 px-2.5 py-2">
                      <button
                        onClick={() => setExpandedIdx(isOpen ? null : i)}
                        disabled={alternatives.length === 0}
                        className={`p-0.5 rounded flex-shrink-0 transition-transform ${alternatives.length === 0 ? 'opacity-20 cursor-default' : 'text-slate-500 hover:text-violet-300'} ${isOpen ? 'rotate-90' : ''}`}
                        title={alternatives.length ? `${alternatives.length} ranked alternative${alternatives.length > 1 ? 's' : ''}` : 'No alternatives'}
                        aria-label="Toggle alternatives"
                      >
                        <ChevronRight size={13} />
                      </button>
                      <div className="p-1.5 bg-[#141a28] rounded-md flex-shrink-0">
                        <Icon size={13} className={r.categoryMeta?.color || 'text-slate-300'} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-slate-200 truncate" title={r.label}>{r.label}</p>
                          <span
                            className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded border flex-shrink-0 ${
                              pct >= 90 ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                                : pct >= 75 ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                                : 'bg-slate-500/10 text-slate-300 border-slate-500/20'
                            }`}
                            title="Primary locator confidence"
                          >
                            {r.stable ? <ShieldCheck size={9} /> : <ShieldAlert size={9} />}
                            {pct}%
                          </span>
                          {r.strategyMeta && (
                            <span className="hidden sm:inline text-[9px] px-1.5 py-0.5 rounded border border-[#2a3040] text-slate-400 flex-shrink-0" title={r.strategyMeta.tip}>
                              {r.strategyMeta.label}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-violet-300/90 truncate font-mono" title={r.selector}>{r.selector}</p>
                      </div>
                      <button
                        onClick={() => copyLocator(r.selector, `p-${i}`)}
                        className="p-1.5 rounded-md text-slate-500 hover:text-violet-300 hover:bg-[#141a28] transition-colors flex-shrink-0"
                        title="Copy primary locator"
                        aria-label="Copy primary locator"
                      >
                        {copiedIdx === `p-${i}` ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                      </button>
                    </div>

                    {/* Ranked alternatives (expandable) */}
                    {isOpen && alternatives.length > 0 && (
                      <div className="border-t border-[#2a3040] px-2.5 py-2 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[9px] text-slate-500 uppercase tracking-wide mb-1">
                          <ListOrdered size={10} /> Ranked fallbacks — healing tries these in order
                        </div>
                        {alternatives.map((c, j) => {
                          const cpct = Math.round(c.confidence * 100);
                          return (
                            <div key={`${c.playwright}-${j}`} className="group flex items-start gap-2 pl-6">
                              <span className="text-[9px] text-slate-600 mt-1 w-3 flex-shrink-0">{j + 2}</span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-[10px] text-slate-300 truncate font-mono" title={c.playwright}>{c.playwright}</p>
                                  <span className={`text-[9px] flex-shrink-0 ${cpct >= 90 ? 'text-emerald-400/80' : cpct >= 75 ? 'text-amber-400/80' : 'text-slate-500'}`}>{cpct}%</span>
                                  {c.stable && <ShieldCheck size={8} className="text-emerald-400/60 flex-shrink-0" />}
                                </div>
                                <p className="text-[9px] text-slate-500 truncate" title={c.reasoning}>{c.reasoning}</p>
                              </div>
                              <button
                                onClick={() => copyLocator(c.playwright, `${i}-${j}`)}
                                className="p-1 rounded text-slate-600 hover:text-violet-300 hover:bg-[#141a28] transition-colors flex-shrink-0"
                                title="Copy alternative locator"
                                aria-label="Copy alternative locator"
                              >
                                {copiedIdx === `${i}-${j}` ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-slate-500 py-6 justify-center">
              <Search size={13} />
              No elements match "{locatorQuery}".
            </div>
          )}

          <p className="text-[10px] text-slate-500 mt-3 leading-relaxed">
            LevelUp resolves one <span className="text-violet-300">primary locator</span> per element and ranks
            confidence-scored fallbacks — <span className="text-slate-400">data-test hooks outrank ids</span>, matching the
            app&apos;s real automation contract. Script Generation <em>and</em> Self-Healing consume this exact ranking, so
            generated scripts never invent a selector and healing always knows the next-best option.
            <span className="text-violet-300"> Inline editing is coming soon</span> — pin or override a primary and every
            engine picks it up automatically.
          </p>
        </div>
      )}

      {/* Version history + change engine — the App Profile as System of Record. */}
      {(versions.length > 0 || changeGroups.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Version history */}
          {versions.length > 0 && (
            <div className="bg-[#141a28] border border-[#2a3040] rounded-xl p-4">
              <SectionHeader icon={History} title="Version History" accent="text-violet-400" count={versions.length} />
              <div className="space-y-1.5 max-h-72 overflow-auto pr-1">
                {versions.map((v, i) => (
                  <div key={v.version} className="flex items-center gap-3 text-xs bg-[#0f172a] rounded-lg px-3 py-2">
                    <span className={`font-mono text-[11px] px-1.5 py-0.5 rounded border flex-shrink-0 ${
                      i === 0 ? 'bg-violet-500/10 text-violet-300 border-violet-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                    }`}>
                      v{v.version}{i === 0 ? ' · current' : ''}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-slate-300">
                        {v.pageCount} page{v.pageCount !== 1 ? 's' : ''} · {v.elementCount.toLocaleString()} el · {v.formCount} form{v.formCount !== 1 ? 's' : ''}
                      </p>
                      <p className="text-[10px] text-slate-500">{timeAgo(v.createdAt)}</p>
                    </div>
                    <span className={`text-[11px] font-medium flex-shrink-0 ${coverageColor(v.coveragePct)}`}>
                      {v.coveragePct}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Change engine — structured diffs between versions */}
          {changeGroups.length > 0 && (
            <div className="bg-[#141a28] border border-[#2a3040] rounded-xl p-4">
              <SectionHeader icon={GitCompare} title="Detected Changes" accent="text-emerald-400" count={changes.length} />
              <div className="space-y-3 max-h-72 overflow-auto pr-1">
                {changeGroups.map((g) => (
                  <div key={`${g.from}->${g.to}`}>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1.5">
                      <RefreshCw size={10} />
                      <span className="font-mono">v{g.from}</span>
                      <ArrowRightLeft size={9} />
                      <span className="font-mono text-slate-400">v{g.to}</span>
                    </div>
                    <div className="space-y-1.5">
                      {g.rows.slice(0, 25).map((c) => {
                        const meta = CHANGE_META[c.type];
                        const Icon = meta?.icon || GitCompare;
                        return (
                          <div key={c.id} className="flex items-start gap-2 text-xs bg-[#0f172a] rounded-lg px-2.5 py-2">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded border flex-shrink-0 flex items-center gap-1 ${meta?.chip || 'bg-slate-500/10 text-slate-300 border-slate-500/20'}`}>
                              <Icon size={9} />
                              {meta?.label || c.type}
                            </span>
                            <div className="min-w-0 flex-1">
                              {c.page && <p className="text-[10px] text-slate-500 font-mono truncate">{c.page}</p>}
                              {c.type === 'LOCATOR_CHANGED' && c.oldValue && c.newValue ? (
                                <p className="text-slate-300 truncate font-mono text-[10px]" title={`${c.oldValue} → ${c.newValue}`}>
                                  <span className="text-red-300/80 line-through">{c.oldValue}</span>
                                  <span className="text-slate-500"> → </span>
                                  <span className="text-emerald-300">{c.newValue}</span>
                                </p>
                              ) : (
                                <p className="text-slate-300 truncate" title={c.detail || ''}>{c.detail || meta?.label || c.type}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {g.rows.length > 25 && (
                        <p className="text-[10px] text-slate-500">+ {g.rows.length - 25} more change{g.rows.length - 25 !== 1 ? 's' : ''}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 mt-3 leading-relaxed">
                Detected automatically between crawls. <span className="text-violet-300">Locator changes</span> feed the
                self-healing engine — broken selectors are auto-fixed from these diffs with no AI cost.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Versioning empty-state hint — only once we know history loaded & is empty. */}
      {!historyLoading && versions.length === 0 && coverage && coverage.version <= 1 && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#0f172a] border border-[#2a3040]">
          <History size={14} className="text-slate-500 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Version history &amp; change tracking begin from the next crawl. Each re-crawl is captured as a new version, and
            differences (pages, elements, locators, forms, navigation) are recorded here automatically.
          </p>
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center gap-3 flex-wrap pt-1">
        <button
          onClick={onCrawlNow}
          disabled={crawlBusy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium transition-colors"
        >
          {crawlBusy ? <><Loader2 size={12} className="animate-spin" /> Crawling…</> : <><Network size={12} /> Re-crawl Now</>}
        </button>
        <button
          onClick={onConfigureAuth}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0f172a] border border-[#334155] text-slate-300 hover:text-amber-300 hover:border-amber-500/30 text-xs transition-colors"
        >
          <KeyRound size={12} /> {profile.auth_required ? 'Edit Auth' : 'Configure Auth'}
        </button>
        <p className="text-[10px] text-slate-500 flex items-center gap-1">
          <Zap size={11} className="text-violet-400" />
          Cached results are reused for grounded, 30× faster script generation.
        </p>
      </div>
    </div>
  );
}
