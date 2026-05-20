'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Upload, RefreshCw, CheckCircle2, XCircle, Clock, Loader2,
  GitBranch, GitCommit, ArrowRight, Box, Webhook,
} from 'lucide-react';

interface IngestionItem {
  id: number;
  company_id: number;
  provider: string;
  build_id: string | null;
  repo_url: string | null;
  branch: string | null;
  commit_sha: string | null;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  skipped_tests: number;
  status: string;
  healing_job_id: string | null;
  error_message: string | null;
  metadata: any;
  created_at: string;
  completed_at: string | null;
}

const STATUS_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  received: { icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  processing: { icon: Loader2, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  completed: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  failed: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
};

const PROVIDER_LABELS: Record<string, { label: string; color: string }> = {
  playwright: { label: 'Playwright', color: 'text-green-400 bg-green-500/10' },
  junit: { label: 'JUnit XML', color: 'text-orange-400 bg-orange-500/10' },
  browserstack: { label: 'BrowserStack', color: 'text-purple-400 bg-purple-500/10' },
  lambdatest: { label: 'LambdaTest', color: 'text-cyan-400 bg-cyan-500/10' },
  generic: { label: 'Generic', color: 'text-slate-400 bg-slate-500/10' },
};

export function IngestionClient() {
  const [items, setItems] = useState<IngestionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 25;

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/backend/ingest/history?limit=${limit}&offset=${offset}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setTotal(data.total || 0);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [offset]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // Auto-refresh every 10s
  useEffect(() => {
    const iv = setInterval(fetchHistory, 10000);
    return () => clearInterval(iv);
  }, [fetchHistory]);

  const stats = {
    total: items.length,
    completed: items.filter(i => i.status === 'completed').length,
    processing: items.filter(i => i.status === 'processing').length,
    failed: items.filter(i => i.status === 'failed').length,
    totalTests: items.reduce((s, i) => s + (i.total_tests || 0), 0),
    totalFailures: items.reduce((s, i) => s + (i.failed_tests || 0), 0),
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Upload className="w-6 h-6 text-blue-400" />
            </div>
            Ingestion History
          </h1>
          <p className="text-slate-400 mt-1">
            Test results ingested from CI pipelines, BrowserStack, LambdaTest, and webhook integrations.
          </p>
        </div>
        <button onClick={fetchHistory} className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Ingestions', value: total, color: 'text-blue-400' },
          { label: 'Completed', value: stats.completed, color: 'text-emerald-400' },
          { label: 'Processing', value: stats.processing, color: 'text-amber-400' },
          { label: 'Total Tests Analyzed', value: stats.totalTests, color: 'text-white' },
        ].map(s => (
          <div key={s.label} className="bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3">
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl overflow-hidden">
        {loading && items.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            Loading ingestion history...
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center">
            <Upload className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No ingestions yet</p>
            <p className="text-slate-500 text-sm mt-1">
              Send test results using the Ingest API or configure a webhook from BrowserStack/LambdaTest.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-slate-500 uppercase tracking-wider border-b border-slate-700/50">
                  <th className="px-4 py-3 text-left">Time</th>
                  <th className="px-4 py-3 text-left">Provider</th>
                  <th className="px-4 py-3 text-left">Repository</th>
                  <th className="px-4 py-3 text-center">Tests</th>
                  <th className="px-4 py-3 text-center">Failures</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-left">Healing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {items.map(item => {
                  const sc = STATUS_CONFIG[item.status] || STATUS_CONFIG.received;
                  const StatusIcon = sc.icon;
                  const prov = PROVIDER_LABELS[item.provider] || PROVIDER_LABELS.generic;

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-sm text-slate-300">
                          {new Date(item.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-slate-500">
                          {new Date(item.created_at).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${prov.color}`}>
                          {prov.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="max-w-[200px]">
                          {item.repo_url ? (
                            <div className="text-sm text-slate-300 truncate" title={item.repo_url}>
                              {item.repo_url.replace(/^https?:\/\/(github\.com\/)?/, '')}
                            </div>
                          ) : (
                            <span className="text-slate-600 text-sm">—</span>
                          )}
                          {item.branch && (
                            <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                              <GitBranch className="w-3 h-3" />
                              {item.branch}
                              {item.commit_sha && (
                                <span className="flex items-center gap-0.5 ml-2">
                                  <GitCommit className="w-3 h-3" />
                                  {item.commit_sha.slice(0, 7)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm text-white font-medium">{item.total_tests}</span>
                        <div className="text-xs text-slate-500">
                          <span className="text-emerald-400">{item.passed_tests}✓</span>
                          {' '}
                          <span className="text-slate-500">{item.skipped_tests}⊘</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.failed_tests > 0 ? (
                          <span className="text-sm font-bold text-red-400">{item.failed_tests}</span>
                        ) : (
                          <span className="text-sm text-emerald-400">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${sc.bg} ${sc.color}`}>
                          <StatusIcon className={`w-3 h-3 ${item.status === 'processing' ? 'animate-spin' : ''}`} />
                          {item.status}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {item.healing_job_id ? (
                          <a
                            href={`/jobs`}
                            className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                          >
                            Job {item.healing_job_id.slice(0, 8)}
                            <ArrowRight className="w-3 h-3" />
                          </a>
                        ) : item.failed_tests > 0 ? (
                          <span className="text-xs text-slate-500">No repo URL</span>
                        ) : (
                          <span className="text-xs text-emerald-400/60">Not needed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > limit && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700/50">
            <span className="text-xs text-slate-500">Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="px-3 py-1.5 rounded bg-slate-700 text-slate-300 text-xs disabled:opacity-30"
              >
                Previous
              </button>
              <button
                onClick={() => setOffset(offset + limit)}
                disabled={offset + limit >= total}
                className="px-3 py-1.5 rounded bg-slate-700 text-slate-300 text-xs disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
