'use client';

/**
 * Healing Config admin page (Issue #3).
 * Lets admins tune the confidence thresholds that route a healing between the
 * Rule / Pattern / AI engines, toggle the AI fallback, and cap cost. Settings are
 * scoped to the active project; when nothing is stored the engine defaults apply.
 */

import { useCallback, useEffect, useState } from 'react';
import { useProject } from '@/lib/project-context';
import { toast } from 'sonner';
import {
  HeartPulse, RefreshCw, Save, RotateCcw, Info, Bot, DollarSign, Gauge,
} from 'lucide-react';

interface HealingSettings {
  ruleThreshold: number;
  patternThreshold: number;
  aiThreshold: number;
  aiFallbackEnabled: boolean;
  maxCostPerHealing: number;
  maxDailyTokenBudget: number;
}

const FALLBACK_DEFAULTS: HealingSettings = {
  ruleThreshold: 0.70,
  patternThreshold: 0.60,
  aiThreshold: 0.50,
  aiFallbackEnabled: true,
  maxCostPerHealing: 0.10,
  maxDailyTokenBudget: 100000,
};

function ThresholdSlider({
  label, description, value, onChange, accent,
}: {
  label: string; description: string; value: number; onChange: (v: number) => void; accent: string;
}) {
  return (
    <div className="bg-[#0c1222] border border-[#334155] rounded-lg p-4">
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm font-medium text-white">{label}</label>
        <span className={`text-sm font-semibold ${accent}`}>{Math.round(value * 100)}%</span>
      </div>
      <p className="text-xs text-slate-500 mb-3">{description}</p>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={Math.round(value * 100)}
        onChange={(e) => onChange(parseInt(e.target.value, 10) / 100)}
        className="w-full accent-violet-500"
      />
      <div className="flex justify-between text-[10px] text-slate-600 mt-1">
        <span>0%</span><span>50%</span><span>100%</span>
      </div>
    </div>
  );
}

export default function HealingSettingsClient() {
  const { activeProject } = useProject();
  const projectId = activeProject?.id ?? null;

  const [settings, setSettings] = useState<HealingSettings>(FALLBACK_DEFAULTS);
  const [defaults, setDefaults] = useState<HealingSettings>(FALLBACK_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (projectId) headers['x-project-id'] = String(projectId);
      const res = await fetch('/api/healing-settings', { headers, cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.settings) setSettings({ ...FALLBACK_DEFAULTS, ...data.settings });
        if (data.defaults) setDefaults({ ...FALLBACK_DEFAULTS, ...data.defaults });
        setDirty(false);
      }
    } catch {
      toast.error('Failed to load healing settings');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const update = (patch: Partial<HealingSettings>) => {
    setSettings((s) => ({ ...s, ...patch }));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (projectId) headers['x-project-id'] = String(projectId);
      const res = await fetch('/api/healing-settings', {
        method: 'PUT',
        headers,
        body: JSON.stringify(settings),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error || `Save failed (${res.status})`);
      }
      const data = await res.json();
      if (data.settings) setSettings({ ...FALLBACK_DEFAULTS, ...data.settings });
      setDirty(false);
      toast.success('Healing settings saved');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save healing settings');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    setSettings({ ...defaults });
    setDirty(true);
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-violet-500/15 flex items-center justify-center">
            <HeartPulse className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Healing Config</h1>
            <p className="text-sm text-slate-400">
              Tune how self-healing balances cheap deterministic fixes against AI, and cap cost.
              {activeProject?.name ? ` Scope: ${activeProject.name}.` : ' Scope: all projects.'}
            </p>
          </div>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1f2e] hover:bg-[#232a3b] border border-[#334155] text-sm text-slate-300 rounded-lg"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Confidence thresholds */}
          <section className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <Gauge className="w-4 h-4 text-violet-400" />
              <h2 className="text-base font-semibold text-white">Confidence Thresholds</h2>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              An engine is only used when its confidence meets or exceeds its threshold. Higher rule/pattern thresholds
              push more healings to AI (more accurate, more costly). Lower thresholds prefer cheaper deterministic fixes.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <ThresholdSlider
                label="Rule engine"
                description="Deterministic, zero-cost fixes."
                value={settings.ruleThreshold}
                onChange={(v) => update({ ruleThreshold: v })}
                accent="text-emerald-400"
              />
              <ThresholdSlider
                label="Pattern engine"
                description="Learned-pattern fixes, low cost."
                value={settings.patternThreshold}
                onChange={(v) => update({ patternThreshold: v })}
                accent="text-sky-400"
              />
              <ThresholdSlider
                label="AI engine"
                description="LLM fixes, highest cost."
                value={settings.aiThreshold}
                onChange={(v) => update({ aiThreshold: v })}
                accent="text-violet-400"
              />
            </div>
          </section>

          {/* AI fallback toggle */}
          <section className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-2">
                <Bot className="w-4 h-4 text-violet-400 mt-0.5" />
                <div>
                  <h2 className="text-base font-semibold text-white">AI Fallback</h2>
                  <p className="text-xs text-slate-500 mt-0.5 max-w-md">
                    When enabled, the AI engine is used if rule and pattern engines cannot confidently heal a failure.
                    Disable to keep healing fully deterministic (no LLM cost).
                  </p>
                </div>
              </div>
              <button
                role="switch"
                aria-checked={settings.aiFallbackEnabled}
                onClick={() => update({ aiFallbackEnabled: !settings.aiFallbackEnabled })}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${settings.aiFallbackEnabled ? 'bg-violet-600' : 'bg-slate-600'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.aiFallbackEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </section>

          {/* Cost limits */}
          <section className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <h2 className="text-base font-semibold text-white">Cost Limits</h2>
            </div>
            <p className="text-xs text-slate-500 mb-4">Hard caps that protect against runaway AI healing spend.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-white mb-1">Max cost per healing ($)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={settings.maxCostPerHealing}
                  onChange={(e) => update({ maxCostPerHealing: Math.max(0, parseFloat(e.target.value) || 0) })}
                  className="w-full bg-[#0c1222] border border-[#334155] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-1">Max daily token budget</label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={settings.maxDailyTokenBudget}
                  onChange={(e) => update({ maxDailyTokenBudget: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                  disabled={!settings.aiFallbackEnabled}
                  className="w-full bg-[#0c1222] border border-[#334155] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
                />
                {!settings.aiFallbackEnabled && (
                  <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                    <Info className="w-3 h-3" /> AI fallback is disabled, so the token budget is not used.
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={resetToDefaults}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#1a1f2e] hover:bg-[#232a3b] border border-[#334155] text-sm text-slate-300 rounded-lg"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset to defaults
            </button>
            <button
              onClick={save}
              disabled={!dirty || saving}
              className="flex items-center gap-2 px-5 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save settings'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
