'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Activity, BookOpen, Zap, Menu, X, ChevronRight, Shield, Play, LogOut, User, FileCode, Plug, Bug, Database } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/jobs', label: 'Healing Jobs', icon: Play },
  { href: '/scripts', label: 'Script Gen', icon: FileCode },
  { href: '/tools', label: 'Tools', icon: Plug },
  { href: '/flaky', label: 'Flaky Tests', icon: Bug },
  { href: '/dom-memory', label: 'DOM Memory', icon: Database },
  { href: '/analytics', label: 'Analytics', icon: Activity },
  { href: '/patterns', label: 'Learned Patterns', icon: BookOpen },
];

interface UserInfo {
  username: string;
  role: string;
  company: string | null;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.success) {
          setUser(data.data);
        }
      })
      .catch(() => {});
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    router.push('/login');
    router.refresh();
  }

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
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
              <Zap size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white font-display tracking-tight">LevelUp AI</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">QA Reliability Platform</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-[#1e293b]'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'} />
                <span>{item.label}</span>
                {isActive && <ChevronRight size={14} className="ml-auto text-emerald-500" />}
              </Link>
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
