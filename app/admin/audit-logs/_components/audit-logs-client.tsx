'use client';

import { useState, useMemo } from 'react';
import {
  FileText, Search, Filter, ChevronDown, ChevronUp, Clock,
  User, Shield, LogIn, LogOut, Settings, Sparkles, Trash2,
  Plus, Edit2, Download, Eye, AlertTriangle, Globe, Lock,
  Activity, GitPullRequest, RefreshCw, Key, UserPlus, CreditCard
} from 'lucide-react';

type LogCategory = 'all' | 'auth' | 'healing' | 'admin' | 'billing' | 'integration';
type Severity = 'info' | 'warning' | 'critical';

interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  category: LogCategory;
  severity: Severity;
  ip: string;
  userAgent: string;
  details: string;
  icon: React.ElementType;
}

/* Demo audit log data */
const AUDIT_LOGS: AuditLog[] = [
  { id: 'AUD-001', timestamp: '2026-05-19T09:23:45Z', user: 'prasanth@levelup.io', action: 'Login successful', category: 'auth', severity: 'info', ip: '103.42.156.78', userAgent: 'Chrome 125 / macOS', details: 'JWT session created, expires 2026-05-20T09:23:45Z', icon: LogIn },
  { id: 'AUD-002', timestamp: '2026-05-19T09:25:12Z', user: 'prasanth@levelup.io', action: 'Triggered healing job', category: 'healing', severity: 'info', ip: '103.42.156.78', userAgent: 'Chrome 125 / macOS', details: 'Job ID: HJ-1247, Repo: levelup-app, Branch: main', icon: Sparkles },
  { id: 'AUD-003', timestamp: '2026-05-19T09:30:01Z', user: 'ananya@levelup.io', action: 'Login successful', category: 'auth', severity: 'info', ip: '49.207.213.45', userAgent: 'Firefox 124 / Windows', details: 'JWT session created', icon: LogIn },
  { id: 'AUD-004', timestamp: '2026-05-19T09:32:18Z', user: 'ananya@levelup.io', action: 'Generated test scripts', category: 'healing', severity: 'info', ip: '49.207.213.45', userAgent: 'Firefox 124 / Windows', details: '12 test cases generated for checkout-flow module, 10 credits consumed', icon: Sparkles },
  { id: 'AUD-005', timestamp: '2026-05-19T09:45:33Z', user: 'prasanth@levelup.io', action: 'Updated billing plan', category: 'billing', severity: 'warning', ip: '103.42.156.78', userAgent: 'Chrome 125 / macOS', details: 'Plan changed from Starter to Growth, effective immediately', icon: CreditCard },
  { id: 'AUD-006', timestamp: '2026-05-19T10:02:44Z', user: 'system', action: 'API rate limit triggered', category: 'auth', severity: 'warning', ip: '185.220.101.42', userAgent: 'python-requests/2.31', details: 'IP blocked for 15 minutes after 5 failed login attempts', icon: AlertTriangle },
  { id: 'AUD-007', timestamp: '2026-05-19T10:15:22Z', user: 'prasanth@levelup.io', action: 'Invited new member', category: 'admin', severity: 'info', ip: '103.42.156.78', userAgent: 'Chrome 125 / macOS', details: 'sarah@client.com invited with Viewer role', icon: UserPlus },
  { id: 'AUD-008', timestamp: '2026-05-19T10:22:11Z', user: 'rahul@levelup.io', action: 'Created PR from healing', category: 'healing', severity: 'info', ip: '122.176.28.91', userAgent: 'Chrome 125 / Linux', details: 'PR #142 created on levelup-app/main from levelup/heal-login-spec', icon: GitPullRequest },
  { id: 'AUD-009', timestamp: '2026-05-19T10:30:55Z', user: 'prasanth@levelup.io', action: 'Rotated API key', category: 'admin', severity: 'critical', ip: '103.42.156.78', userAgent: 'Chrome 125 / macOS', details: 'Old key revoked (lup_****3f2a), new key generated (lup_****8c1b)', icon: Key },
  { id: 'AUD-010', timestamp: '2026-05-19T10:45:08Z', user: 'vikram@levelup.io', action: 'Login successful', category: 'auth', severity: 'info', ip: '203.110.78.33', userAgent: 'Chrome 125 / macOS', details: 'JWT session created', icon: LogIn },
  { id: 'AUD-011', timestamp: '2026-05-19T11:00:23Z', user: 'prasanth@levelup.io', action: 'Updated Slack integration', category: 'integration', severity: 'info', ip: '103.42.156.78', userAgent: 'Chrome 125 / macOS', details: 'Webhook URL updated for #qa-alerts channel', icon: Settings },
  { id: 'AUD-012', timestamp: '2026-05-19T11:15:17Z', user: 'deepa@levelup.io', action: 'Exported RCA report', category: 'healing', severity: 'info', ip: '117.200.45.67', userAgent: 'Safari 18 / macOS', details: 'PDF report generated for releases 2026-W20', icon: Download },
  { id: 'AUD-013', timestamp: '2026-05-19T11:22:44Z', user: 'system', action: 'Unauthorized access attempt', category: 'auth', severity: 'critical', ip: '45.33.32.156', userAgent: 'curl/7.88', details: 'Invalid JWT token presented for /api/companies endpoint, request blocked', icon: Lock },
  { id: 'AUD-014', timestamp: '2026-05-19T11:30:00Z', user: 'ananya@levelup.io', action: 'Changed user role', category: 'admin', severity: 'warning', ip: '49.207.213.45', userAgent: 'Firefox 124 / Windows', details: 'kavita@levelup.io role changed from QA Engineer to Viewer', icon: Shield },
  { id: 'AUD-015', timestamp: '2026-05-19T11:45:33Z', user: 'prasanth@levelup.io', action: 'Release signoff approved', category: 'healing', severity: 'info', ip: '103.42.156.78', userAgent: 'Chrome 125 / macOS', details: 'Release v2.4.1 signed off with APPROVE decision, risk score: Low', icon: Shield },
];

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  all: { label: 'All Events', color: 'slate' },
  auth: { label: 'Authentication', color: 'blue' },
  healing: { label: 'Operations', color: 'emerald' },
  admin: { label: 'Administration', color: 'purple' },
  billing: { label: 'Billing', color: 'amber' },
  integration: { label: 'Integrations', color: 'cyan' },
};

const SEVERITY_CONFIG: Record<Severity, { color: string; bg: string }> = {
  info: { color: 'text-slate-400', bg: 'bg-slate-500/10' },
  warning: { color: 'text-amber-400', bg: 'bg-amber-500/10' },
  critical: { color: 'text-red-400', bg: 'bg-red-500/10' },
};

export default function AuditLogsClient() {
  const [category, setCategory] = useState<LogCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all');

  const filteredLogs = useMemo(() => {
    return AUDIT_LOGS.filter(log => {
      const matchCat = category === 'all' || log.category === category;
      const matchSev = severityFilter === 'all' || log.severity === severityFilter;
      const matchSearch = !searchQuery ||
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.details.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSev && matchSearch;
    });
  }, [category, severityFilter, searchQuery]);

  const stats = useMemo(() => {
    const total = AUDIT_LOGS.length;
    const critical = AUDIT_LOGS.filter(l => l.severity === 'critical').length;
    const warnings = AUDIT_LOGS.filter(l => l.severity === 'warning').length;
    const uniqueUsers = new Set(AUDIT_LOGS.map(l => l.user)).size;
    return { total, critical, warnings, uniqueUsers };
  }, []);

  return (
    <div className="min-h-screen bg-[#0f172a] p-6 lg:p-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
            <FileText size={20} className="text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
            <p className="text-sm text-slate-400">Complete activity trail for security and compliance</p>
          </div>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-700/50 hover:bg-slate-700 text-white text-sm font-medium rounded-xl border border-slate-600/50 transition-colors">
          <Download size={14} />
          Export CSV
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Events', value: stats.total, icon: Activity, color: 'emerald' },
          { label: 'Critical Alerts', value: stats.critical, icon: AlertTriangle, color: 'red' },
          { label: 'Warnings', value: stats.warnings, icon: AlertTriangle, color: 'amber' },
          { label: 'Active Users', value: stats.uniqueUsers, icon: User, color: 'blue' },
        ].map((stat, i) => (
          <div key={i} className="rounded-xl bg-[#1e293b]/60 border border-slate-700/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">{stat.label}</span>
              <stat.icon size={14} className={`text-${stat.color}-400`} />
            </div>
            <span className="text-2xl font-bold text-white">{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Category tabs */}
        <div className="inline-flex items-center bg-[#1e293b] rounded-lg p-1 border border-slate-700/50 flex-wrap">
          {(Object.keys(CATEGORY_CONFIG) as LogCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat as LogCategory)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                category === cat
                  ? `bg-${CATEGORY_CONFIG[cat].color}-500/20 text-${CATEGORY_CONFIG[cat].color}-400`
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {CATEGORY_CONFIG[cat].label}
            </button>
          ))}
        </div>

        {/* Severity filter */}
        <div className="inline-flex items-center bg-[#1e293b] rounded-lg p-1 border border-slate-700/50">
          {(['all', 'info', 'warning', 'critical'] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize ${
                severityFilter === sev
                  ? sev === 'all' ? 'bg-slate-600/40 text-white'
                    : `bg-${SEVERITY_CONFIG[sev as Severity].color.replace('text-', '').replace('-400', '')}-500/20 ${SEVERITY_CONFIG[sev as Severity].color}`
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search actions, users, details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#1e293b] border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
          />
        </div>
      </div>

      {/* Log Entries */}
      <div className="space-y-2">
        {filteredLogs.map((log) => {
          const isExpanded = expandedLog === log.id;
          const Icon = log.icon;
          const sevConfig = SEVERITY_CONFIG[log.severity];

          return (
            <div key={log.id} className={`rounded-xl border transition-colors ${
              log.severity === 'critical' ? 'bg-red-500/5 border-red-500/20' :
              log.severity === 'warning' ? 'bg-amber-500/5 border-amber-500/10' :
              'bg-[#1e293b]/40 border-slate-700/50'
            }`}>
              <button
                onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                className="w-full flex items-center gap-3 p-4 text-left"
              >
                {/* Icon */}
                <div className={`w-8 h-8 rounded-lg ${sevConfig.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={14} className={sevConfig.color} />
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium text-white">{log.action}</span>
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${sevConfig.bg} ${sevConfig.color}`}>
                      {log.severity}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><User size={10} /> {log.user}</span>
                    <span className="flex items-center gap-1"><Clock size={10} /> {new Date(log.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="hidden sm:flex items-center gap-1"><Globe size={10} /> {log.ip}</span>
                  </div>
                </div>

                {isExpanded ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-slate-700/30 pt-3 ml-11">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Details</span>
                      <p className="text-sm text-slate-300 mt-0.5">{log.details}</p>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">IP Address</span>
                        <p className="text-sm text-slate-300 mt-0.5 font-mono">{log.ip}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">User Agent</span>
                        <p className="text-sm text-slate-300 mt-0.5">{log.userAgent}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Event ID</span>
                        <p className="text-sm text-slate-300 mt-0.5 font-mono">{log.id}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredLogs.length === 0 && (
          <div className="text-center py-12">
            <Search size={32} className="text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No audit logs match your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
