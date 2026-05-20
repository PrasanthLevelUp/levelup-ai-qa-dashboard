'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Key, Plus, Copy, Trash2, Eye, EyeOff, Shield, Clock, CheckCircle2,
  AlertTriangle, RefreshCw, Terminal, Webhook,
} from 'lucide-react';

interface ApiKeyItem {
  id: number;
  name: string;
  prefix: string;
  scopes: string[];
  rate_limit: number;
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

const SCOPE_OPTIONS = [
  { value: 'ingest:write', label: 'Ingest (Upload Results)', description: 'Upload test results via API or webhook' },
  { value: 'jobs:read', label: 'Jobs (Read)', description: 'View healing job status and history' },
  { value: 'jobs:trigger', label: 'Jobs (Trigger)', description: 'Trigger healing jobs manually' },
  { value: 'healing:read', label: 'Healing (Read)', description: 'View healing results and reports' },
  { value: 'scripts:generate', label: 'Script Gen', description: 'Generate test scripts' },
  { value: 'admin', label: 'Admin (Full)', description: 'Full access to all endpoints' },
];

export function ApiKeysClient() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(['ingest:write']);
  const [newKeyExpiry, setNewKeyExpiry] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/backend/keys');
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys || []);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/backend/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName.trim(),
          scopes: newKeyScopes,
          expiresInDays: newKeyExpiry ? parseInt(newKeyExpiry) : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCreatedKey(data.key);
        setNewKeyName('');
        setNewKeyScopes(['ingest:write']);
        setNewKeyExpiry('');
        fetchKeys();
      } else {
        setError(data.message || 'Failed to create key');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (keyId: number) => {
    if (!confirm('Revoke this API key? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/backend/keys/${keyId}`, { method: 'DELETE' });
      if (res.ok) fetchKeys();
    } catch { /* ignore */ }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const toggleScope = (scope: string) => {
    setNewKeyScopes(prev =>
      prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]
    );
  };

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Key className="w-6 h-6 text-amber-400" />
            </div>
            API Keys
          </h1>
          <p className="text-slate-400 mt-1">
            Manage API keys for CI/CD integration, webhook authentication, and programmatic access.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchKeys} className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button
            onClick={() => { setShowCreate(true); setCreatedKey(null); setError(null); }}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create API Key
          </button>
        </div>
      </div>

      {/* Created Key Banner */}
      {createdKey && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-amber-300 font-semibold">Save your API key now!</h3>
              <p className="text-amber-200/70 text-sm mt-1">
                This key will not be shown again. Copy it and store it securely.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <code className="bg-slate-900 px-4 py-2 rounded-lg text-emerald-400 font-mono text-sm flex-1 break-all">
                  {createdKey}
                </code>
                <button
                  onClick={() => copyToClipboard(createdKey)}
                  className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm flex items-center gap-1.5"
                >
                  {copiedKey ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedKey ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Form */}
      {showCreate && !createdKey && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6 space-y-4">
          <h3 className="text-white font-semibold text-lg">Create New API Key</h3>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="text-sm text-slate-400 block mb-1">Key Name</label>
            <input
              value={newKeyName}
              onChange={e => setNewKeyName(e.target.value)}
              placeholder="e.g., GitHub Actions CI, Jenkins Pipeline"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-sm text-slate-400 block mb-2">Permissions (Scopes)</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {SCOPE_OPTIONS.map(scope => (
                <button
                  key={scope.value}
                  onClick={() => toggleScope(scope.value)}
                  className={`text-left p-3 rounded-lg border transition-all ${
                    newKeyScopes.includes(scope.value)
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <div className="text-sm font-medium">{scope.label}</div>
                  <div className="text-xs mt-0.5 opacity-70">{scope.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-400 block mb-1">Expiry (optional)</label>
            <select
              value={newKeyExpiry}
              onChange={e => setNewKeyExpiry(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-emerald-500/40"
            >
              <option value="">Never expires</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="180">180 days</option>
              <option value="365">1 year</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleCreate}
              disabled={creating || !newKeyName.trim()}
              className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm"
            >
              {creating ? 'Creating...' : 'Create Key'}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-5 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Integration Quick Start */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-blue-400" /> Quick Integration
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">CI Pipeline (curl)</p>
            <pre className="bg-slate-900 rounded-lg p-3 text-xs text-slate-300 overflow-x-auto">
{`curl -X POST ${baseUrl || 'https://api.levelupqa.com'}/api/ingest \\\n  -H "Authorization: Bearer lvlp_live_xxx" \\\n  -H "Content-Type: application/json" \\\n  -H "X-Repo-Url: https://github.com/org/repo" \\\n  -H "X-Branch: main" \\\n  -d @test-results.json`}
            </pre>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Webhook className="w-3 h-3" /> BrowserStack Webhook
            </p>
            <pre className="bg-slate-900 rounded-lg p-3 text-xs text-slate-300 overflow-x-auto">
{`Callback URL:\n${baseUrl || 'https://api.levelupqa.com'}/api/hooks/browserstack?token=lvlp_live_xxx\n\nAdd this in BrowserStack Dashboard →\nSettings → Webhooks → callback_url`}
            </pre>
          </div>
        </div>
      </div>

      {/* Keys List */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl">
        <div className="px-5 py-4 border-b border-slate-700/50">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            Active Keys ({keys.filter(k => k.is_active).length})
          </h3>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading keys...</div>
        ) : keys.length === 0 ? (
          <div className="p-8 text-center">
            <Key className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No API keys yet</p>
            <p className="text-slate-500 text-sm mt-1">Create a key to start integrating with your CI/CD pipeline</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {keys.map(key => (
              <div key={key.id} className="px-5 py-4 flex items-center gap-4">
                <div className={`p-2 rounded-lg ${key.is_active ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                  <Key className={`w-4 h-4 ${key.is_active ? 'text-emerald-400' : 'text-red-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{key.name}</span>
                    <code className="text-xs bg-slate-900 px-2 py-0.5 rounded text-slate-400 font-mono">
                      {key.prefix}....
                    </code>
                    {!key.is_active && (
                      <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">Revoked</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      {key.scopes.join(', ')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Created {new Date(key.created_at).toLocaleDateString()}
                    </span>
                    {key.last_used_at && (
                      <span className="text-emerald-400/70">
                        Last used {new Date(key.last_used_at).toLocaleDateString()}
                      </span>
                    )}
                    {key.expires_at && (
                      <span className={new Date(key.expires_at) < new Date() ? 'text-red-400' : 'text-amber-400'}>
                        {new Date(key.expires_at) < new Date() ? 'Expired' : `Expires ${new Date(key.expires_at).toLocaleDateString()}`}
                      </span>
                    )}
                  </div>
                </div>
                {key.is_active && (
                  <button
                    onClick={() => handleRevoke(key.id)}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors"
                    title="Revoke key"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
