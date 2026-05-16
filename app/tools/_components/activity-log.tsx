'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Ticket,
  Bell,
  ExternalLink,
  ChevronDown,
  Clock,
  Activity,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface NotificationLog {
  id: number;
  tool_type: string;
  event_type: string;
  channel: string;
  message_preview: string;
  status: string;
  error: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const TOOL_META: Record<string, { color: string; icon: typeof Bell; label: string }> = {
  slack:  { color: 'text-purple-400', icon: MessageSquare, label: 'Slack' },
  jira:   { color: 'text-blue-400',   icon: Ticket,        label: 'Jira' },
  teams:  { color: 'text-indigo-400', icon: MessageSquare, label: 'Teams' },
  github: { color: 'text-slate-300',  icon: Activity,      label: 'GitHub' },
};

const EVENT_LABELS: Record<string, string> = {
  heal_success: 'Heal Success',
  heal_failure: 'Heal Failure',
  rca_finding:  'RCA Finding',
  test_message: 'Test Message',
  ticket_created: 'Ticket Created',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function ActivityLog() {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/tools/logs?limit=100');
      const data = await res.json();
      if (data.success) setLogs(data.data || []);
    } catch (err) {
      console.error('Failed to fetch notification logs:', err);
    }
  }, []);

  useEffect(() => {
    fetchLogs().finally(() => setLoading(false));
  }, [fetchLogs]);

  const filteredLogs = filter === 'all'
    ? logs
    : logs.filter((l) => l.tool_type === filter);

  const displayedLogs = showAll ? filteredLogs : filteredLogs.slice(0, 10);

  const successCount = logs.filter((l) => l.status === 'success' || l.status === 'sent').length;
  const failedCount = logs.filter((l) => l.status === 'error' || l.status === 'failed').length;

  // Get unique tool types from logs
  const activeTools = [...new Set(logs.map((l) => l.tool_type))];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3 text-slate-400">
          <RefreshCw size={16} className="animate-spin" />
          <span className="text-sm">Loading activity...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Activity size={18} className="text-emerald-400" />
            Notification Activity
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time log of all outgoing notifications — Slack messages, Jira tickets, and more.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Stats pills */}
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400">
              <CheckCircle2 size={8} />
              {successCount} sent
            </span>
            {failedCount > 0 && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-red-500/10 border border-red-500/20 text-[10px] text-red-400">
                <XCircle size={8} />
                {failedCount} failed
              </span>
            )}
          </div>

          {/* Filter dropdown */}
          {activeTools.length > 1 && (
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="text-xs bg-[#1a1f2e] border border-[#2a3040] text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
            >
              <option value="all">All Tools</option>
              {activeTools.map((t) => (
                <option key={t} value={t}>
                  {TOOL_META[t]?.label || t}
                </option>
              ))}
            </select>
          )}

          {/* Refresh */}
          <button
            onClick={() => { setLoading(true); fetchLogs().finally(() => setLoading(false)); }}
            className="p-1.5 rounded-lg bg-[#1e293b] border border-[#334155] text-slate-400 hover:text-white transition-colors"
            title="Refresh logs"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {/* Empty State */}
      {logs.length === 0 ? (
        <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-10 text-center">
          <Bell size={28} className="text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400">No notifications sent yet.</p>
          <p className="text-xs text-slate-600 mt-1">
            Connect a tool above, then trigger a healing job to see notifications here.
          </p>
        </div>
      ) : (
        <>
          {/* Log Entries */}
          <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl overflow-hidden divide-y divide-[#2a3040]">
            {displayedLogs.map((log) => {
              const meta = TOOL_META[log.tool_type] || { color: 'text-slate-400', icon: Bell, label: log.tool_type };
              const Icon = meta.icon;
              const isSuccess = log.status === 'success' || log.status === 'sent';
              const isJiraTicket = log.tool_type === 'jira' && log.metadata?.issueKey;

              return (
                <div
                  key={log.id}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-[#0c1222]/30 transition-colors"
                >
                  {/* Tool Icon */}
                  <div className={`mt-0.5 shrink-0 ${meta.color}`}>
                    <Icon size={14} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-white">
                        {meta.label}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0c1222] text-slate-500 border border-[#2a3040]">
                        {EVENT_LABELS[log.event_type] || log.event_type}
                      </span>
                      {isSuccess ? (
                        <CheckCircle2 size={10} className="text-emerald-400" />
                      ) : (
                        <XCircle size={10} className="text-red-400" />
                      )}
                    </div>

                    {/* Message preview */}
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {log.message_preview}
                    </p>

                    {/* Jira ticket link */}
                    {isJiraTicket && (
                      <a
                        href={log.metadata.issueUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-1.5 text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <Ticket size={9} />
                        {log.metadata.issueKey}
                        <ExternalLink size={8} />
                      </a>
                    )}

                    {/* Error message */}
                    {log.error && (
                      <p className="text-[10px] text-red-400/70 mt-1 line-clamp-1">
                        Error: {log.error}
                      </p>
                    )}

                    {/* Channel info */}
                    {log.channel && (
                      <span className="text-[10px] text-slate-600 mt-0.5 block">
                        → {log.channel}
                      </span>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div className="flex items-center gap-1 shrink-0 text-[10px] text-slate-600">
                    <Clock size={9} />
                    {timeAgo(log.created_at)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Show More / Less */}
          {filteredLogs.length > 10 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="flex items-center gap-1.5 mx-auto text-xs text-slate-500 hover:text-slate-300 transition-colors py-2"
            >
              <ChevronDown size={12} className={showAll ? 'rotate-180 transition-transform' : 'transition-transform'} />
              {showAll ? 'Show less' : `Show all ${filteredLogs.length} entries`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
