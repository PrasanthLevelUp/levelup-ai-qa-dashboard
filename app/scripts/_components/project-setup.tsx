'use client';

import { useState } from 'react';
import {
  Globe,
  Code2,
  Shield,
  MousePointerClick,
  Map,
  FileText,
  Lock,
  Save,
  Loader2,
  Sparkles,
  Info,
} from 'lucide-react';
import type { ProjectContext } from './scripts-client';

interface ProjectSetupProps {
  existing?: ProjectContext | null;
  onSaved: (ctx: ProjectContext) => void;
  onCancel?: () => void;
}

export function ProjectSetup({ existing, onSaved, onCancel }: ProjectSetupProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(existing?.name || '');
  const [appUrl, setAppUrl] = useState(existing?.appUrl || '');
  const [framework, setFramework] = useState(existing?.framework || '');
  const [authMethod, setAuthMethod] = useState(existing?.authMethod || '');
  const [selectorStrategy, setSelectorStrategy] = useState(existing?.selectorStrategy || '');
  const [appDescription, setAppDescription] = useState(existing?.appDescription || '');
  const [navigationFlow, setNavigationFlow] = useState(existing?.navigationFlow || '');
  const [customRules, setCustomRules] = useState(existing?.customRules || '');
  const [credUsername, setCredUsername] = useState('');
  const [credPassword, setCredPassword] = useState('');

  // Parse existing credentials
  useState(() => {
    if (existing?.credentials) {
      try {
        const creds = JSON.parse(existing.credentials);
        if (creds.username) setCredUsername(creds.username);
        if (creds.password) setCredPassword(creds.password);
      } catch { /* ignore */ }
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !appUrl.trim()) {
      setError('Project name and App URL are required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const credentials =
        credUsername || credPassword
          ? JSON.stringify({ username: credUsername, password: credPassword })
          : null;

      const res = await fetch('/api/project-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: existing?.id,
          name: name.trim(),
          appUrl: appUrl.trim(),
          framework: framework.trim() || null,
          authMethod: authMethod.trim() || null,
          selectorStrategy: selectorStrategy.trim() || null,
          appDescription: appDescription.trim() || null,
          navigationFlow: navigationFlow.trim() || null,
          customRules: customRules.trim() || null,
          credentials,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Failed to save');
        return;
      }

      onSaved(data.data);
    } catch (err) {
      setError('Network error — please try again');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Intro tip */}
      <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-4 flex items-start gap-3">
        <Sparkles size={18} className="text-violet-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm text-violet-300 font-medium">Why does this matter?</p>
          <p className="text-xs text-violet-300/70 mt-1 leading-relaxed">
            This context is sent to the AI engine every time you generate scripts. It ensures
            consistent selectors, correct auth flows, and framework-aware assertions — so generated
            scripts work with your app out of the box.
          </p>
        </div>
      </div>

      {/* Required Fields */}
      <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Globe size={14} className="text-violet-400" />
          Basic Information
          <span className="text-[10px] text-red-400 ml-1">REQUIRED</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Project Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. OrangeHRM, MyShop, Admin Portal"
              className="w-full px-3 py-2.5 rounded-lg bg-[#0c1222] border border-[#334155] text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Application URL</label>
            <input
              type="url"
              value={appUrl}
              onChange={(e) => setAppUrl(e.target.value)}
              placeholder="https://your-app.com"
              className="w-full px-3 py-2.5 rounded-lg bg-[#0c1222] border border-[#334155] text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Application Description</label>
          <textarea
            value={appDescription}
            onChange={(e) => setAppDescription(e.target.value)}
            placeholder="e.g. HR management system with employee directory, leave management, recruitment, and performance modules. Built as a single-page application."
            rows={3}
            className="w-full px-3 py-2.5 rounded-lg bg-[#0c1222] border border-[#334155] text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 resize-none"
          />
        </div>
      </div>

      {/* Technical Details */}
      <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Code2 size={14} className="text-blue-400" />
          Technical Details
          <span className="text-[10px] text-slate-500 ml-1">OPTIONAL</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 flex items-center gap-1">
              <Code2 size={10} />
              Framework / Tech Stack
            </label>
            <input
              type="text"
              value={framework}
              onChange={(e) => setFramework(e.target.value)}
              placeholder="e.g. React, Angular, Vue, PHP/Laravel"
              className="w-full px-3 py-2.5 rounded-lg bg-[#0c1222] border border-[#334155] text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 flex items-center gap-1">
              <Shield size={10} />
              Authentication Method
            </label>
            <input
              type="text"
              value={authMethod}
              onChange={(e) => setAuthMethod(e.target.value)}
              placeholder="e.g. Cookie-based login, JWT, OAuth/SSO"
              className="w-full px-3 py-2.5 rounded-lg bg-[#0c1222] border border-[#334155] text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1.5 flex items-center gap-1">
            <MousePointerClick size={10} />
            Selector Strategy / Conventions
          </label>
          <input
            type="text"
            value={selectorStrategy}
            onChange={(e) => setSelectorStrategy(e.target.value)}
            placeholder="e.g. Uses data-testid attributes, BEM class naming, role-based selectors"
            className="w-full px-3 py-2.5 rounded-lg bg-[#0c1222] border border-[#334155] text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500"
          />
          <p className="text-[10px] text-slate-600 mt-1 flex items-center gap-1">
            <Info size={9} />
            The engine will prioritize these selectors for reliable, maintenance-free scripts
          </p>
        </div>
      </div>

      {/* Application Flow */}
      <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Map size={14} className="text-emerald-400" />
          Application Flow
          <span className="text-[10px] text-slate-500 ml-1">OPTIONAL</span>
        </h3>

        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Navigation Flow / Key Pages</label>
          <textarea
            value={navigationFlow}
            onChange={(e) => setNavigationFlow(e.target.value)}
            placeholder={`Describe your app's key user flows, e.g.:\n\n1. Login \u2192 Dashboard \u2192 Employee Directory\n2. Login \u2192 Leave Management \u2192 Apply Leave \u2192 Approval\n3. Admin \u2192 Settings \u2192 User Management`}
            rows={4}
            className="w-full px-3 py-2.5 rounded-lg bg-[#0c1222] border border-[#334155] text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1.5 flex items-center gap-1">
            <FileText size={10} />
            Custom Rules / Notes
          </label>
          <textarea
            value={customRules}
            onChange={(e) => setCustomRules(e.target.value)}
            placeholder={`Any specific rules for test generation, e.g.:\n\n- Always verify toast notifications after form submissions\n- Dashboard loads data via API, wait for network idle\n- Logout clears localStorage session token`}
            rows={3}
            className="w-full px-3 py-2.5 rounded-lg bg-[#0c1222] border border-[#334155] text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 resize-none"
          />
        </div>
      </div>

      {/* Test Credentials */}
      <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Lock size={14} className="text-amber-400" />
          Test Credentials
          <span className="text-[10px] text-slate-500 ml-1">OPTIONAL</span>
        </h3>
        <p className="text-xs text-slate-500">
          Used for generating login-flow tests. Stored securely — never sent to third parties.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Username / Email</label>
            <input
              type="text"
              value={credUsername}
              onChange={(e) => setCredUsername(e.target.value)}
              placeholder="test-user@example.com"
              className="w-full px-3 py-2.5 rounded-lg bg-[#0c1222] border border-[#334155] text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Password</label>
            <input
              type="password"
              value={credPassword}
              onChange={(e) => setCredPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2.5 rounded-lg bg-[#0c1222] border border-[#334155] text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500"
              autoComplete="new-password"
            />
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-lg text-sm text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-all shadow-lg shadow-violet-500/20"
        >
          {saving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Save size={14} />
          )}
          {saving ? 'Saving...' : existing ? 'Update Project' : 'Save & Continue'}
        </button>
      </div>
    </form>
  );
}
