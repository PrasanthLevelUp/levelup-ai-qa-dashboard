'use client';

import { useState, useEffect } from 'react';
import {
  Webhook, Shield, CheckCircle2, Copy, ExternalLink,
  Loader2, AlertTriangle, ArrowRight, Zap, GitBranch,
  Activity, Clock, RefreshCw, Settings, ChevronDown,
  ChevronRight, Github,
} from 'lucide-react';
import { useProject } from '@/lib/project-context';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface WebhookConfig {
  id: number;
  webhookUrl: string;
  secret: string;
  events: string[];
  contentType: string;
  instructions: Record<string, string>;
}

interface WebhookStatus {
  configured: boolean;
  message?: string;
  webhook?: {
    id: number;
    webhookUrl: string;
    repositoryName: string | null;
    repositoryUrl: string | null;
    eventsReceived: number;
    lastEventAt: string | null;
    isActive: boolean;
    createdAt: string;
  };
}

interface WebhookEvent {
  id: number;
  event_type: string;
  action: string | null;
  repo_url: string | null;
  branch: string | null;
  commit_sha: string | null;
  workflow_name: string | null;
  workflow_conclusion: string | null;
  healing_job_id: string | null;
  status: string;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function WebhooksClient() {
  const { activeProject } = useProject();
  const [status, setStatus] = useState<WebhookStatus | null>(null);
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [configuring, setConfiguring] = useState(false);
  const [newConfig, setNewConfig] = useState<WebhookConfig | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [showEvents, setShowEvents] = useState(false);

  const projectId = activeProject?.id;

  // Fetch status + events
  useEffect(() => {
    if (!projectId) { setLoading(false); return; }
    (async () => {
      try {
        const [statusRes, eventsRes] = await Promise.all([
          fetch(`/api/projects/${projectId}/webhook-status`),
          fetch('/api/ci-webhooks/events?limit=20'),
        ]);
        if (statusRes.ok) setStatus(await statusRes.json());
        if (eventsRes.ok) {
          const d = await eventsRes.json();
          setEvents(d.events || []);
        }
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [projectId]);

  const handleConfigure = async () => {
    if (!projectId) return;
    setConfiguring(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/configure-webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success && data.webhook) {
        setNewConfig(data.webhook);
        // Refresh status
        const statusRes = await fetch(`/api/projects/${projectId}/webhook-status`);
        if (statusRes.ok) setStatus(await statusRes.json());
      }
    } catch { /* ignore */ }
    setConfiguring(false);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    );
  }

  if (!projectId) {
    return (
      <div className="text-center py-24">
        <Webhook className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">Select a Project</h3>
        <p className="text-sm text-slate-400">Choose a project from the sidebar to configure webhooks.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">

      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-violet-500/20 to-purple-500/20 rounded-xl border border-violet-500/20">
            <Webhook className="w-5 h-5 text-violet-400" />
          </div>
          Autonomous CI Healing
        </h2>
        <p className="text-sm text-slate-400 mt-2">
          Connect your GitHub repository to automatically heal failing tests when CI runs.
        </p>
      </div>

      {/* The Flow */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
        <h3 className="text-sm font-semibold text-white mb-4">How It Works</h3>
        <div className="flex items-center gap-3 flex-wrap justify-center">
          {[
            { icon: '💻', label: 'Push Code' },
            { icon: '🔄', label: 'CI Runs Tests' },
            { icon: '❌', label: 'Test Fails' },
            { icon: '📡', label: 'Webhook Fires' },
            { icon: '🤖', label: 'AI Heals' },
            { icon: '🔧', label: 'Fix PR Created' },
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex flex-col items-center gap-1">
                <span className="text-lg">{step.icon}</span>
                <span className="text-xs text-slate-400">{step.label}</span>
              </div>
              {i < 5 && <ArrowRight className="w-4 h-4 text-slate-600" />}
            </div>
          ))}
        </div>
      </div>

      {/* Status Card */}
      {status?.configured ? (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-semibold text-emerald-300">Webhook Active</span>
            <span className="text-xs text-slate-500 ml-auto">
              Since {status.webhook?.createdAt ? new Date(status.webhook.createdAt).toLocaleDateString() : '—'}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-slate-500">Events Received</p>
              <p className="text-lg font-bold text-white">{status.webhook?.eventsReceived || 0}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Last Event</p>
              <p className="text-sm text-white">
                {status.webhook?.lastEventAt
                  ? new Date(status.webhook.lastEventAt).toLocaleString()
                  : 'No events yet'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Repository</p>
              <p className="text-sm text-white truncate">{status.webhook?.repositoryName || 'Any'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Endpoint</p>
              <p className="text-xs text-slate-300 font-mono truncate">{status.webhook?.webhookUrl}</p>
            </div>
          </div>
          <button
            onClick={handleConfigure}
            className="mt-4 text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Regenerate Secret
          </button>
        </div>
      ) : (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <span className="text-sm font-semibold text-amber-300">Not Configured</span>
          </div>
          <p className="text-sm text-slate-400 mb-4">
            Set up a GitHub webhook to enable autonomous healing.
          </p>
          <button
            onClick={handleConfigure}
            disabled={configuring}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-all"
          >
            {configuring ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
            Configure Webhook
          </button>
        </div>
      )}

      {/* Setup Instructions — shown after configuring */}
      {newConfig && (
        <div className="bg-slate-800/80 border border-violet-500/30 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-violet-400" />
            Webhook Setup Instructions
          </h3>

          <div className="bg-slate-900/50 rounded-lg p-4 space-y-3">
            <p className="text-xs text-slate-400 font-medium">1. Go to your GitHub repo → Settings → Webhooks → Add webhook</p>

            <div>
              <label className="text-xs text-slate-500 block mb-1">Payload URL</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-slate-800 text-emerald-300 px-3 py-2 rounded text-xs font-mono truncate">
                  {newConfig.webhookUrl}
                </code>
                <button
                  onClick={() => copyToClipboard(newConfig.webhookUrl, 'url')}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  {copied === 'url' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-500 block mb-1">Secret</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-slate-800 text-amber-300 px-3 py-2 rounded text-xs font-mono truncate">
                  {newConfig.secret}
                </code>
                <button
                  onClick={() => copyToClipboard(newConfig.secret, 'secret')}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  {copied === 'secret' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-400 font-medium">2. Content type: <code className="text-violet-300">application/json</code></p>
            <p className="text-xs text-slate-400 font-medium">3. Select events: <code className="text-violet-300">Workflow runs</code></p>
            <p className="text-xs text-slate-400 font-medium">4. Click <strong className="text-white">Add webhook</strong></p>
          </div>

          <div className="flex items-center gap-2 pt-2 text-xs text-emerald-400">
            <Zap className="w-3.5 h-3.5" />
            <span>Once configured, failing CI tests will be auto-healed with a fix PR!</span>
          </div>
        </div>
      )}

      {/* Recent Events */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
        <button
          onClick={() => setShowEvents(!showEvents)}
          className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-700/30 transition-colors"
        >
          <Activity className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-semibold text-white flex-1 text-left">
            Recent Webhook Events ({events.length})
          </span>
          {showEvents ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
        </button>

        {showEvents && (
          <div className="border-t border-slate-700/50">
            {events.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No webhook events yet</p>
                <p className="text-xs text-slate-500 mt-1">Events will appear here when GitHub sends webhook notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-700/50 max-h-96 overflow-y-auto">
                {events.map((evt) => (
                  <div key={evt.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-700/20">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusColor(evt.status)}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-white">{evt.event_type}</span>
                        {evt.workflow_name && (
                          <span className="text-xs text-slate-500">• {evt.workflow_name}</span>
                        )}
                        {evt.workflow_conclusion && (
                          <span className={`text-xs px-1.5 py-0.5 rounded ${getConclusionColor(evt.workflow_conclusion)}`}>
                            {evt.workflow_conclusion}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {evt.branch && <span className="text-xs text-slate-500 flex items-center gap-1"><GitBranch className="w-3 h-3" />{evt.branch}</span>}
                        {evt.commit_sha && <span className="text-xs text-slate-600 font-mono">{evt.commit_sha.slice(0, 7)}</span>}
                        {evt.healing_job_id && (
                          <span className="text-xs text-emerald-400 flex items-center gap-1">
                            <Zap className="w-3 h-3" /> {evt.healing_job_id}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 flex-shrink-0">
                      {new Date(evt.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* GitHub Actions Example */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Github className="w-4 h-4 text-slate-400" />
          Example GitHub Actions Workflow
        </h3>
        <pre className="bg-slate-900/70 rounded-lg p-4 text-xs text-slate-300 overflow-x-auto font-mono whitespace-pre">
{`name: Playwright Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: test-results
          path: test-results/`}
        </pre>
        <p className="text-xs text-slate-500 mt-3">
          When this workflow fails, the webhook will fire and LevelUp AI will automatically attempt to heal the broken tests.
        </p>
      </div>
    </div>
  );
}

/* ── Helpers ────────────────────────────────────────────────────── */

function getStatusColor(status: string): string {
  switch (status) {
    case 'healing_triggered': return 'bg-emerald-400';
    case 'skipped_success': return 'bg-blue-400';
    case 'push_logged': return 'bg-slate-400';
    case 'received': return 'bg-yellow-400';
    case 'ignored': return 'bg-slate-600';
    default: return 'bg-slate-500';
  }
}

function getConclusionColor(conclusion: string): string {
  switch (conclusion) {
    case 'failure': return 'bg-red-500/20 text-red-300';
    case 'success': return 'bg-emerald-500/20 text-emerald-300';
    case 'timed_out': return 'bg-amber-500/20 text-amber-300';
    case 'cancelled': return 'bg-slate-500/20 text-slate-300';
    default: return 'bg-slate-500/20 text-slate-400';
  }
}
