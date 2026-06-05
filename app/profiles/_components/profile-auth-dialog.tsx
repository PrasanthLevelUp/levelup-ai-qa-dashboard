'use client';

import { useState, useEffect } from 'react';
import { Shield, X, Loader2, Lock, User, Link2, ChevronDown, ChevronUp, Info } from 'lucide-react';

export interface AuthDialogProfile {
  id: string;
  base_url: string;
  auth_required?: boolean;
  /** Sanitized auth summary returned by the backend (never includes password). */
  auth_config?: {
    loginUrl?: string;
    hasCredentials?: boolean;
    username?: string;
    customSelectors?: {
      usernameField?: string;
      passwordField?: string;
      submitButton?: string;
    };
  } | null;
}

interface Props {
  open: boolean;
  profile: AuthDialogProfile | null;
  projectHeaders: Record<string, string>;
  onClose: (shouldRefresh: boolean) => void;
}

/**
 * "Configure Auth" modal — lets the user store login credentials for a profile
 * so the crawler can authenticate before exploring protected pages.
 *
 * The password is write-only: the backend never returns it, so the field is
 * left blank on open (a placeholder indicates credentials already exist).
 */
export function ProfileAuthDialog({ open, profile, projectHeaders, onClose }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginUrl, setLoginUrl] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [usernameSelector, setUsernameSelector] = useState('');
  const [passwordSelector, setPasswordSelector] = useState('');
  const [submitSelector, setSubmitSelector] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const hasExistingCreds = !!profile?.auth_config?.hasCredentials;

  useEffect(() => {
    if (open && profile) {
      setUsername(profile.auth_config?.username || '');
      setPassword('');
      setLoginUrl(profile.auth_config?.loginUrl || '');
      setUsernameSelector(profile.auth_config?.customSelectors?.usernameField || '');
      setPasswordSelector(profile.auth_config?.customSelectors?.passwordField || '');
      setSubmitSelector(profile.auth_config?.customSelectors?.submitButton || '');
      setShowAdvanced(
        !!(profile.auth_config?.customSelectors?.usernameField ||
          profile.auth_config?.customSelectors?.passwordField ||
          profile.auth_config?.customSelectors?.submitButton),
      );
      setError('');
    }
  }, [open, profile]);

  if (!open || !profile) return null;

  const handleSave = async () => {
    if (!username.trim()) { setError('Username is required.'); return; }
    // Allow keeping the existing password: if creds already exist and the field
    // is left blank, the user must re-enter it (passwords are write-only).
    if (!password.trim()) {
      setError(hasExistingCreds
        ? 'Re-enter the password to update credentials (it is not stored in the browser).'
        : 'Password is required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/intelligence/profiles/${profile.id}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...projectHeaders },
        body: JSON.stringify({
          authRequired: true,
          username: username.trim(),
          password: password,
          loginUrl: loginUrl.trim() || undefined,
          usernameSelector: usernameSelector.trim() || undefined,
          passwordSelector: passwordSelector.trim() || undefined,
          submitSelector: submitSelector.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to save auth config');
      onClose(true);
    } catch (e: any) {
      setError(e.message || 'Failed to save auth config');
    }
    setSaving(false);
  };

  const handleClearAuth = async () => {
    if (!confirm('Remove stored credentials for this profile?')) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/intelligence/profiles/${profile.id}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...projectHeaders },
        body: JSON.stringify({ authRequired: false }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to clear auth config');
      onClose(true);
    } catch (e: any) {
      setError(e.message || 'Failed to clear auth config');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a3040]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Shield size={18} className="text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Configure Authentication</h2>
              <p className="text-xs text-slate-500 truncate max-w-xs">{profile.base_url}</p>
            </div>
          </div>
          <button
            onClick={() => onClose(false)}
            className="p-1.5 rounded-lg hover:bg-[#2a3040] text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-start gap-2.5 p-3 bg-amber-500/5 border border-amber-500/15 rounded-lg">
            <Info size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-300/80 leading-relaxed">
              Credentials are stored securely on the server and used only so the crawler can log in
              before exploring protected pages. They are never returned to the browser.
            </p>
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Username / Email</label>
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="standard_user"
                autoComplete="off"
                className="w-full pl-9 pr-3 py-2.5 bg-[#0f172a] border border-[#334155] rounded-lg text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 transition-colors"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={hasExistingCreds ? '•••••••• (re-enter to update)' : 'secret_sauce'}
                autoComplete="new-password"
                className="w-full pl-9 pr-3 py-2.5 bg-[#0f172a] border border-[#334155] rounded-lg text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 transition-colors"
              />
            </div>
          </div>

          {/* Login URL */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Login URL <span className="text-slate-600 font-normal">(optional — if different from base URL)</span>
            </label>
            <div className="relative">
              <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="url"
                value={loginUrl}
                onChange={e => setLoginUrl(e.target.value)}
                placeholder={profile.base_url}
                className="w-full pl-9 pr-3 py-2.5 bg-[#0f172a] border border-[#334155] rounded-lg text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 transition-colors"
              />
            </div>
          </div>

          {/* Advanced: custom selectors */}
          <button
            onClick={() => setShowAdvanced(s => !s)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            Advanced — custom field selectors
          </button>
          {showAdvanced && (
            <div className="space-y-3 pl-1 border-l-2 border-[#2a3040] ml-1">
              <p className="text-[11px] text-slate-500 pl-3">
                Only needed if the login form can&apos;t be auto-detected. CSS selectors, e.g. <code>#user-name</code>.
              </p>
              {[
                { label: 'Username field selector', val: usernameSelector, set: setUsernameSelector, ph: '#user-name' },
                { label: 'Password field selector', val: passwordSelector, set: setPasswordSelector, ph: '#password' },
                { label: 'Submit button selector', val: submitSelector, set: setSubmitSelector, ph: '#login-button' },
              ].map(f => (
                <div key={f.label} className="pl-3">
                  <label className="block text-xs text-slate-400 mb-1">{f.label}</label>
                  <input
                    type="text"
                    value={f.val}
                    onChange={e => f.set(e.target.value)}
                    placeholder={f.ph}
                    className="w-full px-3 py-2 bg-[#0f172a] border border-[#334155] rounded-lg text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 transition-colors"
                  />
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            {hasExistingCreds ? (
              <button
                onClick={handleClearAuth}
                disabled={saving}
                className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
              >
                Remove credentials
              </button>
            ) : <span />}
            <div className="flex gap-2">
              <button
                onClick={() => onClose(false)}
                className="px-4 py-2 rounded-lg bg-[#0f172a] border border-[#334155] text-slate-300 hover:text-white text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
              >
                {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : <><Shield size={14} /> Save Auth</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
