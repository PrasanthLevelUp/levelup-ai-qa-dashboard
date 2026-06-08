'use client';

/* -------------------------------------------------------------------------- */
/*  ProfileDetail                                                             */
/*  Rich, data-driven breakdown of a crawled Application Profile.            */
/*  Renders inside the expanded profile row to showcase the cached           */
/*  intelligence that powers 30× faster, grounded script generation.         */
/* -------------------------------------------------------------------------- */

import { useMemo } from 'react';
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

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

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
  if (s?.dataTestId || el?.dataTestId) return 'dataTestId';
  if (s?.id || el?.id) return 'id';
  if (s?.name || el?.name) return 'name';
  if (s?.role || el?.role || el?.ariaRole || el?.ariaLabel) return 'role';
  if (s?.text) return 'text';
  if (s?.css) return 'css';
  if (s?.xpath) return 'xpath';
  return null;
}

const STABLE_STRATEGIES = new Set(['dataTestId', 'id', 'name', 'role']);

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
}: {
  profile: ProfileLike;
  onCrawlNow: () => void;
  onConfigureAuth: () => void;
  crawlBusy: boolean;
}) {
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
