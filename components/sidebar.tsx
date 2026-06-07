'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  LayoutDashboard, Activity, BookOpen, Menu, X, ChevronRight, ChevronDown,
  Shield, ShieldAlert, ClipboardCheck, ClipboardList, Microscope, DollarSign,
  Play, LogOut, User, FileCode, Plug, Bug, Database, Brain, Building2,
  Fingerprint, FileText, CreditCard, BarChart3, Users, ScrollText, Key, Upload,
  Cpu, TestTubeDiagonal, FolderKanban, Webhook, UserCog, GitBranch, Server,
  Rocket, HeartPulse, SlidersHorizontal, Gauge, Tag,
} from 'lucide-react';
import { ProjectSelector } from './project-selector';

/* ------------------------------------------------------------------ */
/* Navigation model                                                    */
/* ------------------------------------------------------------------ */

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

interface NavSection {
  id: string;
  title: string;
  icon: React.ElementType;
  items: NavItem[];
  /** Collapsed by default (advanced / less-used groups). */
  defaultCollapsed?: boolean;
  /** Only visible to admins. */
  adminOnly?: boolean;
}

/** Standalone top-level link (no section header). */
const DASHBOARD_ITEM: NavItem = { href: '/', label: 'Dashboard', icon: LayoutDashboard };

/**
 * Reorganised into clear, task-oriented groups. Every existing route is
 * preserved — nothing is removed, only regrouped for discoverability.
 */
const NAV_SECTIONS: NavSection[] = [
  {
    id: 'work',
    title: 'Work',
    icon: ClipboardList,
    items: [
      { href: '/requirements', label: 'Requirements', icon: FileText },
      { href: '/test-coverage', label: 'Test Case Lab', icon: TestTubeDiagonal },
      { href: '/scripts', label: 'Script Generation', icon: FileCode },
    ],
  },
  {
    id: 'testing',
    title: 'Testing',
    icon: TestTubeDiagonal,
    items: [
      { href: '/projects', label: 'Projects', icon: FolderKanban },
      { href: '/jobs', label: 'Healing Jobs', icon: Play },
      { href: '/healings', label: 'Healings', icon: HeartPulse },
      { href: '/flaky', label: 'Flaky Tests', icon: Bug },
    ],
  },
  {
    id: 'release',
    title: 'Release',
    icon: Rocket,
    items: [
      { href: '/release-risk', label: 'Release Risk', icon: ShieldAlert },
      { href: '/release-signoff', label: 'Release Signoff', icon: ClipboardCheck },
      { href: '/rtm', label: 'RTM Dashboard', icon: GitBranch },
    ],
  },
  {
    id: 'insights',
    title: 'Insights',
    icon: BarChart3,
    items: [
      { href: '/metrics', label: 'Metrics & ROI', icon: Gauge },
      { href: '/roi', label: 'ROI Dashboard', icon: DollarSign },
      { href: '/usage', label: 'Usage Metering', icon: BarChart3 },
      { href: '/analytics', label: 'Analytics', icon: Activity },
    ],
  },
  {
    id: 'intelligence',
    title: 'Intelligence',
    icon: Brain,
    defaultCollapsed: true,
    items: [
      { href: '/intelligence', label: 'Intelligence Hub', icon: Activity },
      { href: '/learning', label: 'Learning Engine', icon: Brain },
      { href: '/dom-memory', label: 'DOM Memory', icon: Database },
      { href: '/profiles', label: 'App Profiles', icon: Fingerprint },
      { href: '/similarity', label: 'Similarity Engine', icon: Fingerprint },
      { href: '/rca-intelligence', label: 'RCA Intelligence', icon: Microscope },
      { href: '/patterns', label: 'Learned Patterns', icon: Tag },
      { href: '/knowledge', label: 'App Knowledge', icon: BookOpen },
      { href: '/repo-intelligence', label: 'Repo Intelligence', icon: Cpu },
    ],
  },
  {
    id: 'settings',
    title: 'Settings',
    icon: SlidersHorizontal,
    defaultCollapsed: true,
    items: [
      { href: '/settings/environments', label: 'Environments', icon: Server },
      { href: '/settings/sprints', label: 'Sprints', icon: Rocket },
      { href: '/settings/healing', label: 'Healing Config', icon: SlidersHorizontal },
      { href: '/api-keys', label: 'API Keys', icon: Key },
      { href: '/ingestion', label: 'Ingestion', icon: Upload },
      { href: '/webhooks', label: 'Webhooks', icon: Webhook },
      { href: '/tools', label: 'Tools', icon: Plug },
    ],
  },
  {
    id: 'admin',
    title: 'Admin',
    icon: Shield,
    defaultCollapsed: true,
    adminOnly: true,
    items: [
      { href: '/admin/users', label: 'Users & Roles', icon: UserCog },
      { href: '/admin/roles', label: 'Roles & Permissions', icon: Users },
      { href: '/companies', label: 'Companies', icon: Building2 },
      { href: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText },
      { href: '/billing', label: 'Billing', icon: CreditCard },
      { href: '/pricing', label: 'Pricing', icon: DollarSign },
      { href: '/api-docs', label: 'API Docs', icon: FileText },
    ],
  },
];

const COLLAPSE_STORAGE_KEY = 'levelup.sidebar.collapsed.v1';
const SCROLL_STORAGE_KEY = 'levelup.sidebar.scroll.v1';
const ADMIN_ROLES = ['admin', 'owner', 'super_admin'];

interface UserInfo {
  username: string;
  role: string;
  company: string | null;
}

/** True when the given route is the active one for `pathname`. */
function isItemActive(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const navRef = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef<HTMLAnchorElement | null>(null);
  const scrollRestored = useRef(false);

  // Collapsed-section state, hydrated from localStorage (falls back to defaults).
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    const base: Record<string, boolean> = {};
    for (const s of NAV_SECTIONS) base[s.id] = !!s.defaultCollapsed;
    return base;
  });

  const isAdmin = !!user && ADMIN_ROLES.includes((user.role || '').toLowerCase());

  // ---- Load user ---------------------------------------------------
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data?.success) setUser(data.data); })
      .catch(() => {});
  }, []);

  // ---- Hydrate collapse state from storage -------------------------
  useEffect(() => {
    try {
      const raw = localStorage.getItem(COLLAPSE_STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Record<string, boolean>;
        setCollapsed((prev) => ({ ...prev, ...saved }));
      }
    } catch { /* ignore */ }
  }, []);

  // ---- Auto-expand the section that contains the active route ------
  useEffect(() => {
    const section = NAV_SECTIONS.find((s) => s.items.some((i) => isItemActive(i.href, pathname)));
    if (section && collapsed[section.id]) {
      setCollapsed((prev) => ({ ...prev, [section.id]: false }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // ---- Persist collapse state --------------------------------------
  const toggleSection = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem(COLLAPSE_STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  // ---- Restore scroll position once on mount -----------------------
  useEffect(() => {
    if (scrollRestored.current || !navRef.current) return;
    try {
      const saved = sessionStorage.getItem(SCROLL_STORAGE_KEY);
      if (saved) navRef.current.scrollTop = parseInt(saved, 10) || 0;
    } catch { /* ignore */ }
    scrollRestored.current = true;
  }, []);

  // ---- Save scroll position as the user scrolls --------------------
  const handleNavScroll = useCallback(() => {
    if (!navRef.current) return;
    try { sessionStorage.setItem(SCROLL_STORAGE_KEY, String(navRef.current.scrollTop)); } catch { /* ignore */ }
  }, []);

  // ---- Keep the selected item visible after navigation -------------
  // scrollIntoView with block:'nearest' only moves when the item is off-screen,
  // so an already-visible item never jumps. This fixes the "scrolls to top" bug.
  useEffect(() => {
    const id = window.setTimeout(() => {
      activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 60);
    return () => window.clearTimeout(id);
  }, [pathname]);

  async function handleLogout() {
    setLoggingOut(true);
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    router.push('/login');
    router.refresh();
  }

  const visibleSections = NAV_SECTIONS.filter((s) => !s.adminOnly || isAdmin);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-[#1e293b] border border-[#334155] text-white"
        aria-label="Toggle menu"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-[#0c1222] border-r border-[#1e293b] z-40 flex flex-col transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="px-6 py-6 border-b border-[#1e293b]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 relative flex-shrink-0">
              <Image src="/logo-192.png" alt="LevelUp AI QA" fill className="object-contain" sizes="40px" priority />
            </div>
            <div>
              <h1 className="text-base font-bold text-white font-display tracking-tight">LevelUp AI</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">QA Reliability Platform</p>
            </div>
          </div>
        </div>

        {/* Project Selector */}
        <ProjectSelector />

        {/* Navigation */}
        <nav
          ref={navRef}
          onScroll={handleNavScroll}
          className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5 scrollbar-thin"
        >
          {/* Dashboard — standalone, always visible */}
          {(() => {
            const active = isItemActive(DASHBOARD_ITEM.href, pathname);
            const Icon = DASHBOARD_ITEM.icon;
            return (
              <Link
                ref={active ? activeRef : undefined}
                href={DASHBOARD_ITEM.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-all duration-200 group ${
                  active
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-[#1e293b]'
                }`}
              >
                <Icon size={16} className={active ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'} />
                <span>{DASHBOARD_ITEM.label}</span>
                {active && <ChevronRight size={12} className="ml-auto text-emerald-500" />}
              </Link>
            );
          })()}

          {/* Collapsible sections */}
          {visibleSections.map((section) => {
            const SectionIcon = section.icon;
            const isCollapsed = !!collapsed[section.id];
            const sectionActive = section.items.some((i) => isItemActive(i.href, pathname));
            return (
              <div key={section.id} className="pt-1.5">
                {/* Section header (collapse toggle) */}
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  aria-expanded={!isCollapsed}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors group ${
                    sectionActive ? 'text-slate-200' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <SectionIcon
                    size={13}
                    className={sectionActive ? 'text-emerald-400/80' : 'text-slate-600 group-hover:text-slate-400'}
                  />
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em]">{section.title}</span>
                  {sectionActive && isCollapsed && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden />
                  )}
                  <ChevronDown
                    size={13}
                    className={`ml-auto text-slate-600 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`}
                  />
                </button>

                {/* Section items */}
                {!isCollapsed && (
                  <div className="mt-0.5 space-y-0.5 pl-2 border-l border-[#1e293b] ml-3">
                    {section.items.map((item) => {
                      const active = isItemActive(item.href, pathname);
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          ref={active ? activeRef : undefined}
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 group ${
                            active
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'text-slate-400 hover:text-white hover:bg-[#1e293b]'
                          }`}
                        >
                          <Icon size={15} className={active ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'} />
                          <span>{item.label}</span>
                          {active && <ChevronRight size={12} className="ml-auto text-emerald-500" />}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Product Badge */}
        <div className="px-4 py-3">
          <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3">
            <div className="flex items-center gap-2 mb-1">
              <Shield size={14} className="text-emerald-400" />
              <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">AI-Powered</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Self-healing QA that learns and saves 99% on AI costs
            </p>
          </div>
        </div>

        {/* User Info + Logout */}
        <div className="px-4 py-4 border-t border-[#1e293b]">
          {user ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <User size={14} className="text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user.username}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                    {user.role}{user.company ? ` · ${user.company}` : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-200"
              >
                <LogOut size={14} />
                {loggingOut ? 'Signing out...' : 'Sign out'}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-slate-500">System Active</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
