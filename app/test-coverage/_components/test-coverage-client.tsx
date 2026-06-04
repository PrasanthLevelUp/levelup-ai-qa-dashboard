'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileText, Sparkles, BarChart3, ChevronDown, ChevronRight,
  CheckCircle2, AlertTriangle, Shield, Zap, Clock, Tag, Trash2,
  Plus, Loader2, RefreshCw, ClipboardList, Lightbulb, Target,
  ArrowRight, CheckSquare, XCircle, Eye, ChevronUp, TestTubeDiagonal,
  GitBranch, Github, ExternalLink, Code2, Rocket, BookOpen,
  Brain, Cpu, Info, HelpCircle, LayoutTemplate, Copy,
  Download, Filter, Search, Check, X,
} from 'lucide-react';
import { useProject } from '@/lib/project-context';
import { KnowledgeSelector } from '@/components/knowledge-selector';
import { toast } from 'sonner';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type CoverageType =
  | 'positive' | 'negative' | 'edge_cases' | 'boundary'
  | 'security' | 'api' | 'ui' | 'mobile' | 'accessibility'
  | 'performance' | 'integration' | 'regression'
  | 'cross_browser' | 'data_validation' | 'role_based' | 'localization';

interface CoverageOption {
  value: CoverageType;
  label: string;
  icon: string;
  description: string;
}

const COVERAGE_OPTIONS: CoverageOption[] = [
  { value: 'positive', label: 'Positive', icon: '✅', description: 'Happy path scenarios' },
  { value: 'negative', label: 'Negative', icon: '❌', description: 'Error & failure paths' },
  { value: 'edge_cases', label: 'Edge Cases', icon: '🔍', description: 'Boundary & corner cases' },
  { value: 'boundary', label: 'Boundary', icon: '📏', description: 'Input limits & ranges' },
  { value: 'security', label: 'Security', icon: '🔒', description: 'Auth, injection, XSS' },
  { value: 'api', label: 'API', icon: '🔌', description: 'Endpoint & contract testing' },
  { value: 'ui', label: 'UI', icon: '🖥️', description: 'Visual & interaction testing' },
  { value: 'mobile', label: 'Mobile', icon: '📱', description: 'Responsive & touch' },
  { value: 'accessibility', label: 'Accessibility', icon: '♿', description: 'WCAG compliance' },
  { value: 'performance', label: 'Performance', icon: '⚡', description: 'Load & stress testing' },
  { value: 'integration', label: 'Integration', icon: '🔗', description: 'Cross-system flows' },
  { value: 'regression', label: 'Regression', icon: '🔄', description: 'Existing feature impact' },
  { value: 'cross_browser', label: 'Cross Browser', icon: '🌐', description: 'Browser compatibility' },
  { value: 'data_validation', label: 'Data Validation', icon: '📊', description: 'Input & output data' },
  { value: 'role_based', label: 'Role-based', icon: '👥', description: 'Permission & access' },
  { value: 'localization', label: 'Localization', icon: '🌍', description: 'i18n & l10n testing' },
];

const PRIORITY_COLORS: Record<string, string> = {
  P0: 'bg-red-500/20 text-red-400 border-red-500/30',
  P1: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  P2: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  P3: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400',
  major: 'bg-orange-500/20 text-orange-400',
  minor: 'bg-blue-500/20 text-blue-400',
  trivial: 'bg-slate-500/20 text-slate-400',
  high: 'bg-red-500/20 text-red-400',
  medium: 'bg-amber-500/20 text-amber-400',
  low: 'bg-green-500/20 text-green-400',
};

const RISK_COLORS: Record<string, string> = {
  critical: 'text-red-400',
  high: 'text-orange-400',
  medium: 'text-amber-400',
  low: 'text-green-400',
};

/* ------------------------------------------------------------------ */
/*  Templates                                                          */
/* ------------------------------------------------------------------ */

interface Template {
  id: string;
  name: string;
  icon: string;
  title: string;
  description: string;
  module: string;
  businessFlow: string;
  acceptanceCriteria: string;
  coverageTypes: CoverageType[];
}

const TEMPLATES: Template[] = [
  {
    id: 'login',
    name: 'Login Flow',
    icon: '🔐',
    title: 'User Login with Email and Password',
    description: 'Users should be able to log in to the application using their registered email address and password. The system should validate credentials, handle invalid inputs, manage session tokens, and redirect to the dashboard upon success.',
    module: 'Authentication',
    businessFlow: 'User opens login page → enters email → enters password → clicks Sign In → system validates → session created → redirect to dashboard',
    acceptanceCriteria: '- Valid credentials should log the user in successfully\n- Invalid credentials should show a clear error message\n- Account should lock after 5 failed attempts\n- "Remember me" option should persist session for 30 days\n- Session should expire after 30 minutes of inactivity',
    coverageTypes: ['positive', 'negative', 'security', 'edge_cases'],
  },
  {
    id: 'crud',
    name: 'CRUD Operations',
    icon: '📝',
    title: 'Create, Read, Update, Delete Resource',
    description: 'Users should be able to create new items, view a list and detail view of items, edit existing items, and delete items with confirmation. All operations should validate inputs and handle errors gracefully.',
    module: 'Resource Management',
    businessFlow: 'User clicks "Add New" → fills form → saves → item appears in list → clicks item → views details → clicks edit → modifies → saves → clicks delete → confirms → item removed',
    acceptanceCriteria: '- Create should validate all required fields before saving\n- List should paginate with 20 items per page\n- Edit should pre-fill all existing values\n- Delete should require confirmation dialog\n- Success/error toast notifications for all actions',
    coverageTypes: ['positive', 'negative', 'edge_cases', 'data_validation'],
  },
  {
    id: 'checkout',
    name: 'Checkout Flow',
    icon: '🛒',
    title: 'E-commerce Checkout Process',
    description: 'Users should be able to review their cart, enter shipping details, select payment method, apply discount codes, and complete the purchase. The system should validate addresses, process payments, and send confirmation.',
    module: 'Checkout',
    businessFlow: 'User views cart → proceeds to checkout → enters shipping address → selects shipping method → enters payment info → reviews order → places order → receives confirmation',
    acceptanceCriteria: '- Cart total should update in real-time\n- Discount codes should be validated instantly\n- Address validation should catch invalid formats\n- Payment processing should handle timeouts\n- Order confirmation email within 2 minutes',
    coverageTypes: ['positive', 'negative', 'edge_cases', 'integration', 'security'],
  },
  {
    id: 'search',
    name: 'Search & Filter',
    icon: '🔍',
    title: 'Search Functionality with Filters',
    description: 'Users should be able to search for items using keywords, apply multiple filters (category, date range, status), sort results, and navigate through paginated results. The search should be fast and return relevant results.',
    module: 'Search',
    businessFlow: 'User enters search query → results load → applies category filter → applies date filter → sorts by relevance → navigates pages → clicks result → views detail',
    acceptanceCriteria: '- Search should return results within 500ms\n- Empty search should show all items\n- Filters should be combinable\n- Results count should be displayed\n- Search query should be highlighted in results',
    coverageTypes: ['positive', 'negative', 'edge_cases', 'performance', 'ui'],
  },
  {
    id: 'registration',
    name: 'User Registration',
    icon: '👤',
    title: 'New User Registration Flow',
    description: 'New users should be able to create an account by providing their name, email, password, and agreeing to terms. The system should validate inputs, check for duplicate emails, send verification, and activate the account.',
    module: 'Authentication',
    businessFlow: 'User clicks "Sign Up" → enters name → enters email → creates password → confirms password → accepts terms → clicks Register → receives verification email → clicks link → account activated',
    acceptanceCriteria: '- Password must be at least 8 characters with uppercase, lowercase, and number\n- Email must be unique — show error for duplicates\n- Verification email sent within 30 seconds\n- Verification link expires in 24 hours\n- Terms and conditions must be accepted',
    coverageTypes: ['positive', 'negative', 'security', 'edge_cases', 'data_validation'],
  },
  {
    id: 'file-upload',
    name: 'File Upload',
    icon: '📎',
    title: 'File Upload with Validation',
    description: 'Users should be able to upload files with drag-and-drop or file picker. The system should validate file types, enforce size limits, show upload progress, and handle multiple files.',
    module: 'File Management',
    businessFlow: 'User drags file to upload zone (or clicks to browse) → file validates → progress bar shows → upload completes → file appears in list → user can preview/download',
    acceptanceCriteria: '- Supported formats: JPG, PNG, PDF, DOCX (max 10MB)\n- Show clear error for unsupported file types\n- Progress bar during upload\n- Multiple file upload (up to 5 at once)\n- Cancel upload mid-way should clean up',
    coverageTypes: ['positive', 'negative', 'edge_cases', 'ui'],
  },
];

/* ------------------------------------------------------------------ */
/*  Tooltip / Help Component                                           */
/* ------------------------------------------------------------------ */

function FieldHelp({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        className="p-0.5 text-slate-500 hover:text-violet-400 transition-colors"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-56 bg-slate-800 border border-slate-600 rounded-lg p-2.5 shadow-xl">
          <p className="text-xs text-slate-300 leading-relaxed">{text}</p>
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 border-r border-b border-slate-600 rotate-45 -mt-1" />
        </div>
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function TestCoverageClient() {
  const [activeTab, setActiveTab] = useState<'generate' | 'history' | 'stats'>('generate');
  const tabs = [
    { key: 'generate' as const, label: 'Generate Test Cases', icon: Sparkles },
    { key: 'history' as const, label: 'History', icon: ClipboardList },
    { key: 'stats' as const, label: 'Statistics', icon: BarChart3 },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <TestTubeDiagonal className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Test Case Lab</h1>
            <p className="text-sm text-slate-400">Generate comprehensive manual test cases with intelligent coverage analysis</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-slate-800/50 rounded-xl p-1 mb-6 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === t.key
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'generate' && <GenerateTab onViewHistory={() => setActiveTab('history')} />}
      {activeTab === 'history' && <HistoryTab />}
      {activeTab === 'stats' && <StatsTab />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Generate Tab — Complete Overhaul                                    */
/* ------------------------------------------------------------------ */

function GenerateTab({ onViewHistory }: { onViewHistory: () => void }) {
  const { activeProject } = useProject();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [jiraId, setJiraId] = useState('');
  const [businessFlow, setBusinessFlow] = useState('');
  const [acceptanceCriteria, setAcceptanceCriteria] = useState('');
  const [module, setModule] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<CoverageType[]>(['positive', 'negative', 'edge_cases']);

  // Intelligence sources
  const [selectedKnowledgeIds, setSelectedKnowledgeIds] = useState<number[]>([]);
  const [useRepoIntelligence, setUseRepoIntelligence] = useState(false);
  const [selectedRepoId, setSelectedRepoId] = useState('');
  const [includeCoverageGaps, setIncludeCoverageGaps] = useState(true);
  const [repos, setRepos] = useState<any[]>([]);
  const [repoContexts, setRepoContexts] = useState<any[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);

  // RTM: optional link to an existing requirement (generated test cases get linked)
  const [requirements, setRequirements] = useState<any[]>([]);
  const [selectedRequirementId, setSelectedRequirementId] = useState('');
  const [requirementSearch, setRequirementSearch] = useState('');
  const [showRequirementDropdown, setShowRequirementDropdown] = useState(false);

  // UI state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showCoverageTypes, setShowCoverageTypes] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  // Banner shown when the form was pre-filled from a linked requirement
  const [prefilledFrom, setPrefilledFrom] = useState<{ id: string; label: string } | null>(null);

  // Validation hints
  const titleValid = title.trim().length >= 5;
  const descriptionValid = description.trim().length >= 20;
  const canGenerate = titleValid && descriptionValid && selectedTypes.length > 0;

  // Clear repo state when project changes
  useEffect(() => {
    setSelectedRepoId('');
    setUseRepoIntelligence(false);
    setRepos([]);
    setRepoContexts([]);
  }, [activeProject?.id]);

  // Fetch repos for repo intelligence (filtered by active project)
  useEffect(() => {
    if (!activeProject?.id) return;
    (async () => {
      setLoadingRepos(true);
      try {
        const projectHeaders: Record<string, string> = { 'x-project-id': String(activeProject.id) };
        const [repoRes, contextRes] = await Promise.all([
          fetch(`/api/projects/${activeProject.id}/repositories`),
          fetch('/api/repo-intelligence/list', { headers: projectHeaders }),
        ]);
        if (repoRes.ok) {
          const data = await repoRes.json();
          setRepos(Array.isArray(data) ? data : data.repositories || []);
        }
        if (contextRes.ok) {
          const data = await contextRes.json();
          setRepoContexts(Array.isArray(data) ? data : data.contexts || []);
        }
      } catch { /* ignore */ }
      setLoadingRepos(false);
    })();
  }, [activeProject?.id]);

  // Repos with intelligence data
  const scannedRepoIds = useMemo(
    () => new Set(repoContexts.map((c: any) => c.repoId || c.repo_id)),
    [repoContexts]
  );

  // RTM: fetch requirements for the link selector (project-scoped)
  useEffect(() => {
    setSelectedRequirementId('');
    (async () => {
      try {
        const headers: Record<string, string> = {};
        if (activeProject?.id) headers['x-project-id'] = String(activeProject.id);
        const res = await fetch('/api/requirements', { headers });
        const data = await res.json();
        if (data?.success) setRequirements(data.data || []);
        else setRequirements([]);
      } catch {
        setRequirements([]);
      }
    })();
  }, [activeProject?.id]);

  // RTM: support deep-linking from the Requirements page
  // (/test-coverage?requirementId=<uuid>&reqTitle=<title>) — pre-selects the
  // requirement and pre-fills ALL relevant fields so the user can review and
  // generate immediately. The full requirement is stashed in sessionStorage by
  // the Requirements page (handles long description / acceptance criteria text);
  // we fall back to the URL query params if it is unavailable.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const reqId = params.get('requirementId');
    const reqTitle = params.get('reqTitle');

    // Try the richer sessionStorage payload first
    let prefill: any = null;
    try {
      const raw = sessionStorage.getItem('tcl:prefillRequirement');
      if (raw) {
        const parsed = JSON.parse(raw);
        // Only use it if it matches the requirement we deep-linked to (or no id in URL)
        if (!reqId || String(parsed.id) === String(reqId)) prefill = parsed;
        sessionStorage.removeItem('tcl:prefillRequirement');
      }
    } catch {
      /* ignore malformed payload */
    }

    if (reqId) setSelectedRequirementId(reqId);

    if (prefill) {
      if (prefill.title) setTitle((prev) => prev || prefill.title);
      if (prefill.description) setDescription((prev) => prev || prefill.description);
      if (prefill.acceptance_criteria) setAcceptanceCriteria((prev) => prev || prefill.acceptance_criteria);
      if (prefill.category) setModule((prev) => prev || prefill.category);
      if (prefill.requirement_id) setJiraId((prev) => prev || prefill.requirement_id);
      setPrefilledFrom({ id: String(prefill.id), label: prefill.requirement_id || prefill.title || 'requirement' });
    } else if (reqTitle) {
      setTitle((prev) => prev || reqTitle);
      setPrefilledFrom({ id: reqId || '', label: reqTitle });
    }
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredRequirements = useMemo(
    () =>
      requirements.filter(
        (r: any) =>
          (r.title || '').toLowerCase().includes(requirementSearch.toLowerCase()) ||
          (r.requirement_id || '').toLowerCase().includes(requirementSearch.toLowerCase())
      ),
    [requirements, requirementSearch]
  );
  const selectedRequirement = requirements.find((r: any) => r.id === selectedRequirementId);

  const toggleType = (t: CoverageType) => {
    setSelectedTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const applyTemplate = (templateId: string) => {
    const tmpl = TEMPLATES.find(t => t.id === templateId);
    if (!tmpl) return;
    setTitle(tmpl.title);
    setDescription(tmpl.description);
    setModule(tmpl.module);
    setBusinessFlow(tmpl.businessFlow);
    setAcceptanceCriteria(tmpl.acceptanceCriteria);
    setSelectedTypes(tmpl.coverageTypes);
    setSelectedTemplate(templateId);
  };

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (activeProject?.id) headers['x-project-id'] = String(activeProject.id);

      const res = await fetch('/api/test-coverage/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          jiraId: jiraId.trim() || undefined,
          businessFlow: businessFlow.trim() || undefined,
          acceptanceCriteria: acceptanceCriteria.trim() || undefined,
          module: module.trim() || undefined,
          coverageTypes: selectedTypes,
          knowledgeItemIds: selectedKnowledgeIds.length > 0 ? selectedKnowledgeIds : undefined,
          useRepoIntelligence: useRepoIntelligence && selectedRepoId ? true : undefined,
          repoId: useRepoIntelligence && selectedRepoId ? parseInt(selectedRepoId, 10) : undefined,
          includeCoverageGaps,
          requirementId: selectedRequirementId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.details || data?.error || `Server returned ${res.status}`);
        setResult(null);
      } else if (data?.error && !data?.requirementAnalysis) {
        setError(data.error);
        setResult(null);
      } else {
        setResult(data);
      }
    } catch (err: any) {
      console.error('Generation failed:', err);
      setError(err?.message || 'Network error — could not reach backend');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setTitle('');
    setDescription('');
    setJiraId('');
    setBusinessFlow('');
    setAcceptanceCriteria('');
    setModule('');
    setSelectedTypes(['positive', 'negative', 'edge_cases']);
    setSelectedKnowledgeIds([]);
    setUseRepoIntelligence(false);
    setSelectedRepoId('');
    setSelectedTemplate(null);
    setSelectedRequirementId('');
    setPrefilledFrom(null);
  };

  // Show results if we have them
  if (result) {
    return <ResultsDisplay result={result} onReset={handleReset} onViewHistory={onViewHistory} />;
  }

  // Show loading state
  if (loading) {
    return (
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-12 text-center">
        <div className="relative mx-auto w-16 h-16 mb-4">
          <div className="absolute inset-0 rounded-full border-2 border-violet-500/20" />
          <div className="absolute inset-0 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
          <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-violet-400" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Generating Test Cases</h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          AI is analyzing your requirement, creating manual test scenarios, and identifying coverage gaps...
        </p>
        <div className="flex items-center justify-center gap-6 mt-6 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><Brain className="w-3.5 h-3.5 text-violet-400" /> Analyzing requirement</span>
          <span className="flex items-center gap-1.5"><Target className="w-3.5 h-3.5 text-blue-400" /> Creating scenarios</span>
          <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-emerald-400" /> Finding gaps</span>
        </div>
        {selectedKnowledgeIds.length > 0 && (
          <p className="text-xs text-violet-400 mt-3 flex items-center justify-center gap-1">
            <BookOpen className="w-3 h-3" /> Using {selectedKnowledgeIds.length} knowledge item{selectedKnowledgeIds.length !== 1 ? 's' : ''} for context
          </p>
        )}
        <p className="text-xs text-slate-600 mt-4">This may take 15-30 seconds...</p>
      </div>
    );
  }

  // Show error state
  if (error && !result) {
    return (
      <div className="bg-slate-800/50 rounded-xl border border-red-500/30 p-8 text-center">
        <XCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-white mb-2">Generation Failed</h3>
        <p className="text-sm text-slate-400 mb-2">Could not generate test cases. Please try again.</p>
        <p className="text-xs text-red-400/80 bg-red-500/10 rounded-lg px-3 py-2 mb-4 max-w-lg mx-auto">{error}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => setError(null)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm">
            Edit & Retry
          </button>
          <button onClick={handleReset} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm">
            Start Over
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Prefill banner — shown when arriving from the Requirements page */}
      {prefilledFrom && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span className="text-sm text-emerald-300 flex-1">
            Form pre-filled from requirement <span className="font-semibold">{prefilledFrom.label}</span>. Review the details below and generate when ready.
          </span>
          <button
            onClick={() => setPrefilledFrom(null)}
            className="text-emerald-400/70 hover:text-emerald-300 transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Section 1: Quick Start from Template ── */}
      <div className="bg-gradient-to-r from-violet-600/10 to-purple-600/10 rounded-xl border border-violet-500/20 p-4">
        <div className="flex items-center gap-2 mb-3">
          <LayoutTemplate className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-semibold text-white">Quick Start</span>
          <span className="text-xs text-slate-400">— Pick a template or start from scratch</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map(tmpl => (
            <button
              key={tmpl.id}
              onClick={() => applyTemplate(tmpl.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                selectedTemplate === tmpl.id
                  ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
                  : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600'
              }`}
            >
              <span>{tmpl.icon}</span>
              {tmpl.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── Section 1b: Link to Requirement (RTM) ── */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
        <div className="flex items-center gap-1.5 mb-2">
          <GitBranch className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-semibold text-white">Link to Requirement</span>
          <span className="text-xs text-slate-500">(Optional)</span>
          <FieldHelp text="Linking to an RTM requirement automatically connects every generated test case to it and updates that requirement's coverage." />
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowRequirementDropdown(v => !v)}
            className="w-full flex items-center justify-between bg-slate-900/50 border border-slate-600/50 rounded-lg px-4 py-2.5 text-left hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
          >
            {selectedRequirement ? (
              <span className="flex items-center gap-2 min-w-0">
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-violet-500/15 text-violet-300 border border-violet-500/20 shrink-0">
                  {selectedRequirement.requirement_id}
                </span>
                <span className="text-sm text-white truncate">{selectedRequirement.title}</span>
              </span>
            ) : (
              <span className="text-sm text-slate-500">Select a requirement to link…</span>
            )}
            <Search className="w-4 h-4 text-slate-500 shrink-0" />
          </button>

          {showRequirementDropdown && (
            <div className="absolute z-50 mt-1 w-full bg-[#0f172a] border border-slate-700 rounded-lg shadow-xl max-h-72 overflow-hidden flex flex-col">
              <div className="p-2 border-b border-slate-700">
                <input
                  autoFocus
                  type="text"
                  value={requirementSearch}
                  onChange={e => setRequirementSearch(e.target.value)}
                  placeholder="Search requirements…"
                  className="w-full bg-slate-900/60 border border-slate-600/50 rounded-md px-3 py-1.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                />
              </div>
              <div className="overflow-y-auto p-1">
                <div
                  className="px-3 py-2 rounded-md hover:bg-slate-800 cursor-pointer text-sm text-slate-400"
                  onClick={() => { setSelectedRequirementId(''); setShowRequirementDropdown(false); }}
                >
                  None — don&apos;t link
                </div>
                {filteredRequirements.length === 0 ? (
                  <div className="px-3 py-3 text-xs text-slate-500 text-center">
                    {requirements.length === 0 ? 'No requirements found for this project.' : 'No matches.'}
                  </div>
                ) : (
                  filteredRequirements.map((req: any) => (
                    <div
                      key={req.id}
                      className="px-3 py-2 rounded-md hover:bg-slate-800 cursor-pointer"
                      onClick={() => { setSelectedRequirementId(req.id); setShowRequirementDropdown(false); }}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-500/15 text-violet-300 border border-violet-500/20">
                          {req.requirement_id}
                        </span>
                        {req.priority && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] text-slate-400 border border-slate-600">
                            {req.priority}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-200 truncate">{req.title}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        {selectedRequirement && (
          <p className="text-xs text-slate-500 mt-1.5">
            Category: {selectedRequirement.category || '—'} • Current coverage: {Math.round(selectedRequirement.coverage_percentage ?? 0)}%
          </p>
        )}
      </div>

      {/* ── Section 2: Test Scenario Details ── */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
        <h3 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
          <FileText className="w-4 h-4 text-violet-400" />
          Describe Your Test Scenario
        </h3>
        <p className="text-xs text-slate-400 mb-5">Tell us what you want to test — in plain English, Jira story format, or technical spec. The more detail you provide, the better the test cases.</p>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <label className="text-sm font-medium text-slate-300">What are you testing? *</label>
              <FieldHelp text="Enter a short title describing the feature or scenario. Example: 'Users should login using email OTP'" />
              {title.trim().length > 0 && (
                titleValid
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  : <span className="text-[10px] text-amber-400">Too short (min 5 chars)</span>
              )}
            </div>
            <input
              type="text"
              value={title}
              onChange={e => { setTitle(e.target.value); setSelectedTemplate(null); }}
              placeholder="e.g. Users should login using email OTP"
              className="w-full bg-slate-900/50 border border-slate-600/50 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50"
            />
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <label className="text-sm font-medium text-slate-300">Detailed Description *</label>
              <FieldHelp text="Describe the requirement fully — business rules, expected behavior, edge cases. The AI uses this to generate comprehensive test cases." />
              {description.trim().length > 0 && (
                descriptionValid
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  : <span className="text-[10px] text-amber-400">Add more detail ({description.trim().length}/20 chars min)</span>
              )}
            </div>
            <textarea
              value={description}
              onChange={e => { setDescription(e.target.value); setSelectedTemplate(null); }}
              rows={4}
              placeholder="Describe the requirement in detail. Include business rules, expected behavior, edge cases you're concerned about..."
              className="w-full bg-slate-900/50 border border-slate-600/50 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 resize-none"
            />
          </div>

          {/* Ticket / Module — side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <label className="text-sm font-medium text-slate-300">Ticket / Story ID</label>
                <span className="text-xs text-slate-500">(Optional)</span>
                <FieldHelp text="Link this to a Jira or project management ticket for traceability." />
              </div>
              <input
                type="text"
                value={jiraId}
                onChange={e => setJiraId(e.target.value)}
                placeholder="e.g. PROJ-1234"
                className="w-full bg-slate-900/50 border border-slate-600/50 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <label className="text-sm font-medium text-slate-300">Module / Area</label>
                <span className="text-xs text-slate-500">(Optional)</span>
                <FieldHelp text="The part of your application this test covers. E.g. Authentication, Payments, Dashboard." />
              </div>
              <input
                type="text"
                value={module}
                onChange={e => setModule(e.target.value)}
                placeholder="e.g. Authentication, Payments"
                className="w-full bg-slate-900/50 border border-slate-600/50 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50"
              />
            </div>
          </div>
        </div>

        {/* Advanced fields — collapsible */}
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Advanced Details
            <span className="text-xs text-slate-600">(Business flow, acceptance criteria)</span>
          </button>
          {showAdvanced && (
            <div className="mt-3 space-y-4">
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="text-sm font-medium text-slate-300">Business Flow</label>
                  <FieldHelp text="Describe the step-by-step user journey. Use arrows (→) to separate steps." />
                </div>
                <textarea
                  value={businessFlow}
                  onChange={e => setBusinessFlow(e.target.value)}
                  rows={2}
                  placeholder="e.g. User enters email → receives OTP → enters OTP → session created → redirect to dashboard"
                  className="w-full bg-slate-900/50 border border-slate-600/50 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 resize-none"
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="text-sm font-medium text-slate-300">Acceptance Criteria</label>
                  <FieldHelp text="List specific conditions that must be true for the feature to be considered complete. One per line, starting with a dash." />
                </div>
                <textarea
                  value={acceptanceCriteria}
                  onChange={e => setAcceptanceCriteria(e.target.value)}
                  rows={3}
                  placeholder="e.g.&#10;- OTP should expire in 5 minutes&#10;- Account locks after 5 failed attempts&#10;- Admin can reset locked accounts"
                  className="w-full bg-slate-900/50 border border-slate-600/50 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 resize-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Section 3: Intelligence Sources ── */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
        <h3 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
          <Brain className="w-4 h-4 text-violet-400" />
          Intelligence Sources
          <span className="text-xs text-slate-500 font-normal">(Optional — improves accuracy)</span>
        </h3>
        <p className="text-xs text-slate-400 mb-4">Connect knowledge and repository data to generate more relevant and accurate test cases.</p>

        <div className="space-y-3">
          {/* App Knowledge Selector */}
          <KnowledgeSelector
            selectedIds={selectedKnowledgeIds}
            onChange={setSelectedKnowledgeIds}
            contextTitle={title}
            contextDescription={description}
          />

          {/* Repository Intelligence */}
          <div className={`rounded-xl border transition-all ${
            useRepoIntelligence ? 'bg-slate-800/80 border-emerald-500/30' : 'bg-slate-800/50 border-slate-700/50'
          }`}>
            <div className="flex items-center gap-3 px-4 py-3">
              <button
                type="button"
                onClick={() => setUseRepoIntelligence(!useRepoIntelligence)}
                className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition-all ${
                  useRepoIntelligence ? 'bg-emerald-500 border-emerald-400' : 'border-slate-600 bg-slate-800 hover:border-slate-500'
                }`}
              >
                {useRepoIntelligence && <Check className="w-3.5 h-3.5 text-white" />}
              </button>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <Cpu className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-slate-200">Repository Intelligence</span>
                <p className="text-xs text-slate-500">Use code patterns and architecture from analyzed repos</p>
              </div>
            </div>

            {useRepoIntelligence && (
              <div className="px-4 pb-3 pt-1">
                {loadingRepos ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading repositories...
                  </div>
                ) : repos.length === 0 ? (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                    <p className="text-xs text-amber-300">No repositories found. Add a repository in the Projects page first.</p>
                  </div>
                ) : (
                  <select
                    value={selectedRepoId}
                    onChange={e => setSelectedRepoId(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-emerald-500/50 outline-none"
                  >
                    <option value="">Select a repository...</option>
                    {repos.map((r: any) => {
                      const hasIntel = scannedRepoIds.has(r.id);
                      return (
                        <option key={r.id} value={String(r.id)}>
                          {r.name} {r.branch ? `(${r.branch})` : ''} {hasIntel ? '✓ Scanned' : '— Not scanned'}
                        </option>
                      );
                    })}
                  </select>
                )}
                {selectedRepoId && !scannedRepoIds.has(parseInt(selectedRepoId, 10)) && (
                  <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    This repo hasn&apos;t been scanned yet. <a href="/repo-intelligence" className="underline">Scan it first →</a>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Coverage Gap Analysis */}
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
            includeCoverageGaps ? 'bg-slate-800/80 border-amber-500/20' : 'bg-slate-800/50 border-slate-700/50'
          }`}>
            <button
              type="button"
              onClick={() => setIncludeCoverageGaps(!includeCoverageGaps)}
              className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition-all ${
                includeCoverageGaps ? 'bg-amber-500 border-amber-400' : 'border-slate-600 bg-slate-800 hover:border-slate-500'
              }`}
            >
              {includeCoverageGaps && <Check className="w-3.5 h-3.5 text-white" />}
            </button>
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-200">Include Coverage Gap Analysis</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">Recommended</span>
              </div>
              <p className="text-xs text-slate-500">Automatically identifies missing test scenarios you might have overlooked</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 4: Coverage Types ── */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
        <button
          type="button"
          onClick={() => setShowCoverageTypes(!showCoverageTypes)}
          className="w-full flex items-center gap-2 text-left"
        >
          <Target className="w-4 h-4 text-violet-400" />
          <span className="text-base font-semibold text-white flex-1">Coverage Types</span>
          <span className="text-xs text-slate-400 mr-2">
            {selectedTypes.length} selected
          </span>
          {showCoverageTypes ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {/* Always show selected types as pills */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {selectedTypes.map(t => {
            const opt = COVERAGE_OPTIONS.find(o => o.value === t);
            return (
              <span key={t} className="inline-flex items-center gap-1 bg-violet-500/15 text-violet-300 px-2 py-0.5 rounded-full text-xs border border-violet-500/20">
                <span>{opt?.icon}</span>
                {opt?.label}
                <button type="button" onClick={() => toggleType(t)} className="ml-0.5 hover:text-red-400">
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>

        {showCoverageTypes && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mt-4">
            {COVERAGE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleType(opt.value)}
                className={`relative flex flex-col items-start p-2.5 rounded-lg border transition-all text-left ${
                  selectedTypes.includes(opt.value)
                    ? 'bg-violet-600/20 border-violet-500/50 ring-1 ring-violet-500/30'
                    : 'bg-slate-900/30 border-slate-700/50 hover:border-slate-600/50'
                }`}
              >
                {selectedTypes.includes(opt.value) && (
                  <div className="absolute top-1.5 right-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-violet-400" />
                  </div>
                )}
                <span className="text-sm mb-0.5">{opt.icon}</span>
                <span className={`text-xs font-medium ${selectedTypes.includes(opt.value) ? 'text-white' : 'text-slate-300'}`}>
                  {opt.label}
                </span>
                <span className="text-[10px] text-slate-500">{opt.description}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Generate Button ── */}
      <div className="flex items-center justify-between gap-4 bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
        <div className="text-xs text-slate-400 space-y-0.5">
          <div className="flex items-center gap-3 flex-wrap">
            <span>{selectedTypes.length} coverage type{selectedTypes.length !== 1 ? 's' : ''}</span>
            {selectedKnowledgeIds.length > 0 && (
              <span className="flex items-center gap-1 text-violet-400">
                <BookOpen className="w-3 h-3" /> {selectedKnowledgeIds.length} knowledge item{selectedKnowledgeIds.length !== 1 ? 's' : ''}
              </span>
            )}
            {useRepoIntelligence && selectedRepoId && (
              <span className="flex items-center gap-1 text-emerald-400">
                <Cpu className="w-3 h-3" /> Repo intelligence
              </span>
            )}
            {includeCoverageGaps && (
              <span className="flex items-center gap-1 text-amber-400">
                <Shield className="w-3 h-3" /> Gap analysis
              </span>
            )}
          </div>
          {!canGenerate && (
            <p className="text-amber-400">
              {!titleValid ? 'Add a title (min 5 chars)' : !descriptionValid ? 'Add a description (min 20 chars)' : 'Select at least one coverage type'}
            </p>
          )}
        </div>
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-white rounded-lg font-medium transition-all shadow-lg shadow-violet-600/20 whitespace-nowrap"
        >
          <Sparkles className="w-4 h-4" />
          Generate Test Cases
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Results Display                                                    */
/* ------------------------------------------------------------------ */

function ResultsDisplay({ result, onReset, onViewHistory }: { result: any; onReset: () => void; onViewHistory: () => void }) {
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  const [expandedCases, setExpandedCases] = useState<Set<string>>(new Set());
  const [showGaps, setShowGaps] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [resultsFilter, setResultsFilter] = useState<'all' | 'core' | 'gaps'>('all');

  const analysis = result.requirementAnalysis || {};
  const scenarios = result.scenarios || [];
  const testCases = result.testCases || [];
  const gaps = result.coverageGaps || [];
  const stats = result.stats || {};
  const isSaved = result.requirementId != null;
  const warning = result._warning;
  const knowledgeUsed = result.knowledgeUsed || [];

  // Build coverage type lookup
  const labelMap: Record<string, { label: string; icon: string }> = {};
  COVERAGE_OPTIONS.forEach(o => { labelMap[o.value] = { label: o.label, icon: o.icon }; });

  // Group scenarios by coverage type
  const coverageGroups: Array<{
    coverageType: string;
    label: string;
    icon: string;
    scenarios: Array<{ scenario: any; scenarioIndex: number; cases: any[] }>;
    totalCases: number;
  }> = [];

  const typeOrder: string[] = [];
  const typeMap: Record<string, { scenarios: Array<{ scenario: any; scenarioIndex: number; cases: any[] }> }> = {};

  scenarios.forEach((sc: any, si: number) => {
    const ct = sc.coverageType || 'other';
    if (!typeMap[ct]) {
      typeMap[ct] = { scenarios: [] };
      typeOrder.push(ct);
    }
    const relatedCases = testCases.filter((tc: any) => {
      if (tc.scenarioIndex != null) return tc.scenarioIndex === si;
      return tc.tags?.some((t: string) =>
        sc.coverageType?.includes(t) || sc.scenario?.toLowerCase().includes(t.toLowerCase())
      );
    });
    typeMap[ct].scenarios.push({ scenario: sc, scenarioIndex: si, cases: relatedCases });
  });

  typeOrder.forEach(ct => {
    const info = labelMap[ct] || { label: ct.replace(/_/g, ' '), icon: '📋' };
    const group = typeMap[ct];
    const totalCases = group.scenarios.reduce((sum, s) => sum + s.cases.length, 0);
    coverageGroups.push({
      coverageType: ct,
      label: info.label,
      icon: info.icon,
      scenarios: group.scenarios,
      totalCases,
    });
  });

  useEffect(() => {
    setExpandedTypes(new Set(typeOrder));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleType = (ct: string) => {
    setExpandedTypes(prev => {
      const next = new Set(prev);
      next.has(ct) ? next.delete(ct) : next.add(ct);
      return next;
    });
  };

  const toggleCase = (key: string) => {
    setExpandedCases(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const totalAutoReady = stats.automationReadyCount ?? testCases.filter((tc: any) => tc.automationReady).length;
  const autoPercent = testCases.length > 0 ? Math.round((totalAutoReady / testCases.length) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Coverage Summary Card */}
      <div className={`bg-gradient-to-r ${isSaved ? 'from-emerald-600/15 to-violet-600/15 border-emerald-500/30' : 'from-amber-600/15 to-orange-600/15 border-amber-500/30'} border rounded-xl p-5`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSaved ? 'bg-emerald-500/20' : 'bg-amber-500/20'}`}>
              <CheckCircle2 className={`w-5 h-5 ${isSaved ? 'text-emerald-400' : 'text-amber-400'}`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Generation Complete</h3>
              {warning && (
                <p className="text-xs text-amber-400 mt-0.5 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {warning}
                </p>
              )}
              {knowledgeUsed.length > 0 && (
                <p className="text-xs text-violet-400 mt-0.5 flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  Used {knowledgeUsed.length} knowledge item{knowledgeUsed.length !== 1 ? 's' : ''}: {knowledgeUsed.map((k: any) => k.title).join(', ')}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {isSaved && (
              <button onClick={onViewHistory} className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600/80 hover:bg-violet-500 text-sm text-white rounded-lg transition-all">
                <ClipboardList className="w-3.5 h-3.5" /> View in History
              </button>
            )}
            <button onClick={onReset} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700/80 hover:bg-slate-600 text-sm text-slate-300 rounded-lg transition-all">
              <Plus className="w-3.5 h-3.5" /> New
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-slate-900/40 rounded-lg px-3 py-2.5 text-center">
            <div className="text-xl font-bold text-white">{scenarios.length}</div>
            <div className="text-xs text-slate-400">Scenarios</div>
          </div>
          <div className="bg-slate-900/40 rounded-lg px-3 py-2.5 text-center">
            <div className="text-xl font-bold text-white">{testCases.length}</div>
            <div className="text-xs text-slate-400">Test Cases</div>
          </div>
          <div className="bg-slate-900/40 rounded-lg px-3 py-2.5 text-center">
            <div className="text-xl font-bold text-white">{coverageGroups.length}</div>
            <div className="text-xs text-slate-400">Coverage Types</div>
          </div>
          <div className="bg-slate-900/40 rounded-lg px-3 py-2.5 text-center">
            <div className="text-xl font-bold text-emerald-400">{totalAutoReady}</div>
            <div className="text-xs text-slate-400">Auto-Ready ({autoPercent}%)</div>
          </div>
          <div className="bg-slate-900/40 rounded-lg px-3 py-2.5 text-center">
            <div className={`text-xl font-bold ${RISK_COLORS[analysis.riskLevel] || 'text-white'}`}>
              {analysis.riskLevel ? analysis.riskLevel.charAt(0).toUpperCase() + analysis.riskLevel.slice(1) : 'N/A'}
            </div>
            <div className="text-xs text-slate-400">Risk Level</div>
          </div>
        </div>
      </div>

      {/* Results Tab Bar: Core | Coverage Gaps | All */}
      {gaps.length > 0 && (
        <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1">
          {([
            { key: 'all' as const, label: `All (${scenarios.length + gaps.length})`, icon: ClipboardList },
            { key: 'core' as const, label: `Core Scenarios (${scenarios.length})`, icon: Target },
            { key: 'gaps' as const, label: `Coverage Gaps (${gaps.length})`, icon: Shield },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setResultsFilter(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                resultsFilter === tab.key
                  ? tab.key === 'gaps' ? 'bg-amber-500/20 text-amber-300' : 'bg-violet-500/20 text-violet-300'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Core Scenarios */}
      {(resultsFilter === 'all' || resultsFilter === 'core') && (
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-blue-400" />
            Test Coverage
          </h3>

          {coverageGroups.map((group) => {
            const isTypeExpanded = expandedTypes.has(group.coverageType);
            return (
              <div key={group.coverageType} className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
                <button
                  onClick={() => toggleType(group.coverageType)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700/30 transition-all text-left"
                >
                  {isTypeExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  <span className="text-base">{group.icon}</span>
                  <span className="text-sm font-semibold text-white uppercase tracking-wide">{group.label}</span>
                  <span className="text-xs text-slate-500">
                    {group.scenarios.length} scenario{group.scenarios.length !== 1 ? 's' : ''}, {group.totalCases} case{group.totalCases !== 1 ? 's' : ''}
                  </span>
                </button>

                {isTypeExpanded && (
                  <div className="border-t border-slate-700/30 px-4 pb-4 pt-2 space-y-4">
                    {group.scenarios.map(({ scenario: sc, scenarioIndex: si, cases }) => (
                      <div key={si} className="space-y-1.5">
                        <div className="flex items-center gap-2 py-1.5">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold border ${PRIORITY_COLORS[sc.priority] || PRIORITY_COLORS.P2}`}>
                            {sc.priority}
                          </span>
                          <span className="text-sm font-medium text-slate-200">{sc.scenario}</span>
                          {sc.riskArea && (
                            <span className="text-xs text-slate-500 ml-auto hidden sm:inline">Risk: {sc.riskArea}</span>
                          )}
                        </div>

                        <div className="ml-2 border-l-2 border-slate-700/50 pl-3 space-y-1.5">
                          {cases.length > 0 ? cases.map((tc: any, tci: number) => {
                            const caseKey = `${si}-${tci}`;
                            const isExpanded = expandedCases.has(caseKey);
                            return (
                              <div key={caseKey} className="rounded-lg overflow-hidden border border-slate-700/40 bg-slate-900/20">
                                <button
                                  onClick={() => toggleCase(caseKey)}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-700/20 transition-all text-left"
                                >
                                  {isExpanded
                                    ? <ChevronDown className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                                    : <ChevronRight className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                                  }
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border flex-shrink-0 ${PRIORITY_COLORS[tc.priority] || PRIORITY_COLORS.P2}`}>
                                    {tc.priority}
                                  </span>
                                  <span className="text-sm text-slate-200 flex-1 line-clamp-1">{tc.title}</span>
                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${SEVERITY_COLORS[tc.severity] || ''}`}>
                                      {tc.severity}
                                    </span>
                                    {tc.automationReady && <span title="Automation Ready"><Zap className="w-3 h-3 text-emerald-400" /></span>}
                                  </div>
                                </button>
                                {isExpanded && (
                                  <div className="border-t border-slate-700/30 p-3 bg-slate-900/40 space-y-2.5">
                                    {tc.preconditions && (
                                      <div>
                                        <div className="text-[11px] font-medium text-slate-500 mb-0.5">Preconditions</div>
                                        <div className="text-sm text-slate-300">{tc.preconditions}</div>
                                      </div>
                                    )}
                                    {tc.steps?.length > 0 && (
                                      <div>
                                        <div className="text-[11px] font-medium text-slate-500 mb-0.5">Steps</div>
                                        <ol className="list-decimal list-inside space-y-0.5">
                                          {tc.steps.map((s: string, i: number) => (
                                            <li key={i} className="text-sm text-slate-300">{s}</li>
                                          ))}
                                        </ol>
                                      </div>
                                    )}
                                    <div>
                                      <div className="text-[11px] font-medium text-slate-500 mb-0.5">Expected Result</div>
                                      <div className="text-sm text-emerald-300">{tc.expectedResult}</div>
                                    </div>
                                    {tc.testData && (
                                      <div>
                                        <div className="text-[11px] font-medium text-slate-500 mb-0.5">Test Data</div>
                                        <div className="text-sm text-slate-300 font-mono bg-slate-800/50 px-2 py-1 rounded">{tc.testData}</div>
                                      </div>
                                    )}
                                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-700/30">
                                      {tc.tags?.map((tag: string, ti: number) => (
                                        <span key={ti} className="bg-slate-700/50 text-slate-400 px-1.5 py-0.5 rounded text-[10px] flex items-center gap-0.5">
                                          <Tag className="w-2.5 h-2.5" />{tag}
                                        </span>
                                      ))}
                                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${tc.automationReady ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-600/30 text-slate-500'}`}>
                                        {tc.automationReady ? '✓ Auto-Ready' : '✗ Manual'}
                                      </span>
                                      {tc.automationComplexity && (
                                        <span className="bg-blue-500/15 text-blue-300 px-1.5 py-0.5 rounded text-[10px]">
                                          {tc.automationComplexity} complexity
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          }) : (
                            <div className="text-xs text-slate-500 italic py-1">No test cases linked to this scenario</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Coverage Gaps */}
      {(resultsFilter === 'all' || resultsFilter === 'gaps') && gaps.length > 0 && (
        <div className="space-y-3">
          {resultsFilter === 'all' && (
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              Coverage Gaps
              <span className="text-xs text-slate-400 font-normal">Areas that may need additional testing</span>
            </h3>
          )}
          <div className="space-y-2">
            {gaps.map((gap: any, gi: number) => (
              <div key={gi} className="bg-slate-800/50 border border-amber-500/20 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    gap.severity === 'critical' || gap.severity === 'high' ? 'bg-red-500/20' : 'bg-amber-500/20'
                  }`}>
                    <Shield className={`w-4 h-4 ${RISK_COLORS[gap.severity] || 'text-amber-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-white">{gap.area}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${SEVERITY_COLORS[gap.severity] || ''}`}>{gap.severity}</span>
                    </div>
                    <div className="text-xs text-slate-400">{gap.description}</div>
                    <div className="text-xs text-emerald-400 mt-2 flex items-center gap-1 bg-emerald-500/10 rounded-lg px-2.5 py-1.5">
                      <Lightbulb className="w-3 h-3 flex-shrink-0" />
                      <span>{gap.suggestion}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Requirement Analysis — Collapsible */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
        <button
          onClick={() => setShowAnalysis(!showAnalysis)}
          className="w-full flex items-center gap-2 px-4 py-3 hover:bg-slate-700/30 transition-all text-left"
        >
          {showAnalysis ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
          <Lightbulb className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold text-white flex-1">Requirement Analysis</span>
          <span className="text-xs text-slate-500 capitalize">{analysis.featureType || ''} • {analysis.riskLevel || ''} risk</span>
        </button>
        {showAnalysis && (
          <div className="border-t border-slate-700/30 px-4 pb-4 pt-3 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-900/50 rounded-lg p-2.5">
                <div className="text-[11px] text-slate-500 mb-0.5">Feature Type</div>
                <div className="text-sm font-medium text-white capitalize">{analysis.featureType || 'N/A'}</div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-2.5">
                <div className="text-[11px] text-slate-500 mb-0.5">Risk Level</div>
                <div className={`text-sm font-medium capitalize ${RISK_COLORS[analysis.riskLevel] || 'text-white'}`}>{analysis.riskLevel || 'N/A'}</div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-2.5">
                <div className="text-[11px] text-slate-500 mb-0.5">Modules</div>
                <div className="text-sm font-medium text-white">{(analysis.impactedModules || []).join(', ') || 'N/A'}</div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-2.5">
                <div className="text-[11px] text-slate-500 mb-0.5">User Roles</div>
                <div className="text-sm font-medium text-white">{(analysis.userRolesAffected || []).join(', ') || 'N/A'}</div>
              </div>
            </div>
            {analysis.summary && (
              <p className="text-sm text-slate-300 bg-slate-900/30 rounded-lg p-3">{analysis.summary}</p>
            )}
            {analysis.workflowSteps?.length > 0 && (
              <div>
                <div className="text-[11px] text-slate-500 mb-1.5">Workflow</div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {analysis.workflowSteps.map((s: string, i: number) => (
                    <span key={i} className="flex items-center gap-1">
                      <span className="bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded text-xs">{s}</span>
                      {i < analysis.workflowSteps.length - 1 && <ArrowRight className="w-3 h-3 text-slate-600" />}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  History Tab                                                        */
/* ------------------------------------------------------------------ */

function HistoryTab() {
  const { activeProject } = useProject();
  const [requirements, setRequirements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  /* Export state */
  const [exportDialogReqId, setExportDialogReqId] = useState<number | null>(null);
  const [exportFormat, setExportFormat] = useState<'excel' | 'csv'>('excel');
  const [includeGaps, setIncludeGaps] = useState(true);
  const [exportingId, setExportingId] = useState<number | null>(null);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  const getProjectHeaders = useCallback((): Record<string, string> => {
    return activeProject?.id ? { 'x-project-id': String(activeProject.id) } : {};
  }, [activeProject?.id]);

  const fetchRequirements = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/test-coverage/requirements', { headers: getProjectHeaders() });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setFetchError(errData?.details || errData?.error || `Backend returned ${res.status}`);
        setRequirements([]);
      } else {
        const data = await res.json();
        setRequirements(Array.isArray(data) ? data : []);
      }
    } catch (err: any) {
      setFetchError(err?.message || 'Could not reach backend');
      setRequirements([]);
    }
    setLoading(false);
  }, [getProjectHeaders]);

  useEffect(() => { fetchRequirements(); }, [fetchRequirements]);

  // Reset selection when project changes
  useEffect(() => { setSelectedReq(null); }, [activeProject?.id]);

  const viewDetail = async (id: number) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/test-coverage/requirements/${id}`, { headers: getProjectHeaders() });
      const data = await res.json();
      setSelectedReq(data);
    } catch { /* ignore */ }
    setDetailLoading(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this requirement and all generated test cases?')) return;
    await fetch(`/api/test-coverage/requirements/${id}`, { method: 'DELETE', headers: getProjectHeaders() });
    setSelectedReq(null);
    fetchRequirements();
  };

  /* ---- Export handler ---- */
  const handleExport = async () => {
    if (!exportDialogReqId) return;
    setExportingId(exportDialogReqId);
    try {
      const res = await fetch('/api/test-coverage/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getProjectHeaders() },
        body: JSON.stringify({ requirementId: exportDialogReqId, format: exportFormat, includeGaps, includeMetadata: true }),
      });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const ext = exportFormat === 'excel' ? 'xlsx' : 'csv';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `test-cases-${exportDialogReqId}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Test cases exported successfully');
      setExportDialogReqId(null);
    } catch (err: any) {
      toast.error(err?.message || 'Export failed');
    } finally {
      setExportingId(null);
    }
  };

  /* ---- Template download handler ---- */
  const handleDownloadTemplate = async (fmt: 'excel' | 'csv' = 'excel') => {
    setDownloadingTemplate(true);
    try {
      const res = await fetch(`/api/test-coverage/template?format=${fmt}`, { headers: getProjectHeaders() });
      if (!res.ok) throw new Error(`Template download failed (${res.status})`);
      const blob = await res.blob();
      const ext = fmt === 'excel' ? 'xlsx' : 'csv';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `test-case-template.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Template downloaded');
    } catch (err: any) {
      toast.error(err?.message || 'Template download failed');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    );
  }

  if (selectedReq) {
    return <RequirementDetail data={selectedReq} onBack={() => setSelectedReq(null)} onDelete={handleDelete} loading={detailLoading} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-white">Generated Test Cases</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleDownloadTemplate('excel')}
            disabled={downloadingTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-700/60 hover:bg-slate-600/60 text-slate-300 rounded-lg border border-slate-600/50 transition-all disabled:opacity-50"
            title="Download Template"
          >
            {downloadingTemplate ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LayoutTemplate className="w-3.5 h-3.5" />}
            Template
          </button>
          <button onClick={fetchRequirements} className="p-2 hover:bg-slate-700/50 rounded-lg transition-all">
            <RefreshCw className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {fetchError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 text-sm text-red-400">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>Failed to load history: {fetchError}</span>
          </div>
        </div>
      )}

      {requirements.length === 0 && !fetchError ? (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-12 text-center">
          <ClipboardList className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No test cases generated yet</p>
          <p className="text-xs text-slate-500 mt-1">Use the Generate Test Cases tab to create your first set of manual test cases</p>
        </div>
      ) : requirements.length === 0 ? null : (
        <div className="space-y-2">
          {requirements.map((req: any) => (
            <div key={req.id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:border-slate-600/50 transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-medium text-white truncate">{req.title}</h4>
                    {req.jira_id && (
                      <span className="text-xs bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">{req.jira_id}</span>
                    )}
                    {req.risk_level && (
                      <span className={`text-xs capitalize ${RISK_COLORS[req.risk_level] || 'text-slate-400'}`}>
                        {req.risk_level}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-1">{req.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                    <span>{req.scenario_count || 0} scenarios</span>
                    <span>•</span>
                    <span>{req.test_case_count || 0} test cases</span>
                    {req.module && <><span>•</span><span>{req.module}</span></>}
                    <span>•</span>
                    <span>{new Date(req.created_at).toLocaleDateString()}</span>
                  </div>
                  {/* Coverage type badges */}
                  {(() => {
                    const analysis = typeof req.analysis === 'string' ? (() => { try { return JSON.parse(req.analysis); } catch { return null; } })() : req.analysis;
                    const types: string[] = analysis?.coverageTypes || analysis?.coverage_types || [];
                    const knowledgeCount = analysis?.knowledgeItemIds?.length || 0;
                    if (types.length === 0 && knowledgeCount === 0) return null;
                    const labelMap: Record<string, { label: string; icon: string }> = {};
                    COVERAGE_OPTIONS.forEach(o => { labelMap[o.value] = { label: o.label, icon: o.icon }; });
                    return (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {types.map((ct: string) => {
                          const info = labelMap[ct] || { label: ct.replace(/_/g, ' '), icon: '📋' };
                          return (
                            <span key={ct} className="inline-flex items-center gap-1 bg-violet-500/15 text-violet-300 px-2 py-0.5 rounded text-xs border border-violet-500/20">
                              <span>{info.icon}</span>
                              <span className="capitalize">{info.label}</span>
                            </span>
                          );
                        })}
                        {knowledgeCount > 0 && (
                          <span className="inline-flex items-center gap-1 bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded text-xs border border-emerald-500/20">
                            <BookOpen className="w-3 h-3" />
                            {knowledgeCount} knowledge
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => viewDetail(req.id)}
                    className="p-2 hover:bg-slate-700/50 rounded-lg transition-all"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4 text-slate-400" />
                  </button>
                  <button
                    onClick={() => { setExportDialogReqId(req.id); setExportFormat('excel'); setIncludeGaps(true); }}
                    className="p-2 hover:bg-violet-500/20 rounded-lg transition-all"
                    title="Export Test Cases"
                  >
                    <Download className="w-4 h-4 text-slate-400 hover:text-violet-400" />
                  </button>
                  <button
                    onClick={() => handleDelete(req.id)}
                    className="p-2 hover:bg-red-500/20 rounded-lg transition-all"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-slate-500 hover:text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---- Export Dialog ---- */}
      {exportDialogReqId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1f2e] border border-slate-700/60 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Download className="w-4 h-4 text-violet-400" />
                Export Test Cases
              </h3>
              <button onClick={() => setExportDialogReqId(null)} className="p-1 hover:bg-slate-700/50 rounded-lg">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Format selection */}
            <div>
              <label className="text-xs font-medium text-slate-400 mb-2 block">Format</label>
              <div className="flex gap-2">
                {(['excel', 'csv'] as const).map(fmt => (
                  <button
                    key={fmt}
                    onClick={() => setExportFormat(fmt)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-all ${
                      exportFormat === fmt
                        ? 'bg-violet-600/30 border-violet-500/50 text-violet-300'
                        : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-600/50'
                    }`}
                  >
                    {fmt === 'excel' ? '📊 Excel (.xlsx)' : '📄 CSV (.csv)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Coverage gaps toggle */}
            <div className="flex items-center justify-between bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
              <div>
                <p className="text-sm text-slate-200">Include Coverage Gaps</p>
                <p className="text-xs text-slate-500">Add gap analysis scenarios to export</p>
              </div>
              <button
                onClick={() => setIncludeGaps(!includeGaps)}
                className={`relative w-10 h-5 rounded-full transition-colors ${includeGaps ? 'bg-violet-600' : 'bg-slate-600'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${includeGaps ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setExportDialogReqId(null)}
                className="flex-1 py-2 text-sm font-medium text-slate-400 bg-slate-800/50 border border-slate-700/50 rounded-lg hover:bg-slate-700/50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={exportingId !== null}
                className="flex-1 py-2 text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-lg transition-all shadow-lg shadow-violet-900/30 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {exportingId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Export
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- Requirement Detail View ---- */
function RequirementDetail({ data, onBack, onDelete, loading }: { data: any; onBack: () => void; onDelete: (id: number) => void; loading: boolean }) {
  const { activeProject } = useProject();
  const [expandedCases, setExpandedCases] = useState<Set<number>>(new Set());
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [detailExporting, setDetailExporting] = useState(false);
  const req = data.requirement || {};
  const scenarios = data.scenarios || [];
  const testCases = data.testCases || [];
  // analysis can come back as a parsed object or (defensively) a JSON string
  const analysis = (() => {
    const a = req.analysis;
    if (!a) return {};
    if (typeof a === 'string') { try { return JSON.parse(a); } catch { return {}; } }
    return a;
  })();
  // Coverage gaps are persisted inside the analysis JSONB (no separate table).
  // Prefer top-level data.coverageGaps if the API ever returns it, else read from analysis.
  const coverageGaps = (() => {
    const g = data.coverageGaps ?? analysis.coverageGaps;
    if (!g) return [];
    if (typeof g === 'string') { try { return JSON.parse(g); } catch { return []; } }
    return Array.isArray(g) ? g : [];
  })();

  const toggleCase = (i: number) => {
    setExpandedCases(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });
  };

  const quickExport = async () => {
    setDetailExporting(true);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (activeProject?.id) headers['x-project-id'] = String(activeProject.id);
    try {
      const res = await fetch('/api/test-coverage/export', {
        method: 'POST', headers,
        body: JSON.stringify({ requirementId: req.id, format: 'excel', includeGaps: true, includeMetadata: true }),
      });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `test-cases-${req.id}.xlsx`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      toast.success('Test cases exported');
    } catch (err: any) { toast.error(err?.message || 'Export failed'); }
    finally { setDetailExporting(false); }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 text-violet-400 animate-spin" /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-slate-700/50 rounded-lg transition-all">
          <ChevronRight className="w-4 h-4 text-slate-400 rotate-180" />
        </button>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white">{req.title}</h3>
          <p className="text-xs text-slate-400">{req.jira_id && `${req.jira_id} • `}{req.module && `${req.module} • `}{new Date(req.created_at).toLocaleString()}</p>
        </div>
        <button
          onClick={quickExport}
          disabled={detailExporting}
          className="flex items-center gap-2 px-3 py-2 bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 text-sm font-medium rounded-lg border border-violet-500/30 transition-all disabled:opacity-50"
          title="Export to Excel"
        >
          {detailExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Export
        </button>
        <button
          onClick={() => setShowScriptModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-medium rounded-lg transition-all shadow-lg shadow-emerald-900/30"
        >
          <Code2 className="w-4 h-4" />
          Generate Scripts & PR
        </button>
        <button
          onClick={() => onDelete(req.id)}
          className="p-2 hover:bg-red-500/20 rounded-lg transition-all"
        >
          <Trash2 className="w-4 h-4 text-red-400" />
        </button>
      </div>

      {showScriptModal && (
        <GenerateScriptsModal
          requirementId={req.id}
          requirementTitle={req.title}
          testCaseCount={testCases.length}
          onClose={() => setShowScriptModal(false)}
        />
      )}

      {/* Knowledge used badge */}
      {analysis.knowledgeItemTitles?.length > 0 && (
        <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg p-3 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-violet-400 flex-shrink-0" />
          <span className="text-xs text-violet-300">
            Generated with {analysis.knowledgeItemTitles.length} knowledge item{analysis.knowledgeItemTitles.length !== 1 ? 's' : ''}: {analysis.knowledgeItemTitles.join(', ')}
          </span>
        </div>
      )}

      {/* Analysis summary */}
      {analysis.summary && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-white">Analysis</span>
            <span className={`text-xs capitalize ml-auto ${RISK_COLORS[analysis.riskLevel] || 'text-slate-400'}`}>
              Risk: {analysis.riskLevel}
            </span>
          </div>
          <p className="text-sm text-slate-300">{analysis.summary}</p>
        </div>
      )}

      {/* Scenarios */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
        <h4 className="text-sm font-semibold text-white mb-3">{scenarios.length} Scenarios</h4>
        <div className="space-y-2">
          {scenarios.map((sc: any, i: number) => (
            <div key={i} className="flex items-center gap-2 bg-slate-900/30 rounded-lg px-3 py-2">
              <span className={`px-2 py-0.5 rounded text-xs font-bold border ${PRIORITY_COLORS[sc.priority] || PRIORITY_COLORS.P2}`}>{sc.priority}</span>
              <span className="text-sm text-white flex-1">{sc.scenario}</span>
              <span className="text-xs bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded">{sc.coverage_type}</span>
              <span className="text-xs text-slate-500">{sc.case_count || 0} cases</span>
            </div>
          ))}
        </div>
      </div>

      {/* Test Cases grouped by Coverage Type */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
        <h4 className="text-sm font-semibold text-white mb-3">{testCases.length} Test Cases</h4>
        {(() => {
          const groups: Record<string, { coverageType: string; scenarioName: string; cases: any[] }> = {};
          for (const tc of testCases) {
            const key = tc.scenario_id ? String(tc.scenario_id) : (tc.coverage_type || 'ungrouped');
            if (!groups[key]) {
              const matchedScenario = scenarios.find((s: any) => s.id === tc.scenario_id);
              groups[key] = {
                coverageType: matchedScenario?.coverage_type || tc.coverage_type || 'unknown',
                scenarioName: matchedScenario?.scenario || tc.scenario || '',
                cases: [],
              };
            }
            groups[key].cases.push(tc);
          }
          const labelMap: Record<string, { label: string; icon: string }> = {};
          COVERAGE_OPTIONS.forEach(o => { labelMap[o.value] = { label: o.label, icon: o.icon }; });
          const groupEntries = Object.entries(groups);

          return (
            <div className="space-y-4">
              {groupEntries.map(([gKey, group]) => {
                const info = labelMap[group.coverageType] || { label: group.coverageType.replace(/_/g, ' '), icon: '📋' };
                return (
                  <div key={gKey} className="space-y-2">
                    <div className="flex items-center gap-2 pb-1 border-b border-slate-700/30">
                      <span className="text-sm">{info.icon}</span>
                      <span className="text-xs font-semibold text-violet-300 uppercase tracking-wide">{info.label}</span>
                      <span className="text-xs text-slate-500">({group.cases.length} case{group.cases.length !== 1 ? 's' : ''})</span>
                      {group.scenarioName && <span className="text-xs text-slate-500 ml-auto truncate max-w-[50%]">{group.scenarioName}</span>}
                    </div>
                    {group.cases.map((tc: any) => {
                      const ci = testCases.indexOf(tc);
                      const isExpanded = expandedCases.has(ci);
                      const steps = typeof tc.steps === 'string' ? (() => { try { return JSON.parse(tc.steps); } catch { return []; } })() : (tc.steps || []);
                      const tags = typeof tc.tags === 'string' ? (() => { try { return JSON.parse(tc.tags); } catch { return []; } })() : (tc.tags || []);
                      return (
                        <div key={ci} className="border border-slate-700/50 rounded-lg overflow-hidden">
                          <button onClick={() => toggleCase(ci)} className="w-full flex items-center gap-3 p-3 hover:bg-slate-700/30 transition-all text-left">
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                            <span className={`px-2 py-0.5 rounded text-xs font-bold border ${PRIORITY_COLORS[tc.priority] || PRIORITY_COLORS.P2}`}>{tc.priority}</span>
                            <span className="text-sm text-white flex-1 line-clamp-1">{tc.title}</span>
                            <span className={`px-1.5 py-0.5 rounded text-xs ${SEVERITY_COLORS[tc.severity] || ''}`}>{tc.severity}</span>
                            {tc.automation_ready && <Zap className="w-3.5 h-3.5 text-emerald-400" />}
                          </button>
                          {isExpanded && (
                            <div className="border-t border-slate-700/50 p-4 bg-slate-900/30 space-y-3">
                              {tc.preconditions && (
                                <div><div className="text-xs font-medium text-slate-500 mb-1">Preconditions</div><div className="text-sm text-slate-300">{tc.preconditions}</div></div>
                              )}
                              {steps.length > 0 && (
                                <div><div className="text-xs font-medium text-slate-500 mb-1">Steps</div><ol className="list-decimal list-inside space-y-1">{steps.map((s: string, i: number) => <li key={i} className="text-sm text-slate-300">{s}</li>)}</ol></div>
                              )}
                              <div><div className="text-xs font-medium text-slate-500 mb-1">Expected Result</div><div className="text-sm text-emerald-300">{tc.expected_result}</div></div>
                              {tc.test_data && (
                                <div><div className="text-xs font-medium text-slate-500 mb-1">Test Data</div><div className="text-sm text-slate-300 font-mono bg-slate-800/50 px-2 py-1 rounded">{tc.test_data}</div></div>
                              )}
                              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-700/30">
                                {tags.map((tag: string, ti: number) => (
                                  <span key={ti} className="bg-slate-700/50 text-slate-400 px-2 py-0.5 rounded text-xs flex items-center gap-1"><Tag className="w-3 h-3" />{tag}</span>
                                ))}
                                <span className="text-xs bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded">{tc.coverage_type}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Coverage Gaps — persisted from generation (areas impractical to automate) */}
      {coverageGaps.length > 0 && (
        <div className="bg-slate-800/50 rounded-xl border border-amber-500/20 p-4">
          <h4 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-400" />
            {coverageGaps.length} Coverage Gap{coverageGaps.length !== 1 ? 's' : ''}
            <span className="text-xs text-slate-400 font-normal">Areas that may need manual / out-of-band testing</span>
          </h4>
          <div className="space-y-2 mt-3">
            {coverageGaps.map((gap: any, gi: number) => (
              <div key={gi} className="bg-slate-900/40 border border-amber-500/20 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    gap.severity === 'critical' || gap.severity === 'high' ? 'bg-red-500/20' : 'bg-amber-500/20'
                  }`}>
                    <Shield className={`w-4 h-4 ${RISK_COLORS[gap.severity] || 'text-amber-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-white">{gap.area}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${SEVERITY_COLORS[gap.severity] || ''}`}>{gap.severity}</span>
                    </div>
                    <div className="text-xs text-slate-400">{gap.description}</div>
                    {gap.suggestion && (
                      <div className="text-xs text-emerald-400 mt-2 flex items-center gap-1 bg-emerald-500/10 rounded-lg px-2.5 py-1.5">
                        <Lightbulb className="w-3 h-3 flex-shrink-0" />
                        <span>{gap.suggestion}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Generate Scripts & Create PR Modal                                 */
/* ------------------------------------------------------------------ */

type ScriptModalStep = 'configure' | 'generating' | 'success' | 'error';

function GenerateScriptsModal({
  requirementId,
  requirementTitle,
  testCaseCount,
  onClose,
}: {
  requirementId: number;
  requirementTitle: string;
  testCaseCount: number;
  onClose: () => void;
}) {
  const { activeProject } = useProject();
  const [step, setStep] = useState<ScriptModalStep>('configure');
  const [repos, setRepos] = useState<any[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string>('');
  const [baseUrl, setBaseUrl] = useState('http://localhost:3000');
  const [framework] = useState('playwright');
  const [outputDir, setOutputDir] = useState('tests/generated');
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);
  const [progressMsg, setProgressMsg] = useState('');

  useEffect(() => {
    (async () => {
      try {
        if (!activeProject?.id) { setLoadingRepos(false); return; }
        const res = await fetch(`/api/projects/${activeProject.id}/repositories`);
        if (res.ok) {
          const data = await res.json();
          const repoList = Array.isArray(data) ? data : (data.repositories || []);
          setRepos(repoList);
          if (repoList.length === 1) setSelectedRepoId(String(repoList[0].id));
        }
      } catch { /* ignore */ }
      setLoadingRepos(false);
    })();
  }, [activeProject?.id]);

  const handleGenerate = async () => {
    if (!selectedRepoId) { setError('Please select a repository'); return; }
    setStep('generating');
    setError('');
    setProgressMsg('Generating Playwright scripts from test cases...');
    try {
      await new Promise(r => setTimeout(r, 500));
      setProgressMsg('Creating scripts with AI...');
      const res = await fetch(`/api/test-coverage/requirements/${requirementId}/generate-scripts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repositoryId: parseInt(selectedRepoId, 10),
          projectId: activeProject?.id,
          framework,
          baseUrl,
          outputDir,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.details || 'Failed to generate scripts');
      setResult(data.data || data);
      setStep('success');
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      setStep('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-700/50 bg-slate-800/50">
          <div className="p-2 bg-emerald-500/20 rounded-lg"><Rocket className="w-5 h-5 text-emerald-400" /></div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-white">Generate Scripts & Create PR</h3>
            <p className="text-xs text-slate-400">{testCaseCount} test cases → Playwright scripts → GitHub PR</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-700/50 rounded-lg"><XCircle className="w-5 h-5 text-slate-400" /></button>
        </div>

        <div className="px-6 py-5">
          {step === 'configure' && (
            <div className="space-y-4">
              <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/30">
                <p className="text-sm text-white font-medium">{requirementTitle}</p>
                <p className="text-xs text-slate-400 mt-1">{testCaseCount} test cases will be converted to Playwright scripts</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Target Repository *</label>
                {loadingRepos ? (
                  <div className="flex items-center gap-2 text-slate-500 text-sm py-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading repos...</div>
                ) : repos.length === 0 ? (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                    <p className="text-xs text-amber-300">No repositories found.</p>
                    <a href="/projects" className="text-xs text-amber-400 underline mt-1 inline-block">Go to Projects →</a>
                  </div>
                ) : (
                  <select value={selectedRepoId} onChange={e => setSelectedRepoId(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-emerald-500/50 outline-none">
                    <option value="">Select a repository...</option>
                    {repos.map((r: any) => (
                      <option key={r.id} value={String(r.id)}>{r.name} {r.branch ? `(${r.branch})` : ''} — {r.url?.replace('https://github.com/', '')}</option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Application Base URL</label>
                <input type="text" value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="http://localhost:3000" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:ring-2 focus:ring-emerald-500/50 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Output Directory</label>
                <input type="text" value={outputDir} onChange={e => setOutputDir(e.target.value)} placeholder="tests/generated" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:ring-2 focus:ring-emerald-500/50 outline-none" />
              </div>
              <div className="flex items-center gap-2 justify-center py-2 text-xs text-slate-500">
                <span className="bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded">Test Cases</span>
                <ArrowRight className="w-3 h-3" />
                <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">AI Scripts</span>
                <ArrowRight className="w-3 h-3" />
                <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">GitHub PR</span>
              </div>
              {error && <p className="text-xs text-red-400">{error}</p>}
            </div>
          )}
          {step === 'generating' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-white">{progressMsg}</p>
                <p className="text-xs text-slate-400 mt-1">This may take 30-60 seconds...</p>
              </div>
            </div>
          )}
          {step === 'success' && result && (
            <div className="space-y-4">
              <div className="flex flex-col items-center py-4">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <h4 className="text-base font-semibold text-white">PR Created Successfully!</h4>
                <p className="text-xs text-slate-400 mt-1">{result.totalTests} test cases → {result.totalFiles} scripts → 1 Pull Request</p>
              </div>
              {result.github?.prUrl && (
                <a href={result.github.prUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-slate-800/80 border border-slate-700/50 hover:border-emerald-500/50 rounded-xl p-4 transition-all group">
                  <div className="p-2 bg-slate-700/50 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
                    <Github className="w-5 h-5 text-white group-hover:text-emerald-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">PR #{result.github.prNumber}</p>
                    <p className="text-xs text-slate-400 truncate">{result.github.branchName}</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-emerald-400" />
                </a>
              )}
              <div className="bg-slate-800/50 rounded-lg border border-slate-700/30 p-3">
                <h5 className="text-xs font-medium text-slate-400 mb-2">Generated Files</h5>
                <div className="space-y-1.5">
                  {(result.scripts || []).map((s: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <FileText className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-slate-300 font-mono truncate flex-1">{s.filePath}</span>
                      <span className="text-slate-500">{s.testCount} tests</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {step === 'error' && (
            <div className="flex flex-col items-center py-6 space-y-4">
              <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
              <div className="text-center">
                <h4 className="text-base font-semibold text-white">Generation Failed</h4>
                <p className="text-xs text-red-300 mt-2 max-w-sm">{error}</p>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-700/50 bg-slate-800/30 flex items-center justify-end gap-3">
          {step === 'configure' && (
            <>
              <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancel</button>
              <button onClick={handleGenerate} disabled={!selectedRepoId || repos.length === 0} className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-all">
                <Rocket className="w-4 h-4" /> Generate & Create PR
              </button>
            </>
          )}
          {step === 'generating' && <p className="text-xs text-slate-500">Please wait...</p>}
          {(step === 'success' || step === 'error') && (
            <button onClick={onClose} className="px-5 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-all">Close</button>
          )}
          {step === 'error' && (
            <button onClick={() => { setStep('configure'); setError(''); }} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-all">Try Again</button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stats Tab                                                          */
/* ------------------------------------------------------------------ */

function StatsTab() {
  const { activeProject } = useProject();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const headers: Record<string, string> = {};
    if (activeProject?.id) headers['x-project-id'] = String(activeProject.id);
    (async () => {
      try {
        const res = await fetch('/api/test-coverage/stats', { headers });
        const data = await res.json();
        setStats(data);
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [activeProject?.id]);

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 text-violet-400 animate-spin" /></div>;
  }

  if (!stats) return null;

  const coverageTypes = stats.coverageTypeBreakdown || {};
  const priorities = stats.priorityBreakdown || {};
  const totalCovTypes = Object.values(coverageTypes).reduce((a: number, b: any) => a + (Number(b) || 0), 0) || 1;
  const totalPriorities = Object.values(priorities).reduce((a: number, b: any) => a + (Number(b) || 0), 0) || 1;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Requirements', value: stats.totalRequirements, icon: FileText, color: 'text-violet-400 bg-violet-500/20' },
          { label: 'Scenarios', value: stats.totalScenarios, icon: ClipboardList, color: 'text-blue-400 bg-blue-500/20' },
          { label: 'Test Cases', value: stats.totalTestCases, icon: CheckCircle2, color: 'text-emerald-400 bg-emerald-500/20' },
          { label: 'Automation Ready', value: stats.automationReadyCount, icon: Zap, color: 'text-amber-400 bg-amber-500/20' },
        ].map((m, i) => (
          <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <div className={`w-8 h-8 rounded-lg ${m.color} flex items-center justify-center mb-3`}>
              <m.icon className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold text-white">{m.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{m.label}</div>
          </div>
        ))}
      </div>

      {Object.keys(coverageTypes).length > 0 && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Coverage Type Distribution</h3>
          <div className="space-y-2">
            {Object.entries(coverageTypes)
              .sort((a, b) => (Number(b[1]) || 0) - (Number(a[1]) || 0))
              .map(([type, count]) => {
                const pct = ((Number(count) || 0) / Number(totalCovTypes)) * 100;
                const opt = COVERAGE_OPTIONS.find(o => o.value === type);
                return (
                  <div key={type} className="flex items-center gap-3">
                    <span className="text-sm w-6 text-center">{opt?.icon || '📋'}</span>
                    <span className="text-sm text-slate-300 w-32 truncate">{opt?.label || type}</span>
                    <div className="flex-1 h-2 bg-slate-700/50 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-slate-400 w-8 text-right">{Number(count)}</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {Object.keys(priorities).length > 0 && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Priority Distribution</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {['P0', 'P1', 'P2', 'P3'].map(p => {
              const count = priorities[p] || 0;
              const pct = ((Number(count) || 0) / Number(totalPriorities)) * 100;
              return (
                <div key={p} className="bg-slate-900/50 rounded-lg p-3 text-center">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold border ${PRIORITY_COLORS[p]}`}>{p}</span>
                  <div className="text-xl font-bold text-white mt-2">{count}</div>
                  <div className="text-xs text-slate-500">{pct.toFixed(0)}%</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {stats.totalRequirements === 0 && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-8 text-center">
          <BarChart3 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No statistics available yet</p>
          <p className="text-xs text-slate-500 mt-1">Generate test cases to see statistics here</p>
        </div>
      )}
    </div>
  );
}
