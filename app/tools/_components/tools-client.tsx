'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Plug,
  Unplug,
  Loader2,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { ConnectDialog } from './connect-dialog';
import { ActivityLog } from './activity-log';

/* ------------------------------------------------------------------ */
/* Tool Registry — static definition of all supported integrations     */
/* ------------------------------------------------------------------ */

export interface ToolDefinition {
  type: string;
  name: string;
  description: string;
  category: 'vcs' | 'communication' | 'project' | 'ci';
  color: string;           // brand color
  iconBg: string;          // gradient CSS
  iconLetter: string;      // single char fallback
  docsUrl: string;
  available: boolean;
  fields: FieldDef[];
}

export interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'password' | 'url' | 'email' | 'select';
  placeholder: string;
  required: boolean;
  helpText?: string;
  options?: { value: string; label: string }[];
}

const TOOLS: ToolDefinition[] = [
  {
    type: 'github',
    name: 'GitHub',
    description: 'Push generated scripts as PRs, receive webhooks on CI failures, manage repositories.',
    category: 'vcs',
    color: '#6e40c9',
    iconBg: 'from-[#6e40c9] to-[#8b5cf6]',
    iconLetter: 'G',
    docsUrl: 'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token',
    available: true,
    fields: [
      { key: 'token', label: 'Personal Access Token', type: 'password', placeholder: 'ghp_xxxxxxxxxxxx', required: true, helpText: 'Needs repo, workflow, and pull_request scopes.' },
      { key: 'defaultOrg', label: 'Default Organization (optional)', type: 'text', placeholder: 'my-org', required: false },
    ],
  },
  {
    type: 'slack',
    name: 'Slack',
    description: 'Get real-time alerts for heal results, RCA findings, and daily QA digest summaries.',
    category: 'communication',
    color: '#E01E5A',
    iconBg: 'from-[#E01E5A] to-[#ECB22E]',
    iconLetter: 'S',
    docsUrl: 'https://api.slack.com/tutorials/tracks/getting-a-token',
    available: true,
    fields: [
      { key: 'botToken', label: 'Bot OAuth Token', type: 'password', placeholder: 'xoxb-xxxxxxxxxxxx', required: true, helpText: 'Create a Slack App → OAuth & Permissions → Bot Token.' },
      { key: 'channel', label: 'Default Channel', type: 'text', placeholder: '#qa-alerts', required: true, helpText: 'Channel name or ID for notifications.' },
      { key: 'notifyHealSuccess', label: 'Notify on Heal Success', type: 'select', placeholder: '', required: false, options: [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }] },
      { key: 'notifyHealFailure', label: 'Notify on Heal Failure', type: 'select', placeholder: '', required: false, options: [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }] },
      { key: 'notifyDailyDigest', label: 'Daily Digest', type: 'select', placeholder: '', required: false, options: [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }] },
    ],
  },
  {
    type: 'jira',
    name: 'Jira',
    description: 'Auto-create bug tickets from RCA findings, link healing PRs to stories, pull acceptance criteria.',
    category: 'project',
    color: '#0052CC',
    iconBg: 'from-[#0052CC] to-[#2684FF]',
    iconLetter: 'J',
    docsUrl: 'https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/',
    available: true,
    fields: [
      { key: 'instanceUrl', label: 'Jira Cloud URL', type: 'url', placeholder: 'https://yourcompany.atlassian.net', required: true },
      { key: 'email', label: 'Email Address', type: 'email', placeholder: 'you@company.com', required: true },
      { key: 'apiToken', label: 'API Token', type: 'password', placeholder: 'ATATT3xFfGF0...', required: true, helpText: 'Generate at id.atlassian.com → Security → API Tokens.' },
      { key: 'projectKey', label: 'Default Project Key', type: 'text', placeholder: 'QA', required: false, helpText: 'Project key for auto-created tickets.' },
      { key: 'issueType', label: 'Default Issue Type', type: 'select', placeholder: '', required: false, options: [{ value: 'Bug', label: 'Bug' }, { value: 'Task', label: 'Task' }, { value: 'Story', label: 'Story' }] },
    ],
  },
  {
    type: 'teams',
    name: 'Microsoft Teams',
    description: 'Post QA alerts and summaries to Teams channels via incoming webhooks.',
    category: 'communication',
    color: '#6264A7',
    iconBg: 'from-[#6264A7] to-[#7B83EB]',
    iconLetter: 'T',
    docsUrl: 'https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook',
    available: true,
    fields: [
      { key: 'webhookUrl', label: 'Incoming Webhook URL', type: 'password', placeholder: 'https://outlook.office.com/webhook/...', required: true, helpText: 'Channel → Connectors → Incoming Webhook → Create.' },
    ],
  },
  {
    type: 'gitlab',
    name: 'GitLab',
    description: 'Push scripts and create merge requests on GitLab repositories.',
    category: 'vcs',
    color: '#FC6D26',
    iconBg: 'from-[#FC6D26] to-[#FCA326]',
    iconLetter: 'L',
    docsUrl: 'https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html',
    available: false,
    fields: [
      { key: 'token', label: 'Personal Access Token', type: 'password', placeholder: 'glpat-xxxxxxxxxxxx', required: true },
      { key: 'instanceUrl', label: 'GitLab URL', type: 'url', placeholder: 'https://gitlab.com', required: false },
    ],
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  vcs: 'Version Control',
  communication: 'Communication',
  project: 'Project Management',
  ci: 'CI / CD',
};

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface StoredConnection {
  id: number;
  toolType: string;
  displayName: string;
  status: string;
  config: Record<string, any>;
  connectedAt: string | null;
  lastTestedAt: string | null;
  lastTestResult: string | null;
}

/* ------------------------------------------------------------------ */
/* Main Component                                                      */
/* ------------------------------------------------------------------ */

export function ToolsClient() {
  const [connections, setConnections] = useState<StoredConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingTool, setConnectingTool] = useState<ToolDefinition | null>(null);
  const [editingConnection, setEditingConnection] = useState<StoredConnection | null>(null);

  const fetchConnections = useCallback(async () => {
    try {
      const res = await fetch('/api/tools');
      const data = await res.json();
      if (data.success) setConnections(data.data || []);
    } catch (err) {
      console.error('Failed to fetch connections:', err);
    }
  }, []);

  useEffect(() => {
    fetchConnections().finally(() => setLoading(false));
  }, [fetchConnections]);

  const getConnection = (toolType: string) =>
    connections.find((c) => c.toolType === toolType) || null;

  const connectedCount = connections.filter((c) => c.status === 'connected').length;

  const handleConnect = (tool: ToolDefinition) => {
    const existing = getConnection(tool.type);
    setEditingConnection(existing);
    setConnectingTool(tool);
  };

  const handleDisconnect = async (conn: StoredConnection) => {
    if (!confirm(`Disconnect ${conn.displayName}? You can reconnect anytime.`)) return;
    try {
      await fetch(`/api/tools/${conn.id}`, { method: 'DELETE' });
      await fetchConnections();
    } catch (err) {
      console.error('Disconnect failed:', err);
    }
  };

  const handleSaved = () => {
    setConnectingTool(null);
    setEditingConnection(null);
    fetchConnections();
  };

  // Group tools by category
  const categories = [...new Set(TOOLS.map((t) => t.category))];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-slate-400">
          <RefreshCw size={20} className="animate-spin" />
          <span>Loading integrations...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-display">Integrations</h1>
          <p className="text-sm text-slate-400 mt-1">
            Connect your tools to unlock automated workflows, notifications, and ticket management.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <Plug size={12} className="text-emerald-400" />
            <span className="text-xs text-emerald-400 font-medium">
              {connectedCount} connected
            </span>
          </div>
          <button
            onClick={() => fetchConnections()}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1e293b] border border-[#334155] text-slate-300 hover:text-white hover:bg-[#334155] transition-colors text-xs"
          >
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>
      </div>

      {/* Security Note */}
      <div className="bg-[#1a1f2e]/60 border border-[#2a3040] rounded-xl px-4 py-3 flex items-start gap-3">
        <ShieldCheck size={16} className="text-emerald-400 mt-0.5 shrink-0" />
        <p className="text-xs text-slate-400 leading-relaxed">
          Credentials are stored securely and never exposed to the browser. Tokens are masked after saving.
          You can test connections before saving, and disconnect anytime.
        </p>
      </div>

      {/* Tool Categories */}
      {categories.map((cat) => {
        const catTools = TOOLS.filter((t) => t.category === cat);
        return (
          <div key={cat}>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              {CATEGORY_LABELS[cat] || cat}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {catTools.map((tool) => {
                const conn = getConnection(tool.type);
                const isConnected = conn?.status === 'connected';
                const isError = conn?.status === 'error';
                const isComingSoon = !tool.available;

                return (
                  <div
                    key={tool.type}
                    className={`group relative bg-[#1a1f2e] border rounded-xl overflow-hidden transition-all hover:shadow-lg ${
                      isConnected
                        ? 'border-emerald-500/30 hover:border-emerald-500/50'
                        : isError
                          ? 'border-red-500/30 hover:border-red-500/50'
                          : isComingSoon
                            ? 'border-[#2a3040] opacity-60'
                            : 'border-[#2a3040] hover:border-[#3a4050]'
                    }`}
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        {/* Icon + Name */}
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-11 h-11 rounded-xl bg-gradient-to-br ${tool.iconBg} flex items-center justify-center text-white font-bold text-lg shadow-lg`}
                          >
                            {tool.iconLetter}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-semibold text-white">{tool.name}</h3>
                              {isConnected && (
                                <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                  <CheckCircle2 size={8} />
                                  Connected
                                </span>
                              )}
                              {isError && (
                                <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
                                  <AlertTriangle size={8} />
                                  Error
                                </span>
                              )}
                              {isComingSoon && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-500/10 border border-slate-500/20 text-slate-500">
                                  Coming Soon
                                </span>
                              )}
                            </div>
                            {conn?.connectedAt && (
                              <p className="text-[10px] text-slate-600 mt-0.5">
                                Connected {new Date(conn.connectedAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Docs Link */}
                        <a
                          href={tool.docsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-md text-slate-600 hover:text-slate-400 hover:bg-[#0c1222] transition-colors"
                          title="Setup docs"
                        >
                          <ExternalLink size={12} />
                        </a>
                      </div>

                      <p className="text-xs text-slate-400 leading-relaxed mb-4">
                        {tool.description}
                      </p>

                      {/* Connection Details (when connected) */}
                      {isConnected && conn && (
                        <div className="bg-[#0c1222] rounded-lg p-3 mb-3">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              {renderConnectionSummary(tool.type, conn.config)}
                            </div>
                            {conn.lastTestedAt && (
                              <div className="text-right">
                                <p className="text-[10px] text-slate-600">Last tested</p>
                                <p className={`text-[10px] ${
                                  conn.lastTestResult === 'success' ? 'text-emerald-400' : 'text-red-400'
                                }`}>
                                  {new Date(conn.lastTestedAt).toLocaleDateString()}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {isComingSoon ? (
                          <span className="text-xs text-slate-600 italic">Available in upcoming release</span>
                        ) : isConnected ? (
                          <>
                            <button
                              onClick={() => handleConnect(tool)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0c1222] border border-[#334155] text-slate-300 hover:text-white hover:bg-[#1e293b] transition-colors text-xs"
                            >
                              Manage
                              <ChevronRight size={10} />
                            </button>
                            <button
                              onClick={() => handleDisconnect(conn!)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-red-400/70 hover:text-red-400 hover:bg-red-500/5 transition-colors text-xs"
                            >
                              <Unplug size={10} />
                              Disconnect
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleConnect(tool)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white text-xs font-medium transition-all shadow-md bg-gradient-to-r ${tool.iconBg} hover:opacity-90`}
                          >
                            <Plug size={12} />
                            Connect {tool.name}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Notification Activity Log */}
      <div className="border-t border-[#2a3040] pt-8">
        <ActivityLog />
      </div>

      {/* Connect Dialog */}
      {connectingTool && (
        <ConnectDialog
          tool={connectingTool}
          existing={editingConnection}
          onClose={() => { setConnectingTool(null); setEditingConnection(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Connection summary per tool type                                    */
/* ------------------------------------------------------------------ */

function renderConnectionSummary(toolType: string, config: Record<string, any>) {
  switch (toolType) {
    case 'github':
      return (
        <>
          <p className="text-[10px] text-slate-500">Token: <span className="text-slate-400 font-mono">{config.token || '••••'}</span></p>
          {config.defaultOrg && <p className="text-[10px] text-slate-500">Org: <span className="text-slate-400">{config.defaultOrg}</span></p>}
        </>
      );
    case 'slack':
      return (
        <>
          <p className="text-[10px] text-slate-500">Token: <span className="text-slate-400 font-mono">{config.botToken || '••••'}</span></p>
          {config.channel && <p className="text-[10px] text-slate-500">Channel: <span className="text-slate-400">{config.channel}</span></p>}
        </>
      );
    case 'jira':
      return (
        <>
          {config.instanceUrl && <p className="text-[10px] text-slate-500">Instance: <span className="text-slate-400">{config.instanceUrl}</span></p>}
          {config.email && <p className="text-[10px] text-slate-500">User: <span className="text-slate-400">{config.email}</span></p>}
          {config.projectKey && <p className="text-[10px] text-slate-500">Project: <span className="text-slate-400">{config.projectKey}</span></p>}
        </>
      );
    case 'teams':
      return (
        <p className="text-[10px] text-slate-500">Webhook: <span className="text-slate-400 font-mono">{config.webhookUrl || '••••'}</span></p>
      );
    default:
      return null;
  }
}
