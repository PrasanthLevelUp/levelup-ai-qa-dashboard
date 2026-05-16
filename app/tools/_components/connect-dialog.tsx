'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Plug,
  Loader2,
  CheckCircle2,
  XCircle,
  FlaskConical,
  Save,
  ExternalLink,
} from 'lucide-react';
import type { ToolDefinition, StoredConnection } from './tools-client';

interface ConnectDialogProps {
  tool: ToolDefinition;
  existing: StoredConnection | null;
  onClose: () => void;
  onSaved: () => void;
}

export function ConnectDialog({ tool, existing, onClose, onSaved }: ConnectDialogProps) {
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Initialise form from existing connection (but tokens come masked, so clear password fields)
  useEffect(() => {
    if (existing?.config) {
      const initial: Record<string, string> = {};
      for (const field of tool.fields) {
        const val = existing.config[field.key];
        // Don't prefill masked tokens
        if (field.type === 'password' && typeof val === 'string' && val.includes('••••')) {
          initial[field.key] = '';
        } else {
          initial[field.key] = val != null ? String(val) : (field.type === 'select' && field.options ? field.options[0]?.value || '' : '');
        }
      }
      setFormValues(initial);
    } else {
      // Defaults for new
      const initial: Record<string, string> = {};
      for (const field of tool.fields) {
        initial[field.key] = field.type === 'select' && field.options ? field.options[0]?.value || '' : '';
      }
      setFormValues(initial);
    }
  }, [existing, tool.fields]);

  const updateField = (key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
    setTestResult(null);
    setSaveError(null);
  };

  const getConfigPayload = (): Record<string, any> => {
    const config: Record<string, any> = {};
    for (const field of tool.fields) {
      const val = formValues[field.key];
      if (val !== undefined && val !== '') {
        config[field.key] = val;
      }
    }
    return config;
  };

  const requiredFieldsMissing = tool.fields
    .filter((f) => f.required)
    .some((f) => !formValues[f.key]?.trim());

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/tools/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolType: tool.type,
          config: getConfigPayload(),
          id: existing?.id,
        }),
      });
      const data = await res.json();
      setTestResult(data.result || { success: false, message: data.error || 'Unknown error' });
    } catch {
      setTestResult({ success: false, message: 'Network error — could not reach server.' });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);

    try {
      const res = await fetch('/api/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolType: tool.type,
          displayName: tool.name,
          config: getConfigPayload(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        onSaved();
      } else {
        setSaveError(data.error || 'Failed to save');
      }
    } catch {
      setSaveError('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative bg-[#1a1f2e] border border-[#2a3040] rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#1a1f2e] border-b border-[#2a3040] px-6 py-4 flex items-center justify-between z-10 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tool.iconBg} flex items-center justify-center text-white font-bold text-lg`}
            >
              {tool.iconLetter}
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                {existing ? `Manage ${tool.name}` : `Connect ${tool.name}`}
              </h2>
              <p className="text-[11px] text-slate-500">
                {existing ? 'Update credentials or test connection' : 'Enter your credentials to connect'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-[#334155] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Fields */}
          {tool.fields.map((field) => (
            <div key={field.key}>
              <label className="block text-xs text-slate-400 mb-1.5">
                {field.label}
                {field.required && <span className="text-red-400 ml-0.5">*</span>}
              </label>

              {field.type === 'select' && field.options ? (
                <select
                  value={formValues[field.key] || ''}
                  onChange={(e) => updateField(field.key, e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-[#0c1222] border border-[#334155] text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-violet-500"
                >
                  {field.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type === 'password' ? 'password' : field.type === 'url' ? 'url' : field.type === 'email' ? 'email' : 'text'}
                  value={formValues[field.key] || ''}
                  onChange={(e) => updateField(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2.5 rounded-lg bg-[#0c1222] border border-[#334155] text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  autoComplete="off"
                />
              )}

              {field.helpText && (
                <p className="text-[10px] text-slate-600 mt-1">{field.helpText}</p>
              )}
            </div>
          ))}

          {/* Docs Link */}
          <a
            href={tool.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors"
          >
            <ExternalLink size={10} />
            How to get your {tool.name} credentials
          </a>

          {/* Test Result */}
          {testResult && (
            <div
              className={`rounded-lg px-4 py-3 border text-xs ${
                testResult.success
                  ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/5 border-red-500/20 text-red-400'
              }`}
            >
              <div className="flex items-center gap-2 mb-0.5">
                {testResult.success ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                <span className="font-medium">
                  {testResult.success ? 'Connection Successful' : 'Connection Failed'}
                </span>
              </div>
              <p className="text-[11px] opacity-80">{testResult.message}</p>
            </div>
          )}

          {/* Save Error */}
          {saveError && (
            <div className="rounded-lg px-4 py-3 border bg-red-500/5 border-red-500/20 text-xs text-red-400">
              {saveError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#1a1f2e] border-t border-[#2a3040] px-6 py-4 flex items-center justify-between rounded-b-2xl">
          <button
            onClick={handleTest}
            disabled={testing || requiredFieldsMissing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0c1222] border border-[#334155] text-slate-300 hover:text-white hover:bg-[#1e293b] disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-medium"
          >
            {testing ? (
              <><Loader2 size={12} className="animate-spin" /> Testing...</>
            ) : (
              <><FlaskConical size={12} /> Test Connection</>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg text-slate-400 hover:text-white transition-colors text-xs"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || requiredFieldsMissing}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium transition-all shadow-lg shadow-violet-500/20"
            >
              {saving ? (
                <><Loader2 size={12} className="animate-spin" /> Saving...</>
              ) : (
                <><Save size={12} /> {existing ? 'Update Connection' : 'Save & Connect'}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
