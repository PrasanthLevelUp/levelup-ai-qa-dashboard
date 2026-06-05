'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import {
  X,
  Plus,
  Trash2,
  Loader2,
  Info,
  Image as ImageIcon,
  Upload,
  Workflow,
  FormInput,
  FileText,
  Save,
  Link2,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface BusinessFlow {
  name: string;
  steps: string; // newline-separated; serialized to string[] on save
}

interface FormFieldEntry {
  name: string;
  selector: string;
  testData: string;
}

interface Screenshot {
  url: string;
  filename?: string;
  originalName?: string;
  size?: number;
  mimeType?: string;
  caption?: string;
  uploadedAt?: string;
}

// The profile object from the list endpoint uses snake_case fields.
export interface EditableProfile {
  id: string;
  base_url: string;
  name?: string | null;
  description?: string | null;
  notes?: string | null;
  business_flows?: any[] | null;
  url_patterns?: any | null;
  form_fields?: any[] | null;
  screenshots?: Screenshot[] | null;
  tags?: string[] | null;
  auth_required?: boolean | null;
  // Sanitized auth summary from the list endpoint (never contains the password).
  auth_config?: {
    loginUrl?: string;
    username?: string;
    hasCredentials?: boolean;
    customSelectors?: Record<string, string>;
  } | null;
}

interface ProfileEditDialogProps {
  open: boolean;
  onClose: (shouldRefresh?: boolean) => void;
  profile: EditableProfile | null; // null => create mode
  projectHeaders: Record<string, string>;
}

type TabKey = 'basic' | 'auth' | 'screenshots' | 'flows' | 'fields';

const TABS: { key: TabKey; label: string; icon: any }[] = [
  { key: 'basic', label: 'Basic Info', icon: Info },
  { key: 'auth', label: 'Authentication', icon: KeyRound },
  { key: 'screenshots', label: 'Screenshots', icon: ImageIcon },
  { key: 'flows', label: 'Business Flows', icon: Workflow },
  { key: 'fields', label: 'Form Fields', icon: FormInput },
];

const BACKEND_ORIGIN =
  process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_API_URL || '';

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function normalizeFlows(raw: any[] | null | undefined): BusinessFlow[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((f) => ({
    name: typeof f?.name === 'string' ? f.name : '',
    steps: Array.isArray(f?.steps)
      ? f.steps.join('\n')
      : typeof f?.steps === 'string'
      ? f.steps
      : '',
  }));
}

function normalizeFields(raw: any[] | null | undefined): FormFieldEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((f) => ({
    name: typeof f?.name === 'string' ? f.name : '',
    selector: typeof f?.selector === 'string' ? f.selector : '',
    testData:
      typeof f?.testData === 'string'
        ? f.testData
        : typeof f?.test_data === 'string'
        ? f.test_data
        : '',
  }));
}

function resolveScreenshotUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  if (BACKEND_ORIGIN) return `${BACKEND_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
  return url;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export function ProfileEditDialog({
  open,
  onClose,
  profile,
  projectHeaders,
}: ProfileEditDialogProps) {
  const isEdit = !!profile;

  const [tab, setTab] = useState<TabKey>('basic');
  const [saving, setSaving] = useState(false);

  // Basic info
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');

  // Authentication (optional — for apps behind a login)
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoginUrl, setAuthLoginUrl] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [hadCredentials, setHadCredentials] = useState(false);

  // Rich data
  const [flows, setFlows] = useState<BusinessFlow[]>([]);
  const [fields, setFields] = useState<FormFieldEntry[]>([]);
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);

  // Screenshot upload
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* -- Populate / reset on open -- */
  useEffect(() => {
    if (!open) return;
    setTab('basic');
    if (profile) {
      setName(profile.name || '');
      setBaseUrl(profile.base_url || '');
      setDescription(profile.description || '');
      setNotes(profile.notes || '');
      setTags(Array.isArray(profile.tags) ? profile.tags.join(', ') : '');
      setFlows(normalizeFlows(profile.business_flows));
      setFields(normalizeFields(profile.form_fields));
      setScreenshots(Array.isArray(profile.screenshots) ? profile.screenshots : []);
      // Auth summary is sanitized — username/loginUrl may be present, password never is.
      setAuthUsername(profile.auth_config?.username || '');
      setAuthLoginUrl(profile.auth_config?.loginUrl || '');
      setAuthPassword('');
      setHadCredentials(!!profile.auth_config?.hasCredentials || !!profile.auth_required);
    } else {
      setName('');
      setBaseUrl('');
      setDescription('');
      setNotes('');
      setTags('');
      setFlows([]);
      setFields([]);
      setScreenshots([]);
      setAuthUsername('');
      setAuthPassword('');
      setAuthLoginUrl('');
      setHadCredentials(false);
    }
    setShowPassword(false);
  }, [open, profile]);

  /* -- Save -- */
  const handleSave = useCallback(async () => {
    if (!baseUrl.trim()) {
      toast.error('Base URL is required');
      setTab('basic');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        baseUrl: baseUrl.trim(),
        name: name.trim() || undefined,
        description: description.trim() || undefined,
        notes: notes.trim() || undefined,
        tags: tags.trim()
          ? tags.split(',').map((t) => t.trim()).filter(Boolean)
          : undefined,
        businessFlows: flows
          .filter((f) => f.name.trim() || f.steps.trim())
          .map((f) => ({
            name: f.name.trim(),
            steps: f.steps
              .split('\n')
              .map((s) => s.trim())
              .filter(Boolean),
          })),
        formFields: fields
          .filter((f) => f.name.trim() || f.selector.trim() || f.testData.trim())
          .map((f) => ({
            name: f.name.trim(),
            selector: f.selector.trim(),
            testData: f.testData.trim(),
          })),
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...projectHeaders,
      };

      const res = await fetch(
        isEdit ? `/api/intelligence/profiles/${profile!.id}` : '/api/intelligence/profiles',
        {
          method: isEdit ? 'PUT' : 'POST',
          headers,
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        toast.error(data.error || `Failed to save profile (${res.status})`);
        return;
      }

      // Resolve the profile id (existing on edit, returned by the API on create).
      const profileId: string | undefined = isEdit
        ? profile!.id
        : data?.data?.id || data?.id;

      // Optionally persist authentication credentials. The auth endpoint requires
      // BOTH username and password, so we only call it when a password is supplied
      // (the password is write-only and never returned from the server).
      const u = authUsername.trim();
      const p = authPassword.trim();
      let authNote = '';
      if (profileId && p) {
        if (!u) {
          toast.error('Username is required to save credentials');
          setTab('auth');
          return;
        }
        try {
          const authRes = await fetch(
            `/api/intelligence/profiles/${profileId}/auth`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify({
                authRequired: true,
                username: u,
                password: p,
                loginUrl: authLoginUrl.trim() || undefined,
              }),
            }
          );
          const authData = await authRes.json().catch(() => ({}));
          if (authRes.ok && authData.success !== false) {
            authNote = ' with credentials';
          } else {
            toast.error(authData.error || `Profile saved, but credentials failed (${authRes.status})`);
          }
        } catch (authErr: any) {
          toast.error(authErr?.message || 'Profile saved, but credentials failed');
        }
      } else if (profileId && u && !p && !hadCredentials) {
        // Username entered but no password and no existing credentials.
        toast.error('Enter a password to save credentials');
        setTab('auth');
        return;
      }

      toast.success((isEdit ? 'Profile updated' : 'Profile created') + authNote);
      onClose(true);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  }, [
    baseUrl, name, description, notes, tags, flows, fields, isEdit, profile,
    projectHeaders, onClose, authUsername, authPassword, authLoginUrl, hadCredentials,
  ]);

  /* -- Screenshot upload -- */
  const handleUpload = useCallback(
    async (file: File) => {
      if (!profile) return;
      if (!file.type.startsWith('image/')) {
        toast.error('Only image files are allowed');
        return;
      }
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append('screenshot', file);
        const res = await fetch(
          `/api/intelligence/profiles/${profile.id}/screenshots`,
          { method: 'POST', headers: { ...projectHeaders }, body: fd }
        );
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success !== false) {
          const updated = data?.data?.profile?.screenshots;
          if (Array.isArray(updated)) {
            setScreenshots(updated);
          } else if (data?.data?.screenshot) {
            setScreenshots((prev) => [...prev, data.data.screenshot]);
          }
          toast.success('Screenshot uploaded');
        } else {
          toast.error(data.error || `Upload failed (${res.status})`);
        }
      } catch (err: any) {
        toast.error(err?.message || 'Upload failed');
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [profile, projectHeaders]
  );

  const handleDeleteScreenshot = useCallback(
    async (index: number) => {
      if (!profile) return;
      try {
        const res = await fetch(
          `/api/intelligence/profiles/${profile.id}/screenshots/${index}`,
          { method: 'DELETE', headers: { ...projectHeaders } }
        );
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success !== false) {
          const updated = data?.data?.profile?.screenshots;
          if (Array.isArray(updated)) {
            setScreenshots(updated);
          } else {
            setScreenshots((prev) => prev.filter((_, i) => i !== index));
          }
          toast.success('Screenshot removed');
        } else {
          toast.error(data.error || `Failed to remove screenshot (${res.status})`);
        }
      } catch (err: any) {
        toast.error(err?.message || 'Failed to remove screenshot');
      }
    },
    [profile, projectHeaders]
  );

  if (!open) return null;

  /* ------------------------------------------------------------------------ */
  /*  Render                                                                  */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a3040] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-500/10 rounded-lg">
              <FileText size={18} className="text-violet-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                {isEdit ? 'Edit Application Profile' : 'Create Application Profile'}
              </h2>
              <p className="text-xs text-slate-400">
                {isEdit
                  ? 'Update business context to improve test generation'
                  : 'Manually define an application profile with business context'}
              </p>
            </div>
          </div>
          <button
            onClick={() => onClose(false)}
            className="p-2 rounded-lg hover:bg-[#2a3040] text-slate-400 hover:text-white transition-colors"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-4 pt-3 border-b border-[#2a3040] flex-shrink-0">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2 ${
                  active
                    ? 'text-violet-300 border-violet-500 bg-violet-500/5'
                    : 'text-slate-400 border-transparent hover:text-white hover:bg-[#2a3040]/50'
                }`}
              >
                <Icon size={14} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* ---- Basic Info ---- */}
          {tab === 'basic' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Profile Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Acme Checkout App"
                  className="w-full px-3 py-2 rounded-lg bg-[#0f172a] border border-[#2a3040] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Base URL <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Link2
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://app.example.com"
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0f172a] border border-[#2a3040] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="What does this application do?"
                  className="w-full px-3 py-2 rounded-lg bg-[#0f172a] border border-[#2a3040] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Any extra context for the QA agent (auth, edge cases, etc.)"
                  className="w-full px-3 py-2 rounded-lg bg-[#0f172a] border border-[#2a3040] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Tags <span className="text-slate-500">(comma separated)</span>
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="checkout, payments, critical"
                  className="w-full px-3 py-2 rounded-lg bg-[#0f172a] border border-[#2a3040] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
            </div>
          )}

          {/* ---- Authentication ---- */}
          {tab === 'auth' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-violet-500/5 border border-violet-500/20 rounded-lg">
                <KeyRound size={16} className="text-violet-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-slate-300">
                  Optional. If your app is behind a login (e.g. SauceDemo), add credentials
                  here so the crawler can sign in and discover pages that require
                  authentication. The password is stored securely and never shown again.
                </p>
              </div>

              {hadCredentials && (
                <div className="flex items-center gap-2 text-xs text-emerald-400">
                  <KeyRound size={13} />
                  Credentials are already saved for this profile. Leave the password
                  blank to keep them, or enter a new password to replace them.
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Username / Email
                </label>
                <input
                  type="text"
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                  placeholder="standard_user"
                  autoComplete="off"
                  className="w-full px-3 py-2 rounded-lg bg-[#0f172a] border border-[#2a3040] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder={hadCredentials ? '•••••••• (unchanged)' : 'secret_sauce'}
                    autoComplete="new-password"
                    className="w-full pl-3 pr-10 py-2 rounded-lg bg-[#0f172a] border border-[#2a3040] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-300 transition-colors"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Login URL <span className="text-slate-500">(optional)</span>
                </label>
                <div className="relative">
                  <Link2
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    type="text"
                    value={authLoginUrl}
                    onChange={(e) => setAuthLoginUrl(e.target.value)}
                    placeholder="https://app.example.com/login"
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0f172a] border border-[#2a3040] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">
                  Leave blank to use the Base URL. The crawler auto-detects the login form;
                  for advanced control over selectors, use the &quot;Configure Auth&quot;
                  button on the profile after saving.
                </p>
              </div>
            </div>
          )}

          {/* ---- Screenshots ---- */}
          {tab === 'screenshots' && (
            <div className="space-y-4">
              {!isEdit ? (
                <div className="flex items-start gap-3 p-4 bg-violet-500/5 border border-violet-500/20 rounded-lg">
                  <Info size={16} className="text-violet-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-slate-300">
                    Save this profile first, then re-open it to upload screenshots.
                  </p>
                </div>
              ) : (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUpload(f);
                    }}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed border-[#2a3040] hover:border-violet-500/50 hover:bg-violet-500/5 transition-colors disabled:opacity-50"
                  >
                    {uploading ? (
                      <Loader2 size={24} className="text-violet-400 animate-spin" />
                    ) : (
                      <Upload size={24} className="text-violet-400" />
                    )}
                    <span className="text-sm text-slate-300">
                      {uploading ? 'Uploading…' : 'Click to upload a screenshot'}
                    </span>
                    <span className="text-xs text-slate-500">PNG, JPG up to 10MB</span>
                  </button>

                  {screenshots.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4">
                      No screenshots uploaded yet.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {screenshots.map((shot, i) => (
                        <div
                          key={`${shot.url}-${i}`}
                          className="relative group rounded-lg overflow-hidden border border-[#2a3040] bg-[#0f172a]"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={resolveScreenshotUrl(shot.url)}
                            alt={shot.originalName || shot.caption || `Screenshot ${i + 1}`}
                            className="w-full h-28 object-cover"
                          />
                          <button
                            onClick={() => handleDeleteScreenshot(i)}
                            className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-black/60 text-slate-300 hover:bg-red-500/80 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove screenshot"
                          >
                            <Trash2 size={13} />
                          </button>
                          {(shot.originalName || shot.caption) && (
                            <div className="px-2 py-1.5 text-[10px] text-slate-400 truncate">
                              {shot.caption || shot.originalName}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ---- Business Flows ---- */}
          {tab === 'flows' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Describe key user journeys. One step per line.
                </p>
                <button
                  onClick={() => setFlows((prev) => [...prev, { name: '', steps: '' }])}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition-colors"
                >
                  <Plus size={13} />
                  Add Flow
                </button>
              </div>
              {flows.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">
                  No business flows defined yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {flows.map((flow, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg border border-[#2a3040] bg-[#0f172a] space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={flow.name}
                          onChange={(e) =>
                            setFlows((prev) =>
                              prev.map((f, idx) =>
                                idx === i ? { ...f, name: e.target.value } : f
                              )
                            )
                          }
                          placeholder="Flow name (e.g. User Login)"
                          className="flex-1 px-3 py-2 rounded-lg bg-[#1a1f2e] border border-[#2a3040] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                        />
                        <button
                          onClick={() =>
                            setFlows((prev) => prev.filter((_, idx) => idx !== i))
                          }
                          className="p-2 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
                          title="Remove flow"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <textarea
                        value={flow.steps}
                        onChange={(e) =>
                          setFlows((prev) =>
                            prev.map((f, idx) =>
                              idx === i ? { ...f, steps: e.target.value } : f
                            )
                          )
                        }
                        rows={3}
                        placeholder={'Navigate to login page\nEnter credentials\nClick submit'}
                        className="w-full px-3 py-2 rounded-lg bg-[#1a1f2e] border border-[#2a3040] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors resize-none font-mono text-xs"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ---- Form Fields ---- */}
          {tab === 'fields' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Map important form fields and the test data to use.
                </p>
                <button
                  onClick={() =>
                    setFields((prev) => [...prev, { name: '', selector: '', testData: '' }])
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition-colors"
                >
                  <Plus size={13} />
                  Add Field
                </button>
              </div>
              {fields.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">
                  No form fields defined yet.
                </p>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 px-1">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">
                      Field Name
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">
                      Selector
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">
                      Test Data
                    </span>
                    <span />
                  </div>
                  {fields.map((field, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                      <input
                        type="text"
                        value={field.name}
                        onChange={(e) =>
                          setFields((prev) =>
                            prev.map((f, idx) =>
                              idx === i ? { ...f, name: e.target.value } : f
                            )
                          )
                        }
                        placeholder="email"
                        className="px-3 py-2 rounded-lg bg-[#0f172a] border border-[#2a3040] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                      />
                      <input
                        type="text"
                        value={field.selector}
                        onChange={(e) =>
                          setFields((prev) =>
                            prev.map((f, idx) =>
                              idx === i ? { ...f, selector: e.target.value } : f
                            )
                          )
                        }
                        placeholder="#email-input"
                        className="px-3 py-2 rounded-lg bg-[#0f172a] border border-[#2a3040] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors font-mono text-xs"
                      />
                      <input
                        type="text"
                        value={field.testData}
                        onChange={(e) =>
                          setFields((prev) =>
                            prev.map((f, idx) =>
                              idx === i ? { ...f, testData: e.target.value } : f
                            )
                          )
                        }
                        placeholder="test@example.com"
                        className="px-3 py-2 rounded-lg bg-[#0f172a] border border-[#2a3040] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                      />
                      <button
                        onClick={() =>
                          setFields((prev) => prev.filter((_, idx) => idx !== i))
                        }
                        className="p-2 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
                        title="Remove field"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[#2a3040] flex-shrink-0">
          <button
            onClick={() => onClose(false)}
            className="px-4 py-2 rounded-lg bg-[#1e293b] border border-[#334155] text-slate-300 hover:text-white hover:bg-[#334155] transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {isEdit ? 'Save Changes' : 'Create Profile'}
          </button>
        </div>
      </div>
    </div>
  );
}
