'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useProject, useProjectHeaders } from '@/lib/project-context';
import { useWorkspaceHeaders, useProjectEnvironments } from '@/lib/workspace-context';
import { KnowledgeSelector } from '@/components/knowledge-selector';
import { IntelligenceScore as IntelligenceScoreComponent } from '@/components/intelligence-score';
import {
  Play,
  Loader2,
  Sparkles,
  CheckCircle2,
  XCircle,
  FileCode,
  Clock,
  Zap,
  AlertTriangle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  GitBranch,
  ExternalLink,
  Github,
  Cpu,
  Brain,
  BookOpen,
  X,
  Fingerprint,
  Database,
  RefreshCw,
  SlidersHorizontal,
  FileText,
  ListChecks,
  Target,
  Link2,
  ArrowRight,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import type { ProjectContext } from './scripts-client';
import type { ParsedTestCase } from './upload-test-cases';

interface ScriptGeneratorProps {
  projectContext: ProjectContext;
  onGenerated: () => void;
  prefillScenarios?: string[] | null;
  /**
   * Structured test cases from a CSV/Excel upload. When present these are sent
   * as an inline `testCases` array so the backend routes them through the
   * deterministic, grounded engine (real locators) instead of the ungrounded
   * LLM discovery fallback that flattened scenario strings triggered.
   */
  prefillTestCases?: ParsedTestCase[] | null;
  onPrefillConsumed?: () => void;
  /** Sprint 4 — deep link context from the Test Case Lab. */
  requirementId?: string | null;
  testCaseId?: string | null;
}

interface GenerationResult {
  success: boolean;
  data?: {
    id: number;
    url: string;
    filesGenerated: number;
    files: Array<{ path: string; size: number; type: string }>;
    testPlan: any;
    validationReport: any;
    // Honest, decomposed reliability from the backend. `executionReadiness` is
    // the weakest-link headline (code × grounding × coverage) and is what the UI
    // must show — NOT validationReport.overallScore (code-only, which reported a
    // misleading 100% while 0/14 locators were grounded). grounding/coverage are
    // null when they don't apply (e.g. a pure URL run with no predefined cases).
    reliability?: {
      executionReadiness: number;
      grounding: number | null;
      coverage: number | null;
      codeQuality: number;
    };
    stats: {
      totalTests: number;
      totalAssertions: number;
      tokensUsed: number;
      model: string;
    };
    generationTimeMs: number;
    errors: string[];
    intelligence?: {
      profileId?: number | null;
      crawlStrategy?: 'FAST_PATH' | 'SLOW_PATH';
      crawlTimeMs?: number;
      profileAge?: string;
      patternsDetected?: number;
      // True when a cached App Profile DOM powered this generation. Together
      // with profileId this is the truthful "App Profile Used" signal.
      profileCacheUsed?: boolean;
      generationSource?: string;
      testCaseId?: number | null;
      testCaseDataUsed?: boolean;
      folderDecision?: { testRoot?: string; targetDirectory?: string; fileName?: string; reason?: string };
    };
    // Sprint 4 — locator resolution report (element → locator + confidence).
    // `locators[]` carries the per-element grounding detail (Tier B) that powers
    // the Locator Grounding Report: ✓ grounded in the real crawl DOM vs ⚠ fell
    // back to a generic selector not found in the crawl.
    locatorReport?: {
      totalLocators: number;
      validatedCount: number;
      avgConfidence: number;
      todoCount: number;
      // App-Profile-grounding KPI (customer proof point): how many locators came
      // from the App Profile vs curated fallback vs AI, so the UI can show
      // "20 from App Profile · 2 healed by AI · 91% Repository Grounded · 9% AI".
      appProfileCount?: number;
      fallbackCount?: number;
      aiCount?: number;
      appProfilePct?: number;
      aiPct?: number;
      groundedPct?: number;
      provenanceSummary?: string;
      locators?: Array<{
        element: string;
        selector: string;
        confidence: number;
        source?: string;
        validated?: boolean;
        status?: string;
      }>;
    };
    // Sprint 4 — RTM auto-update result (requirement link + coverage delta)
    rtmUpdate?: {
      requirementId: string | null;
      linksCreated: string[];
      coverageBefore: number | null;
      coverageAfter: number | null;
      statusBefore: string | null;
      statusAfter: string | null;
    };
    // Sprint 4B — test case automation marking + requirement automation-coverage delta
    automationUpdate?: {
      testCaseId: number;
      isAutomated: boolean;
      scriptId: number;
      coverageBefore: { totalTestCases: number; automatedCount: number; automationPercentage: number } | null;
      coverageAfter: { totalTestCases: number; automatedCount: number; automationPercentage: number } | null;
    };
    // Phase 5: Intelligence Score — grounded% vs AI% transparency metric
    intelligenceScore?: {
      grounded: number;
      aiContribution: number;
      bySource: Record<string, number>;
      summary: string;
    };
    // Pipeline funnel + per-case trace on SUCCESS too (partial generation), plus
    // non-fatal warnings — so the UI can surface issues even when generation
    // otherwise succeeded (e.g. 8/12 cases emitted, unmapped steps).
    pipeline?: {
      inputTestCases: number;
      canonicalized: number;
      parsed: number;
      grounded: number;
      generatedScripts: number;
      cases?: Array<{
        id?: number | string | null;
        title?: string | null;
        reachedStage?: string;
        status?: string;
        reason?: string;
        stepCount?: number;
      }>;
    };
    testDataWarnings?: string[];
    unmappedSteps?: Array<{ testCaseId?: number; step: string }>;
  };
  error?: string;
  // Honest-failure metadata for the 422 responses. When a requirement/test-case
  // generation cannot produce grounded scripts the backend refuses to emit
  // generic ones and returns an actionable code + nextAction instead.
  code?: string;
  nextAction?: 'GENERATE_TEST_CASES' | 'REVIEW_TEST_CASES' | string;
  requirementId?: string | null;
  intendedTestCaseCount?: number;
  resolvedTestCaseCount?: number;
  // Per-case failure reasons surfaced by the honest 422 (review issue: the real
  // reason each case failed was previously only visible in the raw API JSON, not
  // the UI). Rendered in the diagnostics panel below the error.
  caseErrors?: string[];
  // Pipeline funnel + per-case trace — pinpoints WHERE the count dropped to zero
  // (canonicalization → parsing → grounding → emit). Returned by the backend on
  // DETERMINISTIC_GENERATION_EMPTY so "nothing generated" is localizable in the UI.
  pipeline?: {
    inputTestCases: number;
    canonicalized: number;
    parsed: number;
    grounded: number;
    generatedScripts: number;
    cases?: Array<{
      id?: number | string | null;
      title?: string | null;
      reachedStage?: string;
      status?: string;
      reason?: string;
      stepCount?: number;
    }>;
  };
}

/** Sprint 4 — requirement + test case context loaded from a deep link. */
interface RequirementInfo {
  id: string;
  requirement_id?: string;
  title: string;
  description?: string | null;
  acceptance_criteria?: string | null;
  priority?: string | null;
  category?: string | null;
  status?: string | null;
  coverage_percentage?: number | null;
}

interface TestCaseInfo {
  id: number;
  title?: string;
  description?: string | null;
  preconditions?: string | null;
  steps?: any;
  expected_result?: string | null;
  test_data?: string | null;
  priority?: string | null;
  requirement_id?: string | null;
  requirement?: RequirementInfo | null;
}

/** Sprint 4 — requirement option for the Script-Gen requirement picker. */
interface RequirementOption {
  id: string;
  requirement_id?: string | null;
  title: string;
  priority?: string | null;
  category?: string | null;
  status?: string | null;
  coverage_percentage?: number | null;
  test_case_count: number;
  automated_count: number;
}

/** Sprint 4 — requirement validation (has-test-cases check) result. */
interface RequirementValidation {
  requirementId: string;
  requirementCode?: string | null;
  title: string;
  hasTestCases: boolean;
  testCaseCount: number;
  automatedCount: number;
  notAutomatedCount: number;
  inProgressCount: number;
}

interface PushResult {
  success: boolean;
  data?: {
    scriptId: number;
    repoUrl: string;
    branchName: string;
    branchUrl: string;
    commitSha: string;
    filesCount: number;
    pullRequest: { prUrl: string; prNumber: number } | null;
    message?: string;
  };
  error?: string;
}

const TEST_TYPE_OPTIONS = [
  { value: 'smoke', label: 'Smoke Tests', description: 'Quick validation of critical paths' },
  { value: 'functional', label: 'Functional Tests', description: 'Detailed feature testing' },
  { value: 'authentication', label: 'Auth Tests', description: 'Login/logout/session flows' },
  { value: 'form_validation', label: 'Form Validation', description: 'Input validation & error states' },
  { value: 'navigation', label: 'Navigation Tests', description: 'Page routing & links' },
];

/**
 * Build a readable, plain-English test scenario from a structured test case so
 * the generator textarea is pre-populated when arriving from the Test Case Lab.
 */
function buildScenarioFromTestCase(tc: TestCaseInfo): string {
  const lines: string[] = [];
  if (tc.title) lines.push(tc.title.trim());
  // Include the test case description so the generator has the full intent.
  if (tc.description && tc.description.trim()) lines.push('', tc.description.trim());

  // Normalise steps (array of strings/objects, or a JSON-encoded / newline string).
  let steps: any = tc.steps;
  if (typeof steps === 'string') {
    try { steps = JSON.parse(steps); } catch { /* keep as raw string */ }
  }
  const stepTexts: string[] = [];
  if (Array.isArray(steps)) {
    for (const s of steps) {
      if (typeof s === 'string') { if (s.trim()) stepTexts.push(s.trim()); }
      else if (s && typeof s === 'object') {
        const t = s.action ?? s.step ?? s.description ?? s.text ?? s.element ?? s.name;
        if (typeof t === 'string' && t.trim()) stepTexts.push(t.trim());
      }
    }
  } else if (typeof steps === 'string' && steps.trim()) {
    for (const ln of steps.split(/\r?\n/)) { if (ln.trim()) stepTexts.push(ln.trim()); }
  }

  if (tc.preconditions) lines.push('', `Preconditions: ${tc.preconditions.trim()}`);
  if (stepTexts.length > 0) {
    lines.push('', 'Steps:');
    stepTexts.forEach((s, i) => lines.push(`${i + 1}. ${s.replace(/^\d+[.)]\s*/, '')}`));
  }
  if (tc.expected_result) lines.push('', `Expected result: ${tc.expected_result.trim()}`);
  if (tc.test_data) lines.push('', `Test data: ${tc.test_data.trim()}`);
  return lines.join('\n').trim();
}

/**
 * Build a readable test scenario from a requirement so the generator textarea
 * is pre-populated when the deep link carries only a `requirement_id`
 * (no specific test case). Uses the requirement's title, description and
 * acceptance criteria.
 */
function buildScenarioFromRequirement(req: RequirementInfo): string {
  const lines: string[] = [];
  if (req.title) lines.push(req.title.trim());
  if (req.description && req.description.trim()) lines.push('', req.description.trim());

  if (req.acceptance_criteria && req.acceptance_criteria.trim()) {
    const ac = req.acceptance_criteria.trim();
    const acLines = ac.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    lines.push('', 'Acceptance criteria:');
    if (acLines.length > 1) {
      acLines.forEach((l, i) => lines.push(`${i + 1}. ${l.replace(/^\d+[.)]\s*/, '').replace(/^[-*]\s*/, '')}`));
    } else {
      lines.push(ac);
    }
  }
  return lines.join('\n').trim();
}

/* -------------------------------------------------------------------------- */
/*  Intelligence Source card — one consistent, toggleable card per source.     */
/*  Mirrors the Test Case Lab pattern: a single section where each source's    */
/*  toggle AND its configuration live together (no duplicate "select in two    */
/*  places"). The configurator (children) is revealed inline when enabled.     */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/*  Application Profile — detection & matching                                 */
/*  Mirrors the Test Case Lab pattern (test-coverage-client.tsx): we fetch the */
/*  project's crawled profiles via the LIST endpoint and match one to the      */
/*  target URL, rather than relying on the status endpoint (whose response     */
/*  shape differs from what the old code parsed — the source of the            */
/*  "No profile yet" bug).                                                     */
/* -------------------------------------------------------------------------- */

/** Normalised shape used by the UI (mapped from the backend ApplicationProfile row). */
interface AppProfile {
  id: string;
  name: string;
  baseUrl: string;
  crawledAt: string | null;
  elementCount: number;
  pageCount: number;
  formCount: number;
  status: string;
  source?: string;
  isLatest: boolean;
}

/** Map a raw backend profile row → the normalised UI shape. */
function mapProfile(raw: any): AppProfile {
  return {
    id: String(raw.id),
    name: raw.name || raw.base_url || 'Crawled profile',
    baseUrl: raw.base_url || '',
    crawledAt: raw.crawled_at || raw.updated_at || null,
    elementCount: Number(raw.total_elements ?? 0),
    pageCount: Number(raw.page_count ?? 0),
    formCount: Number(raw.total_forms ?? 0),
    status: raw.status || 'fresh',
    source: raw.source,
    isLatest: false,
  };
}

/** Human-friendly "2h ago" / "3d ago" relative time. */
function relativeTime(iso: string | null): string {
  if (!iso) return 'unknown time';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'unknown time';
  const diff = Date.now() - then;
  if (diff < 0) return 'just now';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

/** Is a profile considered outdated? (expired status, or crawled > 30 days ago) */
function isProfileOutdated(p: AppProfile): boolean {
  if (p.status === 'expired') return true;
  if (!p.crawledAt) return false;
  const ageDays = (Date.now() - new Date(p.crawledAt).getTime()) / 86400000;
  return ageDays > 30;
}

/**
 * Normalise a URL for matching — mirrors the backend `normalizeUrl`
 * (profile-service.ts): `${protocol}//${hostname}` + pathname with trailing
 * slashes stripped (or '/'), lowercased, default ports removed. Used to match a
 * crawled profile to the target URL exactly the way the backend resolves it.
 */
function normalizeUrlForMatch(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let value = raw.trim();
  if (!value) return null;
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  try {
    const u = new URL(value);
    const protocol = u.protocol.toLowerCase();
    const hostname = u.hostname.toLowerCase();
    // Drop default ports (80 for http, 443 for https).
    const isDefaultPort =
      !u.port || (protocol === 'http:' && u.port === '80') || (protocol === 'https:' && u.port === '443');
    const portPart = isDefaultPort ? '' : `:${u.port}`;
    let path = u.pathname || '/';
    path = path.replace(/\/+$/, '');
    if (!path) path = '/';
    return `${protocol}//${hostname}${portPart}${path}`.toLowerCase();
  } catch {
    return value.replace(/\/+$/, '').toLowerCase() || null;
  }
}

/** Same-origin (protocol + host) comparison for fallback matching/display. */
function sameOrigin(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  try {
    const ua = new URL(a.startsWith('http') ? a : `https://${a}`);
    const ub = new URL(b.startsWith('http') ? b : `https://${b}`);
    return ua.protocol.toLowerCase() === ub.protocol.toLowerCase() && ua.host.toLowerCase() === ub.host.toLowerCase();
  } catch {
    return false;
  }
}

const INTEL_ACCENTS = {
  emerald: { border: 'border-emerald-500/30', box: 'bg-emerald-500/10', icon: 'text-emerald-400', toggle: 'bg-emerald-500 border-emerald-500' },
  violet: { border: 'border-violet-500/30', box: 'bg-violet-500/10', icon: 'text-violet-400', toggle: 'bg-violet-500 border-violet-500' },
  amber: { border: 'border-amber-500/30', box: 'bg-amber-500/10', icon: 'text-amber-400', toggle: 'bg-amber-500 border-amber-500' },
} as const;

function IntelSourceCard({
  accent, icon: Icon, title, description, badge, enabled, onToggle, statusLabel, disabled, children,
}: {
  accent: keyof typeof INTEL_ACCENTS;
  icon: LucideIcon;
  title: string;
  description: string;
  badge?: string;
  enabled: boolean;
  onToggle: () => void;
  statusLabel?: string;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  const a = INTEL_ACCENTS[accent];
  return (
    <div className={`rounded-xl border transition-all ${enabled ? `bg-[#1a1f2e] ${a.border}` : 'bg-[#0c1222] border-[#1e293b]'} ${disabled ? 'opacity-60' : ''}`}>
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-pressed={enabled}
        className="w-full flex items-center gap-3 px-4 py-3 text-left disabled:cursor-not-allowed"
      >
        <span className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition-all ${enabled ? a.toggle : 'border-slate-600 bg-slate-800'}`}>
          {enabled && <CheckCircle2 size={13} className="text-white" />}
        </span>
        <span className={`w-8 h-8 rounded-lg ${a.box} flex items-center justify-center flex-shrink-0`}>
          <Icon size={16} className={a.icon} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-slate-200">{title}</span>
            {badge && <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">{badge}</span>}
            {enabled && statusLabel && (
              <span className="text-[10px] inline-flex items-center gap-1 text-emerald-400">
                <CheckCircle2 size={11} /> {statusLabel}
              </span>
            )}
          </span>
          <span className="block text-xs text-slate-500 mt-0.5 leading-snug">{description}</span>
        </span>
      </button>
      {enabled && children && <div className="px-4 pb-3 pt-1">{children}</div>}
    </div>
  );
}

export function ScriptGenerator({ projectContext, onGenerated, prefillScenarios, prefillTestCases, onPrefillConsumed, requirementId, testCaseId }: ScriptGeneratorProps) {
  const { activeProject } = useProject();
  const projectHeaders = useProjectHeaders();
  // Full workspace headers (project + environment + sprint) — sent on record
  // creation so new scripts are stamped with the active environment / sprint.
  const workspaceHeaders = useWorkspaceHeaders();
  // Active environment — its base_url auto-populates the target URL (Sprint 4).
  const { activeEnvironment } = useProjectEnvironments();
  const [scenario, setScenario] = useState('');
  // Structured test cases carried from a CSV/Excel upload. When set, generation
  // sends them inline so the backend uses the deterministic, grounded engine.
  const [uploadedTestCases, setUploadedTestCases] = useState<ParsedTestCase[] | null>(null);
  const [targetUrl, setTargetUrl] = useState(projectContext.appUrl || '');
  const [testTypes, setTestTypes] = useState<string[]>(['smoke', 'functional']);
  const [includeNegative, setIncludeNegative] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);

  // Repo intelligence state
  const [selectedRepoId, setSelectedRepoId] = useState('');
  const [repoContextLoaded, setRepoContextLoaded] = useState(false);
  const [repoContextSummary, setRepoContextSummary] = useState<{
    framework?: string; testPattern?: string; locatorStrategy?: string;
    helpers?: number; pageObjects?: number; flows?: number;
  } | null>(null);

  // GitHub push state
  const [showPushDialog, setShowPushDialog] = useState(false);
  const [repos, setRepos] = useState<Array<{ id: string; name: string; url: string; branch: string }>>([]);
  const [pushRepoUrl, setPushRepoUrl] = useState('');
  const [pushBranch, setPushBranch] = useState('');
  const [createPR, setCreatePR] = useState(true);
  const [pushing, setPushing] = useState(false);
  const [pushResult, setPushResult] = useState<PushResult | null>(null);

  // GitHub connection state (centralized via Tools page)
  const [ghConnected, setGhConnected] = useState<boolean | null>(null); // null = loading
  const [ghUser, setGhUser] = useState<{ login: string; name: string | null; avatarUrl: string } | null>(null);
  const [ghRepos, setGhRepos] = useState<Array<{ fullName: string; name: string; owner: string; defaultBranch: string; private: boolean }>>([]);
  const [ghReposLoading, setGhReposLoading] = useState(false);
  const [selectedGhRepo, setSelectedGhRepo] = useState('');
  const [prTitle, setPrTitle] = useState('');
  const [prBranch, setPrBranch] = useState('');
  const [showPrModal, setShowPrModal] = useState(false);
  const [creatingPr, setCreatingPr] = useState(false);
  const [prResult, setPrResult] = useState<{ success: boolean; prUrl?: string; prNumber?: number; error?: string } | null>(null);

  // App Knowledge state
  const [selectedKnowledgeIds, setSelectedKnowledgeIds] = useState<number[]>([]);

  // Application Intelligence state — fetched from the LIST endpoint (same as the
  // Test Case Lab) and matched to the target URL. The old code read the status
  // endpoint with the wrong response shape, so a profile was never detected.
  const [appProfiles, setAppProfiles] = useState<AppProfile[]>([]);
  const [profileChecking, setProfileChecking] = useState(false);
  // When multiple same-origin profiles exist, the user can pick one ('' = auto).
  const [selectedProfileId, setSelectedProfileId] = useState('');

  // ── Sprint 4: Requirement → Test Case context (deep link from Test Case Lab) ──
  const [requirementInfo, setRequirementInfo] = useState<RequirementInfo | null>(null);
  const [testCaseInfo, setTestCaseInfo] = useState<TestCaseInfo | null>(null);
  const [loadingContext, setLoadingContext] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);

  // Intelligence source toggles — which sources to fuse into generation.
  const [useRepoIntelligence, setUseRepoIntelligence] = useState(true);
  const [useAppProfile, setUseAppProfile] = useState(true);
  const [useAppKnowledge, setUseAppKnowledge] = useState(true);

  // ── Application Profile matching ──
  // The URL we generate against (explicit override, else environment/project URL).
  const resolvedTargetUrl = targetUrl || projectContext.appUrl || '';

  // Profiles whose origin matches the target URL — candidates for this run. The
  // backend resolves the profile by URL (decideCrawlStrategy), so we surface the
  // same set here. Sorted newest-first; the freshest is flagged isLatest.
  const originMatches = useMemo(() => {
    const normTarget = normalizeUrlForMatch(resolvedTargetUrl);
    if (!normTarget) return [] as AppProfile[];
    const matches = appProfiles.filter((p) => sameOrigin(p.baseUrl, resolvedTargetUrl));
    return matches;
  }, [appProfiles, resolvedTargetUrl]);

  // The profile that will actually be used: exact normalized-URL match preferred
  // (this is what the backend would reuse), else the user's explicit pick, else
  // the freshest same-origin profile.
  const matchedProfile = useMemo<AppProfile | null>(() => {
    if (originMatches.length === 0) return null;
    const normTarget = normalizeUrlForMatch(resolvedTargetUrl);
    if (selectedProfileId) {
      const picked = originMatches.find((p) => p.id === selectedProfileId);
      if (picked) return picked;
    }
    // Prefer an exact normalized-URL (origin + path) match — what the backend uses.
    const exact = originMatches.find((p) => normalizeUrlForMatch(p.baseUrl) === normTarget);
    if (exact) return exact;
    // Otherwise fall back to the freshest same-origin profile.
    return originMatches.find((p) => p.isLatest) || originMatches[0];
  }, [originMatches, resolvedTargetUrl, selectedProfileId]);

  // Whether the matched profile is an exact URL match (vs. same-origin fallback).
  const matchedIsExact = useMemo(() => {
    if (!matchedProfile) return false;
    return normalizeUrlForMatch(matchedProfile.baseUrl) === normalizeUrlForMatch(resolvedTargetUrl);
  }, [matchedProfile, resolvedTargetUrl]);

  // ── Sprint 4: Requirement picker (drives validation + test-case loading) ──
  const [requirements, setRequirements] = useState<RequirementOption[]>([]);
  const [loadingRequirements, setLoadingRequirements] = useState(false);
  const [selectedReqId, setSelectedReqId] = useState<string>(requirementId || '');
  const [reqValidation, setReqValidation] = useState<RequirementValidation | null>(null);
  const [validatingReq, setValidatingReq] = useState(false);
  const [reqTestCases, setReqTestCases] = useState<Array<{ id: number; title: string; priority?: string; automation_status?: string; script_count?: number }>>([]);
  const [showTestCasePicker, setShowTestCasePicker] = useState(false);
  const [loadingTestCase, setLoadingTestCase] = useState(false);

  // Sprint 4 — adopt the deep-link requirement into the picker.
  // The parent reads the deep link (`/scripts?requirement_id=…`) inside a mount
  // effect, so `requirementId` is null on ScriptGenerator's first render and the
  // `useState(requirementId || '')` seed misses it. Without this sync the
  // dropdown stays on "No requirement", the requirement's test cases never load,
  // and handleGenerate omits requirementId (it gates on selectedReqId). Adopt the
  // id once it arrives, but never clobber a manual dropdown change the user made.
  useEffect(() => {
    if (requirementId && !selectedReqId) setSelectedReqId(requirementId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requirementId]);

  // Fetch the requirement list (with test-case counts) for the picker.
  // GET /api/requirements already returns test_case_count / automated_count.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingRequirements(true);
      try {
        const res = await fetch('/api/requirements', { headers: { ...projectHeaders } });
        const data = await res.json();
        if (cancelled) return;
        const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
        if (res.ok && Array.isArray(list)) {
          setRequirements(list.map((r: any) => ({
            id: r.id,
            requirement_id: r.requirement_id ?? r.requirementId ?? null,
            title: r.title,
            priority: r.priority ?? null,
            category: r.category ?? null,
            status: r.status ?? null,
            coverage_percentage: r.coverage_percentage ?? null,
            test_case_count: Number(r.test_case_count ?? 0),
            automated_count: Number(r.automated_count ?? 0),
          })));
        }
      } catch { /* non-fatal — picker simply stays empty */ }
      finally { if (!cancelled) setLoadingRequirements(false); }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProject?.id]);

  // When a requirement is selected, load its test cases (GET /:id/test-cases)
  // and derive the has-test-cases validation so we can warn on empty and let
  // the user optionally load a test case into the form.
  useEffect(() => {
    let cancelled = false;
    setShowTestCasePicker(false);
    if (!selectedReqId) { setReqValidation(null); setReqTestCases([]); return; }
    const selected = requirements.find((r) => r.id === selectedReqId);
    (async () => {
      setValidatingReq(true);
      try {
        const res = await fetch(`/api/requirements/${selectedReqId}/test-cases`, { headers: { ...projectHeaders } });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        const list: any[] = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
        const tcs = list.map((tc: any) => ({
          id: Number(tc.id),
          title: tc.title,
          priority: tc.priority ?? undefined,
          automation_status: tc.automation_status
            ?? (tc.is_automated ? 'automated' : 'not_automated'),
          script_count: Number(tc.script_count ?? 0),
        }));
        setReqTestCases(tcs);
        const automatedCount = tcs.filter((t) => t.automation_status === 'automated').length;
        const inProgressCount = tcs.filter((t) => t.automation_status === 'automation_in_progress').length;
        setReqValidation({
          requirementId: selectedReqId,
          requirementCode: selected?.requirement_id ?? null,
          title: selected?.title ?? '',
          hasTestCases: tcs.length > 0,
          testCaseCount: tcs.length,
          automatedCount,
          notAutomatedCount: tcs.length - automatedCount - inProgressCount,
          inProgressCount,
        });
      } catch {
        if (!cancelled) { setReqValidation(null); setReqTestCases([]); }
      } finally {
        if (!cancelled) setValidatingReq(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedReqId]);

  /** Load a specific test case into the form (scenario + requirement context). */
  const loadTestCaseIntoForm = useCallback(async (tcId: number) => {
    setLoadingTestCase(true);
    setContextError(null);
    try {
      const res = await fetch(`/api/test-cases/${tcId}`, { headers: { ...projectHeaders } });
      const data = await res.json();
      if (res.ok && data?.success && data.data) {
        const tc: TestCaseInfo = data.data;
        setTestCaseInfo(tc);
        if (tc.requirement) setRequirementInfo(tc.requirement);
        const built = buildScenarioFromTestCase(tc);
        if (built) setScenario(built);
        setShowTestCasePicker(false);
      } else {
        setContextError(data?.error || 'Could not load the selected test case.');
      }
    } catch {
      setContextError('Failed to load the selected test case.');
    } finally {
      setLoadingTestCase(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectHeaders]);

  // ── Sprint 4: Load Requirement + Test Case context from the deep link ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!testCaseId && !requirementId) return;
      setLoadingContext(true);
      setContextError(null);
      try {
        if (testCaseId) {
          const res = await fetch(`/api/test-cases/${testCaseId}`, { headers: { ...projectHeaders } });
          const data = await res.json();
          if (cancelled) return;
          if (res.ok && data?.success && data.data) {
            const tc: TestCaseInfo = data.data;
            setTestCaseInfo(tc);
            if (tc.requirement) setRequirementInfo(tc.requirement);
            // Pre-populate the scenario textarea from the structured test case.
            const built = buildScenarioFromTestCase(tc);
            if (built) setScenario(built);
          } else {
            setContextError(data?.error || 'Could not load the linked test case.');
          }
        }
        // If only a requirement id was provided (no test case), fetch it for the
        // banner AND pre-populate the scenario textarea from the requirement.
        if (!testCaseId && requirementId) {
          const res = await fetch(`/api/requirements/${requirementId}`, { headers: { ...projectHeaders } });
          const data = await res.json();
          if (cancelled) return;
          if (res.ok && (data?.data || data?.success)) {
            const req: RequirementInfo = data.data || data;
            setRequirementInfo(req);
            // Pre-populate the scenario from the requirement (Issue #1):
            // requirement-only deep links previously left the textarea empty.
            const built = buildScenarioFromRequirement(req);
            if (built) setScenario(built);
          }
        }
      } catch {
        if (!cancelled) setContextError('Failed to load requirement / test case context.');
      } finally {
        if (!cancelled) setLoadingContext(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testCaseId, requirementId]);

  // Sprint 4 — auto-populate the target URL from the active environment's
  // base_url. The project appUrl wins if set; otherwise fall back to the
  // environment. Only fills when the field is still empty (never clobbers
  // a URL the user typed).
  useEffect(() => {
    if (!targetUrl && activeEnvironment?.base_url) {
      setTargetUrl(activeEnvironment.base_url);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEnvironment?.base_url]);

  // Auto-fill from CSV/Excel upload. Capture BOTH the readable scenario text
  // (for the textarea preview) AND the structured test cases (sent inline so
  // the backend uses the deterministic, grounded engine — not the LLM fallback).
  useEffect(() => {
    if (prefillTestCases && prefillTestCases.length > 0) {
      setUploadedTestCases(prefillTestCases);
    }
    if (prefillScenarios && prefillScenarios.length > 0) {
      const combined = prefillScenarios.map((s, i) => `${i + 1}. ${s}`).join('\n\n');
      setScenario(combined);
    }
    if ((prefillTestCases && prefillTestCases.length > 0) || (prefillScenarios && prefillScenarios.length > 0)) {
      onPrefillConsumed?.();
    }
  }, [prefillScenarios, prefillTestCases, onPrefillConsumed]);

  // Auto-scroll target: the results panel rendered after generation completes.
  const resultsRef = useRef<HTMLDivElement>(null);
  // When a generation result (success OR error) lands, smoothly scroll it into
  // view so the user immediately sees the outcome without manual scrolling.
  useEffect(() => {
    if (!generating && result) {
      // Wait one frame for the results DOM to mount before scrolling.
      const id = window.setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      return () => window.clearTimeout(id);
    }
  }, [result, generating]);

  // Fetch repos for the dropdown (project-scoped)
  const fetchingReposRef = useRef(false);
  const fetchRepos = useCallback(async () => {
    if (fetchingReposRef.current || !activeProject?.id) return;
    fetchingReposRef.current = true;
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/repositories`);
      if (!res.ok) return;
      const data = await res.json();
      const repoList = Array.isArray(data) ? data : (data.repositories || []);
      setRepos(repoList);
      if (repoList.length > 0 && !pushRepoUrl) {
        setPushRepoUrl(repoList[0].url);
      }
    } catch { /* backend may be unavailable */ }
    finally { fetchingReposRef.current = false; }
  }, [pushRepoUrl, activeProject?.id]);

  useEffect(() => {
    fetchRepos();
  }, [fetchRepos]);

  // Clear selected knowledge when project changes
  useEffect(() => {
    setSelectedKnowledgeIds([]);
  }, [activeProject?.id]);

  // Check GitHub connection status on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/github/status');
        const data = await res.json();
        if (data.success && data.data) {
          setGhConnected(data.data.connected);
          if (data.data.user) {
            setGhUser(data.data.user);
          }
        } else {
          setGhConnected(false);
        }
      } catch {
        setGhConnected(false);
      }
    })();
  }, []);

  // Fetch the project's crawled application profiles (same LIST endpoint as the
  // Test Case Lab) and keep them in state. We match one to the target URL with a
  // useMemo (matchedProfile). This replaces the old status-endpoint fetch whose
  // response shape was mis-parsed (`data.exists` / `data.profile` never existed),
  // which is why an existing profile always showed as "No profile yet".
  useEffect(() => {
    setSelectedProfileId('');
    if (!activeProject?.id) { setAppProfiles([]); return; }
    let cancelled = false;
    (async () => {
      setProfileChecking(true);
      try {
        const headers: Record<string, string> = { 'x-project-id': String(activeProject.id) };
        const res = await fetch('/api/intelligence/profiles?limit=50', { headers });
        if (res.ok) {
          const json = await res.json();
          const rows: any[] = json?.data || json?.profiles || [];
          const mapped = rows.map(mapProfile);
          // Sort newest-first and flag the freshest crawl.
          mapped.sort((a, b) => new Date(b.crawledAt || 0).getTime() - new Date(a.crawledAt || 0).getTime());
          if (mapped[0]) mapped[0].isLatest = true;
          if (!cancelled) setAppProfiles(mapped);
        } else if (!cancelled) {
          setAppProfiles([]);
        }
      } catch {
        if (!cancelled) setAppProfiles([]);
      } finally {
        if (!cancelled) setProfileChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeProject?.id]);

  // Fetch GitHub repos when PR modal opens
  const fetchGhRepos = useCallback(async () => {
    if (!ghConnected) return;
    setGhReposLoading(true);
    try {
      const res = await fetch('/api/github/repos?per_page=50&sort=pushed');
      const data = await res.json();
      if (data.success && data.data) {
        setGhRepos(data.data.map((r: any) => ({
          fullName: r.fullName,
          name: r.name,
          owner: r.owner,
          defaultBranch: r.defaultBranch,
          private: r.private,
        })));
      }
    } catch { /* silent */ }
    setGhReposLoading(false);
  }, [ghConnected]);

  // Create PR handler
  const handleCreatePR = async () => {
    if (!result?.data?.id || !selectedGhRepo) return;
    setCreatingPr(true);
    setPrResult(null);

    const [owner, repo] = selectedGhRepo.split('/');
    try {
      const res = await fetch('/api/github/create-pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoOwner: owner,
          repoName: repo,
          branchName: prBranch || `levelup/tests-${result.data.id}-${Date.now()}`,
          title: prTitle || `🧪 LevelUp: AI-Generated Test Scripts (#${result.data.id})`,
          body: [
            '## 🤖 AI-Generated Test Scripts',
            '',
            `**Target URL:** ${result.data.url}`,
            `**Files Generated:** ${result.data.filesGenerated}`,
            `**Generation Time:** ${(result.data.generationTimeMs / 1000).toFixed(1)}s`,
            '',
            '### Generated Files',
            ...(result.data.files?.map((f: any) => `- \`${f.path}\` (${f.type})`) || []),
            '',
            '---',
            '*Generated by [LevelUp AI QA](https://leveluptesting.in)*',
          ].join('\n'),
          scriptId: result.data.id,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setPrResult({
          success: true,
          prUrl: data.data.prUrl,
          prNumber: data.data.prNumber,
        });
      } else {
        setPrResult({ success: false, error: data.error || 'Failed to create PR' });
      }
    } catch {
      setPrResult({ success: false, error: 'Network error — backend may be unavailable' });
    }
    setCreatingPr(false);
  };



  // Load repo intelligence when repo selected
  useEffect(() => {
    if (!selectedRepoId) {
      setRepoContextLoaded(false);
      setRepoContextSummary(null);
      return;
    }
    (async () => {
      try {
        const repoHeaders: Record<string, string> = {};
        if (activeProject?.id) repoHeaders['x-project-id'] = String(activeProject.id);
        const res = await fetch(`/api/repo-intelligence/${encodeURIComponent(selectedRepoId)}`, { headers: repoHeaders });
        const data = await res.json();
        if (data.success && data.profile) {
          const p = data.profile;
          setRepoContextSummary({
            framework: p.framework,
            testPattern: p.testPattern,
            locatorStrategy: p.locatorStrategy,
            helpers: p.helperFunctions?.length || 0,
            pageObjects: p.pageObjects?.length || 0,
            flows: p.businessFlows?.length || 0,
          });
          setRepoContextLoaded(true);
        } else {
          setRepoContextLoaded(false);
          setRepoContextSummary(null);
        }
      } catch {
        setRepoContextLoaded(false);
        setRepoContextSummary(null);
      }
    })();
  }, [selectedRepoId]);

  const toggleTestType = (type: string) => {
    setTestTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  // ── Requirement-based mode detection ──────────────────────────────────────
  // When generation is grounded in real test cases (a requirement chosen in the
  // picker, a loaded test case, or a deep link from Test Case Lab), the actual
  // test cases — not free-form options — drive what is generated. In that mode
  // we hide "App Knowledge" and the "Advanced Options" (test types / negative
  // cases) so the UI stays focused on the App Profile + Repo Intelligence flow
  // that produces real, executable scripts. (Script Gen quality initiative.)
  const isRequirementBased = Boolean(
    selectedReqId || testCaseInfo?.id || testCaseId || requirementId,
  );

  const handleGenerate = async () => {
    // Effective test-case id: an explicitly loaded test case (from the picker)
    // wins, then the deep-link prop. Drives generationSource + auto-marking.
    const effectiveTestCaseId = testCaseInfo?.id ?? testCaseId ?? null;

    // Structured test cases from a CSV/Excel upload. When present they are sent
    // inline so the backend routes them into the deterministic, grounded engine.
    const hasUploadedTestCases = Boolean(uploadedTestCases && uploadedTestCases.length > 0);

    // Requirement-based generation derives everything from the requirement's
    // linked test cases (deterministic backend path), so a free-text scenario is
    // optional. Only block when there's nothing to generate from at all.
    if (!scenario.trim() && !selectedReqId && effectiveTestCaseId == null && !hasUploadedTestCases) return;

    // The backend requires a non-empty `scenario` field. For requirement-based
    // generation (where the textarea may be empty) fall back to a concise label
    // derived from the selected requirement — the deterministic engine ignores
    // this text and uses each test case's own steps/data.
    const selectedReq = requirements.find((r) => r.id === selectedReqId);
    const effectiveScenario = scenario.trim()
      || (selectedReqId
        ? `Automate requirement ${selectedReq?.requirement_id || selectedReqId}${selectedReq?.title ? `: ${selectedReq.title}` : ''}`
        : '');

    // Resolve the target URL: explicit input → project appUrl → active
    // environment base_url. The backend can also auto-resolve from the
    // environment, so an empty URL is no longer a hard blocker.
    const resolvedUrl = targetUrl || projectContext.appUrl || activeEnvironment?.base_url || '';

    setGenerating(true);
    setResult(null);
    setPushResult(null);

    try {
      const res = await fetch('/api/scripts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...workspaceHeaders },
        body: JSON.stringify({
          projectContextId: projectContext.id,
          // Omit when empty so the backend resolves from the active environment.
          ...(resolvedUrl ? { url: resolvedUrl } : {}),
          scenario: effectiveScenario,
          testTypes,
          includeNegativeTests: includeNegative,
          // Intelligence sources are gated by the App Profile / Repo / Knowledge
          // toggles in the consolidated Intelligence Sources section. Turning the
          // App Profile source OFF forces a fresh crawl instead of reusing cache.
          ...(!useAppProfile ? { forceFreshCrawl: true } : {}),
          ...(useRepoIntelligence && selectedRepoId ? { repoId: selectedRepoId } : {}),
          ...(useAppKnowledge && selectedKnowledgeIds.length > 0 ? { knowledgeItemIds: selectedKnowledgeIds } : {}),
          // ── Sprint 4: Requirement → Test Case → Script context ──
          // Effective ids: deep-link prop, an explicitly loaded test case, or the
          // requirement chosen in the picker.
          ...(effectiveTestCaseId != null ? { testCaseId: Number(effectiveTestCaseId) } : {}),
          ...(selectedReqId ? { requirementId: selectedReqId } : {}),
          // Inline structured test cases from a CSV/Excel upload — the backend
          // normalizes these and runs them through the deterministic, grounded
          // engine (real locators, page-consolidated) instead of the ungrounded
          // LLM discovery fallback that flattened scenario strings triggered.
          ...(hasUploadedTestCases ? { testCases: uploadedTestCases } : {}),
          generationSource: effectiveTestCaseId != null
            ? 'test_case_based'
            : (selectedReqId
              ? 'requirement_based'
              : (hasUploadedTestCases ? 'uploaded_test_cases' : 'url_based')),
        }),
      });

      const data = await res.json();
      setResult(data);

      if (data.success && data.data?.id) {
        // Auto-generate branch name from scenario
        const slugScenario = scenario.trim().toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 40);
        setPushBranch(`levelup/tests-${slugScenario}-${data.data.id}`);
        onGenerated();
      }
    } catch (err) {
      setResult({
        success: false,
        error: 'Network error — backend may be unavailable',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handlePushToGitHub = async () => {
    if (!result?.data?.id || !pushRepoUrl) return;
    setPushing(true);
    setPushResult(null);

    try {
      const res = await fetch(`/api/scripts/${result.data.id}/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...projectHeaders },
        body: JSON.stringify({
          repoUrl: pushRepoUrl,
          baseBranch: repos.find(r => r.url === pushRepoUrl)?.branch || 'main',
          branchName: pushBranch || undefined,
          createPullRequest: createPR,
        }),
      });

      const data = await res.json();
      setPushResult(data);
      if (data.success) {
        setShowPushDialog(false);
      }
    } catch (err) {
      setPushResult({
        success: false,
        error: 'Network error — backend may be unavailable',
      });
    } finally {
      setPushing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Generator Panel */}
      <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Generate Test Script</h2>
            <p className="text-xs text-slate-500">
              Describe what you want to test in plain English
            </p>
          </div>
        </div>

        {/* ── Sprint 4: Requirement context banner (deep link from Test Case Lab) ── */}
        {loadingContext && (
          <div className="flex items-center gap-2 px-3 py-2.5 mb-3 rounded-lg bg-violet-500/5 border border-violet-500/20 text-xs text-violet-300">
            <Loader2 size={13} className="animate-spin" />
            Loading requirement &amp; test case context…
          </div>
        )}
        {contextError && !loadingContext && (
          <div className="flex items-center gap-2 px-3 py-2.5 mb-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-amber-400">
            <AlertCircle size={13} />
            {contextError}
          </div>
        )}
        {requirementInfo && !loadingContext && (
          <div className="mb-3 rounded-lg bg-gradient-to-br from-violet-500/10 to-indigo-500/5 border border-violet-500/25 overflow-hidden">
            <div className="px-3.5 py-2.5 border-b border-violet-500/15 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-violet-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Target size={14} className="text-violet-300" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {requirementInfo.requirement_id && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-200 border border-violet-500/30">
                        {requirementInfo.requirement_id}
                      </span>
                    )}
                    <h3 className="text-sm font-semibold text-white truncate">{requirementInfo.title}</h3>
                  </div>
                  {requirementInfo.description && (
                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{requirementInfo.description}</p>
                  )}
                </div>
              </div>
              <a
                href="/rtm"
                className="text-[10px] text-violet-300 hover:text-violet-200 flex items-center gap-1 flex-shrink-0 whitespace-nowrap"
                title="Open Requirements Traceability Matrix"
              >
                View in RTM <ArrowRight size={11} />
              </a>
            </div>
            <div className="px-3.5 py-2 flex items-center gap-4 flex-wrap text-[10px]">
              {requirementInfo.priority && (
                <span className="text-slate-400">Priority: <span className="text-slate-200 font-medium">{requirementInfo.priority}</span></span>
              )}
              {requirementInfo.category && (
                <span className="text-slate-400">Category: <span className="text-slate-200 font-medium">{requirementInfo.category}</span></span>
              )}
              {requirementInfo.status && (
                <span className="text-slate-400">Status: <span className="text-slate-200 font-medium">{requirementInfo.status}</span></span>
              )}
              {requirementInfo.coverage_percentage != null && (
                <span className="text-slate-400">Coverage: <span className="text-emerald-300 font-medium">{requirementInfo.coverage_percentage}%</span></span>
              )}
              {testCaseInfo && (
                <span className="inline-flex items-center gap-1 text-emerald-300">
                  <ListChecks size={11} />
                  Test case #{testCaseInfo.id} loaded
                </span>
              )}
            </div>
          </div>
        )}

        {/* GitHub Connection Status Badge */}
        {ghConnected !== null && (
          <div className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs ${
            ghConnected
              ? 'bg-emerald-500/5 border border-emerald-500/20'
              : 'bg-amber-500/5 border border-amber-500/20'
          }`}>
            <div className="flex items-center gap-2">
              <span className={`inline-block w-2 h-2 rounded-full ${ghConnected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              {ghConnected && ghUser ? (
                <span className="text-slate-300">
                  GitHub connected as <span className="text-emerald-400 font-medium">@{ghUser.login}</span>
                </span>
              ) : (
                <span className="text-amber-400">
                  GitHub not connected — <a href="/tools" className="underline hover:text-amber-300">Connect in Tools</a> to enable PR creation
                </span>
              )}
            </div>
            {ghConnected && (
              <span className="text-emerald-400/60 flex items-center gap-1">
                <Github size={12} /> PR ready
              </span>
            )}
          </div>
        )}

        {/* Scenario Input */}
        <div className="space-y-3">
          {/* ── Sprint 4: Requirement picker ── */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              Requirement <span className="text-slate-600">(optional — links the script for traceability)</span>
            </label>
            <div className="relative">
              <select
                value={selectedReqId}
                onChange={(e) => setSelectedReqId(e.target.value)}
                disabled={generating || loadingRequirements}
                className="w-full px-3 py-2 rounded-lg bg-[#0c1222] border border-[#334155] text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 appearance-none pr-8"
              >
                <option value="">
                  {loadingRequirements ? 'Loading requirements…' : 'No requirement — free-form scenario'}
                </option>
                {requirements.map((r) => (
                  <option key={r.id} value={r.id}>
                    {(r.requirement_id ? `${r.requirement_id} · ` : '') + r.title}
                    {` (${r.test_case_count} test case${r.test_case_count === 1 ? '' : 's'})`}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>

            {/* Validation feedback for the selected requirement */}
            {validatingReq && (
              <p className="mt-1.5 text-[11px] text-slate-500 flex items-center gap-1.5">
                <Loader2 size={11} className="animate-spin" /> Checking test cases…
              </p>
            )}
            {!validatingReq && reqValidation && !reqValidation.hasTestCases && (
              <div className="mt-2 flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                <span>
                  No test cases found. Create test cases first in{' '}
                  <a href="/test-coverage" className="underline hover:text-amber-200 font-medium">Test Case Lab</a>.
                </span>
              </div>
            )}
            {!validatingReq && reqValidation && reqValidation.hasTestCases && (
              <div className="mt-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] text-slate-400">
                    <span className="text-emerald-400 font-medium">{reqValidation.testCaseCount}</span> test case{reqValidation.testCaseCount === 1 ? '' : 's'}
                    {reqValidation.automatedCount > 0 && (
                      <span className="text-slate-500"> · {reqValidation.automatedCount} automated</span>
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowTestCasePicker((v) => !v)}
                    className="text-[11px] text-violet-400 hover:text-violet-300 flex items-center gap-1"
                  >
                    {showTestCasePicker ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    {showTestCasePicker ? 'Hide test cases' : 'Load a test case'}
                  </button>
                </div>
                {showTestCasePicker && (
                  <div className="mt-2 space-y-1.5 max-h-52 overflow-y-auto pr-1">
                    {reqTestCases.length === 0 && (
                      <p className="text-[11px] text-slate-600 px-1">No test cases to load.</p>
                    )}
                    {reqTestCases.map((tc) => (
                      <button
                        key={tc.id}
                        type="button"
                        onClick={() => loadTestCaseIntoForm(tc.id)}
                        disabled={loadingTestCase}
                        className="w-full text-left px-3 py-2 rounded-lg bg-[#0c1222] border border-[#2a3040] hover:border-violet-500/50 transition-colors group"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-slate-200 group-hover:text-white truncate">{tc.title}</span>
                          <span className="flex items-center gap-1.5 shrink-0">
                            {tc.automation_status === 'automated' && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px]">
                                🤖 {tc.script_count ? `${tc.script_count}` : ''}
                              </span>
                            )}
                            {tc.automation_status === 'automation_in_progress' && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[9px]">In progress</span>
                            )}
                            {tc.priority && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-400 text-[9px] uppercase">{tc.priority}</span>
                            )}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {uploadedTestCases && uploadedTestCases.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5">
              <ShieldCheck size={15} className="text-emerald-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-emerald-300">
                  {uploadedTestCases.length} uploaded test case{uploadedTestCases.length !== 1 ? 's' : ''} — grounded engine
                </p>
                <p className="text-[10px] text-emerald-400/70 mt-0.5 leading-snug">
                  These structured test cases (steps, expected results) are sent to the deterministic engine to
                  produce real, grounded locators consolidated by page. Editing the scenario below reverts to
                  free-text generation.
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Test Scenario</label>
            <textarea
              value={scenario}
              onChange={(e) => { setScenario(e.target.value); if (uploadedTestCases) setUploadedTestCases(null); }}
              placeholder={`Describe the test scenario in plain English, e.g.:\n\n\u2022 "Test login with valid credentials, verify dashboard loads, check employee count is visible"\n\u2022 "Add a new employee, fill all required fields, verify success message and employee appears in list"\n\u2022 "Try login with wrong password 3 times, verify account lockout message"`}
              rows={5}
              className="w-full px-3 py-2.5 rounded-lg bg-[#0c1222] border border-[#334155] text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 resize-none"
              disabled={generating}
            />
          </div>

          {/* Target URL - auto-populated from the active environment */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 flex items-center gap-1.5">
              Target URL
              {activeEnvironment?.base_url && targetUrl === activeEnvironment.base_url && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-300 text-[9px]">
                  <Database size={9} /> from {activeEnvironment.name || 'environment'}
                </span>
              )}
            </label>
            <input
              type="url"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://your-app.com (e.g. https://opensource-demo.orangehrmlive.com)"
              className="w-full px-3 py-2 rounded-lg bg-[#0c1222] border border-[#334155] text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
              disabled={generating}
            />
            <p className="text-[10px] text-slate-600 mt-1">
              Auto-populated from the active environment. Override here if you want to target a different URL.
              {activeEnvironment?.base_url ? ` (environment: ${activeEnvironment.base_url})` : ''}
            </p>

            {/* Application Intelligence Profile Badge */}
            {resolvedTargetUrl && (
              <div className="mt-1.5 flex items-center gap-2">
                {profileChecking ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-500/10 border border-slate-500/20 text-[10px] text-slate-400">
                    <Loader2 size={10} className="animate-spin" /> Checking profile…
                  </span>
                ) : matchedProfile && !isProfileOutdated(matchedProfile) ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400">
                    <Database size={10} />
                    Profile found — {matchedProfile.pageCount || 0} pages · {matchedProfile.elementCount || 0} elements
                    {matchedProfile.crawledAt && (
                      <span className="text-emerald-500/60 ml-1">· crawled {relativeTime(matchedProfile.crawledAt)}</span>
                    )}
                    <span title="Fast path: reuses the cached profile"><Zap size={9} className="ml-0.5 inline" /></span>
                  </span>
                ) : matchedProfile && isProfileOutdated(matchedProfile) ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-400">
                    <Database size={10} />
                    Profile outdated ({relativeTime(matchedProfile.crawledAt)}) — will re-crawl
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-500/10 border border-slate-500/20 text-[10px] text-slate-500">
                    <Fingerprint size={10} />
                    No profile for this URL yet — crawled on first generation
                  </span>
                )}
              </div>
            )}
          </div>

          {/* ── Intelligence Sources — one consolidated section (matches Test Case Lab) ── */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Cpu size={14} className="text-violet-400" />
              <span className="text-xs font-medium text-slate-300">Intelligence Sources</span>
              <span className="text-[10px] text-slate-500">(optional — improves accuracy)</span>
            </div>

            <div className="space-y-2">
              {/* App Profile — highest-priority source (real crawled DOM) */}
              <IntelSourceCard
                accent="emerald"
                icon={Database}
                title="App Profile"
                badge="Recommended"
                description="Ground every step in your real app — uses live-crawled pages, forms & verified locators instead of AI guesses."
                enabled={useAppProfile}
                onToggle={() => setUseAppProfile((v) => !v)}
                disabled={generating}
                statusLabel={
                  matchedProfile
                    ? (isProfileOutdated(matchedProfile)
                        ? 'outdated — will re-crawl'
                        : `${matchedProfile.pageCount || 0} pages · ${matchedProfile.elementCount || 0} elements`)
                    : undefined
                }
              >
                <div className="space-y-2">
                  {/* Matched-profile summary / status */}
                  <div className="text-[11px] text-slate-400">
                    {profileChecking ? (
                      <span className="inline-flex items-center gap-1.5"><Loader2 size={11} className="animate-spin" /> Loading application profiles…</span>
                    ) : matchedProfile ? (
                      <div className="rounded-lg bg-[#0c1222] border border-emerald-500/20 p-2.5 space-y-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isProfileOutdated(matchedProfile) ? (
                            <span className="inline-flex items-center gap-1 text-amber-400 font-medium"><RefreshCw size={11} /> Profile outdated</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-medium"><CheckCircle2 size={11} /> Profile found{matchedIsExact ? '' : ' (same site)'}</span>
                          )}
                          {matchedProfile.isLatest && (
                            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">latest</span>
                          )}
                          {matchedProfile.source && (
                            <span className="text-[9px] bg-slate-500/20 text-slate-400 px-1.5 py-0.5 rounded">{matchedProfile.source}</span>
                          )}
                        </div>
                        <div className="text-slate-500 truncate" title={matchedProfile.baseUrl}>{matchedProfile.baseUrl}</div>
                        <div className="flex items-center gap-3 text-slate-400">
                          <span>{matchedProfile.pageCount || 0} pages</span>
                          <span>{matchedProfile.elementCount || 0} elements</span>
                          <span>{matchedProfile.formCount || 0} forms</span>
                        </div>
                        <div className="text-slate-500">
                          {matchedProfile.crawledAt ? `Crawled ${relativeTime(matchedProfile.crawledAt)}` : 'Crawl time unknown'}
                          {isProfileOutdated(matchedProfile)
                            ? ' · a fresh crawl runs automatically on generation.'
                            : ' · this cached profile is reused for fast, grounded generation.'}
                        </div>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-slate-500"><Fingerprint size={11} /> No profile for this URL yet — the app is crawled on demand during generation.</span>
                    )}
                  </div>

                  {/* Multiple same-origin profiles → let the user choose which to use. */}
                  {originMatches.length > 1 && (
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">Multiple profiles found for this site — choose one:</label>
                      <select
                        value={selectedProfileId || (matchedProfile?.id ?? '')}
                        onChange={(e) => setSelectedProfileId(e.target.value)}
                        disabled={generating}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#1a1f2e] border border-[#334155] text-[11px] text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 appearance-none"
                      >
                        {originMatches.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.baseUrl} — {p.pageCount || 0} pages{p.isLatest ? ' (latest)' : ''}{p.crawledAt ? ` · ${relativeTime(p.crawledAt)}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <p className="text-[10px] text-slate-600">Turn this off to force a fresh crawl instead of reusing the cached profile.</p>
                </div>
              </IntelSourceCard>

              {/* Repository Intelligence */}
              <IntelSourceCard
                accent="violet"
                icon={Brain}
                title="Repository Intelligence"
                description="Ground tests in your real code — uses architecture, patterns, helpers & page objects from an analyzed repository."
                enabled={useRepoIntelligence}
                onToggle={() => setUseRepoIntelligence((v) => !v)}
                disabled={generating}
                statusLabel={repoContextLoaded ? 'context loaded' : (selectedRepoId ? 'repo selected' : undefined)}
              >
                {repos.length === 0 ? (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5">
                    <p className="text-[11px] text-amber-300">No repositories found. Add one in the Projects page to enable pattern-aware generation.</p>
                  </div>
                ) : (
                  <>
                    <select
                      value={selectedRepoId}
                      onChange={(e) => setSelectedRepoId(e.target.value)}
                      disabled={generating}
                      className="w-full px-3 py-2 rounded-lg bg-[#1a1f2e] border border-[#334155] text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500 appearance-none"
                    >
                      <option value="">Select a repository…</option>
                      {repos.map((r) => (
                        <option key={r.id} value={r.id}>{r.name} — {r.branch || 'main'}</option>
                      ))}
                    </select>
                    {repoContextSummary && (
                      <div className="bg-[#0c1222] rounded-lg p-3 border border-[#1e293b] space-y-2 mt-2">
                        <div className="grid grid-cols-3 gap-2 text-[11px]">
                          <div><span className="text-slate-500">Framework</span><p className="text-violet-300 font-medium">{repoContextSummary.framework || '—'}</p></div>
                          <div><span className="text-slate-500">Pattern</span><p className="text-blue-300 font-medium">{repoContextSummary.testPattern || '—'}</p></div>
                          <div><span className="text-slate-500">Locators</span><p className="text-emerald-300 font-medium">{repoContextSummary.locatorStrategy || '—'}</p></div>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-slate-500 pt-1 border-t border-[#1e293b]">
                          <span>{repoContextSummary.helpers || 0} helpers</span>
                          <span>{repoContextSummary.pageObjects || 0} page objects</span>
                          <span>{repoContextSummary.flows || 0} flows</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </IntelSourceCard>

              {/* App Knowledge — hidden in requirement-based mode, where the
                  real test cases already define the domain behavior to cover. */}
              {!isRequirementBased && (
                <IntelSourceCard
                  accent="amber"
                  icon={BookOpen}
                  title="App Knowledge"
                  description="Teach the AI your domain — business rules, workflows & known bug patterns improve generation accuracy."
                  enabled={useAppKnowledge}
                  onToggle={() => setUseAppKnowledge((v) => !v)}
                  disabled={generating}
                  statusLabel={selectedKnowledgeIds.length > 0 ? `${selectedKnowledgeIds.length} item${selectedKnowledgeIds.length !== 1 ? 's' : ''} selected` : undefined}
                >
                  <KnowledgeSelector
                    selectedIds={selectedKnowledgeIds}
                    onChange={setSelectedKnowledgeIds}
                    contextTitle={scenario}
                    contextDescription={targetUrl || projectContext.appUrl}
                  />
                </IntelSourceCard>
              )}
            </div>
          </div>

          {/* Advanced Options — test types & negative cases. Hidden in
              requirement-based mode: the selected test cases already define
              exactly what to generate (1:1 coverage), so free-form test-type
              toggles don't apply. */}
          {!isRequirementBased && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
              <SlidersHorizontal size={12} />
              Advanced Options
            </div>
            <div className="space-y-3 bg-[#0c1222] rounded-lg p-4 border border-[#1e293b]">
              <div>
                <label className="block text-xs text-slate-400 mb-2">Test Types</label>
                <div className="flex flex-wrap gap-2">
                  {TEST_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleTestType(opt.value)}
                      disabled={generating}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                        testTypes.includes(opt.value)
                          ? 'bg-violet-500/10 border-violet-500/30 text-violet-400'
                          : 'bg-[#1a1f2e] border-[#334155] text-slate-500 hover:text-slate-300'
                      }`}
                      title={opt.description}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeNegative}
                  onChange={(e) => setIncludeNegative(e.target.checked)}
                  disabled={generating}
                  className="w-3.5 h-3.5 rounded border-[#334155] bg-[#1a1f2e] text-violet-500 focus:ring-violet-500 focus:ring-offset-0"
                />
                <span className="text-xs text-slate-400">Include negative test cases</span>
              </label>
            </div>
          </div>
          )}

          {/* Requirement-based mode hint — clarifies that the chosen test cases
              drive generation, replacing the hidden free-form options. */}
          {isRequirementBased && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-violet-500/5 border border-violet-500/20 text-[11px] text-slate-400">
              <ListChecks size={13} className="text-violet-300 mt-0.5 shrink-0" />
              <span>
                Generating directly from your selected test cases for{' '}
                <span className="text-violet-300 font-medium">1:1 coverage</span> — each test case
                becomes one runnable test, grounded in the App Profile&apos;s real URLs, credentials &amp;
                locators. Test-type options aren&apos;t needed here.
              </span>
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={generating || (!scenario.trim() && !selectedReqId && testCaseInfo?.id == null && testCaseId == null) || (!(targetUrl || projectContext.appUrl || activeEnvironment?.base_url))}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-all shadow-lg shadow-violet-500/20"
          >
            {generating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generating scripts — this may take 30–60 seconds...
              </>
            ) : (
              <>
                <Play size={16} />
                Generate Test Scripts
              </>
            )}
          </button>
        </div>
      </div>

      {/* Generation Result */}
      {result && (
        <div ref={resultsRef} className={`scroll-mt-4 bg-[#1a1f2e] border rounded-xl overflow-hidden ${
          result.success ? 'border-emerald-500/20' : 'border-red-500/20'
        }`}>
          {/* Result Header */}
          <div className={`px-5 py-4 border-b ${
            result.success ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle2 size={18} className="text-emerald-400" />
                ) : (
                  <XCircle size={18} className="text-red-400" />
                )}
                <h3 className={`text-sm font-semibold ${
                  result.success ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {result.success ? 'Scripts Generated Successfully!' : 'Generation Failed'}
                </h3>
              </div>

              {/* GitHub action buttons */}
              {result.success && result.data && (
                <div className="flex items-center gap-2">
                  {ghConnected ? (
                    <button
                      onClick={() => {
                        setShowPrModal(true);
                        setPrResult(null);
                        setPrTitle(`🧪 LevelUp: AI-Generated Test Scripts (#${result.data!.id})`);
                        const slug = scenario.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
                        setPrBranch(`levelup/tests-${slug}-${result.data!.id}`);
                        fetchGhRepos();
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-medium transition-all"
                    >
                      <GitBranch size={14} />
                      Create PR
                    </button>
                  ) : (
                    <a
                      href="/tools"
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1e293b] border border-[#334155] text-amber-400 hover:text-amber-300 transition-colors text-xs font-medium"
                    >
                      <Github size={14} />
                      Connect GitHub
                    </a>
                  )}
                  <button
                    onClick={() => setShowPushDialog(!showPushDialog)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1e293b] border border-[#334155] text-slate-300 hover:text-white hover:bg-[#334155] transition-colors text-xs font-medium"
                  >
                    <Github size={14} />
                    Push via URL
                  </button>
                </div>
              )}
            </div>
            {result.error && (
              <p className="text-xs text-red-300/80 mt-1">{result.error}</p>
            )}
            {/* Actionable next step for the honest 422s. Instead of dumping the
                user at a dead-end "Generation Failed", route them to Test Case
                Lab to create/review the cases that grounded generation needs.
                REQUIREMENT_HAS_NO_TEST_CASES → generate; DETERMINISTIC_GENERATION_EMPTY
                → review the existing (unautomatable) cases. */}
            {!result.success &&
              (result.code === 'REQUIREMENT_HAS_NO_TEST_CASES' ||
                result.code === 'DETERMINISTIC_GENERATION_EMPTY') && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <a
                    href={
                      '/test-coverage' +
                      (result.requirementId ? `?requirement_id=${encodeURIComponent(result.requirementId)}` : '')
                    }
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white text-xs font-medium transition-all"
                  >
                    <ListChecks size={13} />
                    {result.nextAction === 'REVIEW_TEST_CASES' ? 'Review Test Cases' : 'Generate Test Cases'}
                  </a>
                  <span className="text-[11px] text-slate-500">
                    Grounded scripts require test cases from Test Case Lab — the generator will not emit generic, ungrounded scripts.
                  </span>
                </div>
              )}

            {/* ── Generation Diagnostics ─────────────────────────────────────
                Philosophy: stay quiet when things work. Only show the heavy
                pipeline funnel + per-case reasons when something actually
                FAILED (422) or was PARTIAL (some cases produced no script).
                On full success we show at most a compact, de-duplicated
                one-line warning summary — never a per-case dump. */}
            {(() => {
              // Pipeline/case data lives at the top level on failure (422) and
              // under `data` on success (200). Unify both.
              const pipeline = result.pipeline ?? result.data?.pipeline;
              const caseErrors = result.caseErrors;
              const rawWarnings = result.data?.testDataWarnings ?? [];
              const unmapped = result.data?.unmappedSteps ?? [];
              const failed = !result.success;
              const isPartial =
                !!pipeline && pipeline.generatedScripts < pipeline.inputTestCases;

              // De-duplicate identical warnings (the backend emits one per case,
              // so 14 cases → 14 copies of the same "Dataset valid_users…" line).
              // Collapse to unique messages with an occurrence count.
              const warnCounts = new Map<string, number>();
              for (const w of rawWarnings) warnCounts.set(w, (warnCounts.get(w) ?? 0) + 1);
              const warnings = Array.from(warnCounts.entries()); // [msg, count][]
              const hasWarnings = warnings.length > 0 || unmapped.length > 0;

              // Only the cases that did NOT produce a script are worth listing.
              const failedCases = (pipeline?.cases ?? []).filter(
                (c) => c.status && c.status !== 'OK'
              );

              // ── Full success (nothing failed / dropped) ──────────────────
              // Show a minimal, collapsible warning summary only. No funnel,
              // no per-case breakdown (every row would just say "Generated").
              if (!failed && !isPartial) {
                if (!hasWarnings) return null;
                return (
                  <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/[0.04] overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5">
                      <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                      <h4 className="text-xs font-semibold text-amber-200">
                        {warnings.length + unmapped.length} non-fatal warning{warnings.length + unmapped.length === 1 ? '' : 's'} to review
                      </h4>
                    </div>
                    <div className="px-4 pb-3 space-y-1">
                      {warnings.map(([msg, count], i) => (
                        <div key={`w${i}`} className="flex items-start gap-2 text-[11px] text-amber-300/85 rounded-lg border border-amber-500/20 bg-amber-500/[0.05] px-2.5 py-1.5">
                          <AlertTriangle size={12} className="text-amber-400 mt-0.5 shrink-0" />
                          <span className="break-words">
                            {msg}
                            {count > 1 && (
                              <span className="ml-1.5 text-amber-400/70">×{count}</span>
                            )}
                          </span>
                        </div>
                      ))}
                      {unmapped.map((u, i) => (
                        <div key={`u${i}`} className="flex items-start gap-2 text-[11px] text-amber-300/85 rounded-lg border border-amber-500/20 bg-amber-500/[0.05] px-2.5 py-1.5">
                          <AlertCircle size={12} className="text-amber-400 mt-0.5 shrink-0" />
                          <span className="break-words">
                            {u.testCaseId != null ? `#${u.testCaseId}: ` : ''}Step not auto-mapped — “{u.step}”
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              // ── Failure (422) or partial success ─────────────────────────
              // Now the detailed diagnostics genuinely help. Show the funnel
              // (highlighting where cases dropped) + only the FAILED cases.
              const show = pipeline || (caseErrors && caseErrors.length > 0);
              if (!show) return null;
              return (
              <div className={`mt-4 rounded-xl border overflow-hidden ${failed ? 'border-red-500/25 bg-red-500/[0.04]' : 'border-amber-500/25 bg-amber-500/[0.04]'}`}>
                <div className={`flex items-center gap-2 px-4 py-2.5 border-b ${failed ? 'border-red-500/20 bg-red-500/[0.06]' : 'border-amber-500/20 bg-amber-500/[0.06]'}`}>
                  <AlertTriangle size={14} className={failed ? 'text-red-400' : 'text-amber-400'} />
                  <h4 className={`text-xs font-semibold ${failed ? 'text-red-200' : 'text-amber-200'}`}>
                    {failed ? 'Generation failed — what went wrong' : 'Partial generation — what went wrong'}
                  </h4>
                </div>

                {/* Pipeline funnel — each stage shows how many cases reached it.
                    The first stage where the count drops is the failure point. */}
                {pipeline && (() => {
                  const p = pipeline;
                  const stages: Array<{ label: string; value: number }> = [
                    { label: 'Input', value: p.inputTestCases },
                    { label: 'Canonicalized', value: p.canonicalized },
                    { label: 'Parsed', value: p.parsed },
                    { label: 'Grounded', value: p.grounded },
                    { label: 'Scripts', value: p.generatedScripts },
                  ];
                  // Index of the first stage where the count fell vs the prior one.
                  let dropAt = -1;
                  for (let i = 1; i < stages.length; i++) {
                    if (stages[i].value < stages[i - 1].value) { dropAt = i; break; }
                  }
                  return (
                    <div className="px-4 py-3">
                      <div className="flex items-stretch gap-1.5">
                        {stages.map((s, i) => {
                          const isDrop = i === dropAt;
                          const zero = s.value === 0;
                          return (
                            <div key={s.label} className="flex items-center gap-1.5 flex-1 min-w-0">
                              <div
                                className={
                                  'flex-1 rounded-lg border px-2 py-2 text-center min-w-0 ' +
                                  (isDrop
                                    ? 'border-red-500/50 bg-red-500/10'
                                    : zero
                                      ? 'border-slate-700 bg-slate-800/40'
                                      : 'border-emerald-500/30 bg-emerald-500/[0.06]')
                                }
                              >
                                <div
                                  className={
                                    'text-sm font-bold ' +
                                    (isDrop ? 'text-red-300' : zero ? 'text-slate-500' : 'text-emerald-300')
                                  }
                                >
                                  {s.value}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate">{s.label}</div>
                              </div>
                              {i < stages.length - 1 && (
                                <ArrowRight size={12} className="text-slate-600 shrink-0" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {dropAt > 0 && (
                        <p className="text-[11px] text-red-300/80 mt-2 flex items-center gap-1.5">
                          <XCircle size={12} className="shrink-0" />
                          {stages[dropAt - 1].value - stages[dropAt].value} of {stages[dropAt - 1].value} case(s) dropped at
                          the <span className="font-semibold">{stages[dropAt].label}</span> stage.
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* Per-case trace — ONLY the cases that failed, with the reason. */}
                {failedCases.length > 0 && (
                  <div className="px-4 pb-3">
                    <div className="text-[11px] font-medium text-slate-400 mb-1.5">
                      Failed case{failedCases.length === 1 ? '' : 's'} ({failedCases.length})
                    </div>
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {failedCases.map((c, i) => (
                        <div
                          key={`${c.id ?? i}`}
                          className="flex items-start gap-2 rounded-lg border border-[#334155] bg-[#0c1222] px-2.5 py-1.5"
                        >
                          <XCircle size={13} className="text-red-400 mt-0.5 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-medium text-slate-200 truncate">
                                {c.id != null ? `#${c.id} ` : ''}{c.title || 'Untitled case'}
                              </span>
                              {c.reachedStage && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-300 shrink-0">
                                  {c.reachedStage}
                                </span>
                              )}
                            </div>
                            {c.reason && (
                              <p className="text-[11px] text-red-300/70 mt-0.5 break-words">{c.reason}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fallback: raw caseErrors when no structured per-case trace was
                    returned (older backend responses). */}
                {failedCases.length === 0 &&
                  caseErrors && caseErrors.length > 0 && (
                    <div className="px-4 pb-3">
                      <div className="text-[11px] font-medium text-slate-400 mb-1.5">Reasons</div>
                      <ul className="space-y-1">
                        {caseErrors.map((e, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-[11px] text-red-300/80 rounded-lg border border-[#334155] bg-[#0c1222] px-2.5 py-1.5"
                          >
                            <XCircle size={12} className="text-red-400 mt-0.5 shrink-0" />
                            <span className="break-words">{e}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
              );
            })()}
          </div>

          {/* Push to GitHub Dialog */}
          {showPushDialog && result.success && result.data && (
            <div className="px-5 py-4 bg-[#0c1222] border-b border-[#2a3040]">
              <div className="flex items-center gap-2 mb-3">
                <GitBranch size={14} className="text-violet-400" />
                <h4 className="text-sm font-semibold text-white">Push to GitHub Repository</h4>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Repository</label>
                  <select
                    value={pushRepoUrl}
                    onChange={(e) => setPushRepoUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#1a1f2e] border border-[#334155] text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-violet-500"
                    disabled={pushing}
                  >
                    {repos.length === 0 && <option value="">No repositories configured</option>}
                    {repos.map((repo) => (
                      <option key={repo.id} value={repo.url}>
                        {repo.name} ({repo.branch})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Branch Name</label>
                  <input
                    type="text"
                    value={pushBranch}
                    onChange={(e) => setPushBranch(e.target.value)}
                    placeholder="levelup/generated-tests"
                    className="w-full px-3 py-2 rounded-lg bg-[#1a1f2e] border border-[#334155] text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                    disabled={pushing}
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createPR}
                    onChange={(e) => setCreatePR(e.target.checked)}
                    disabled={pushing}
                    className="w-3.5 h-3.5 rounded border-[#334155] bg-[#1a1f2e] text-violet-500 focus:ring-violet-500 focus:ring-offset-0"
                  />
                  <span className="text-xs text-slate-400">Create a Pull Request automatically</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePushToGitHub}
                    disabled={pushing || !pushRepoUrl}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-all"
                  >
                    {pushing ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Pushing to GitHub...
                      </>
                    ) : (
                      <>
                        <Github size={14} />
                        Push & Create PR
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowPushDialog(false)}
                    className="px-4 py-2.5 text-sm text-slate-400 hover:text-white transition-colors"
                    disabled={pushing}
                  >
                    Cancel
                  </button>
                </div>

                {/* Push error */}
                {pushResult && !pushResult.success && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-xs text-red-400">
                    {pushResult.error}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PR Creation Modal */}
          {showPrModal && result?.success && result.data && (
            <div className="px-5 py-4 bg-[#0c1222] border-b border-[#2a3040]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <GitBranch size={14} className="text-emerald-400" />
                  <h4 className="text-sm font-semibold text-slate-200">Create Pull Request</h4>
                </div>
                <button
                  onClick={() => setShowPrModal(false)}
                  className="text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                {/* Repository selector */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Repository</label>
                  {ghReposLoading ? (
                    <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                      <Loader2 size={12} className="animate-spin" />
                      Loading repositories…
                    </div>
                  ) : (
                    <select
                      value={selectedGhRepo}
                      onChange={e => setSelectedGhRepo(e.target.value)}
                      className="w-full px-3 py-2 bg-[#1a1f2e] border border-[#2a3040] rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
                    >
                      <option value="">Select a repository…</option>
                      {ghRepos.map(r => (
                        <option key={r.fullName} value={r.fullName}>
                          {r.fullName} {r.private ? '🔒' : ''} ({r.defaultBranch})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Branch name */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Branch Name</label>
                  <input
                    type="text"
                    value={prBranch}
                    onChange={e => setPrBranch(e.target.value)}
                    placeholder="levelup/tests-..."
                    className="w-full px-3 py-2 bg-[#1a1f2e] border border-[#2a3040] rounded-lg text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                {/* PR title */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">PR Title</label>
                  <input
                    type="text"
                    value={prTitle}
                    onChange={e => setPrTitle(e.target.value)}
                    placeholder="🧪 LevelUp: AI-Generated Test Scripts"
                    className="w-full px-3 py-2 bg-[#1a1f2e] border border-[#2a3040] rounded-lg text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                {/* PR result messages */}
                {prResult?.success && (
                  <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
                    <div className="text-xs">
                      <span className="text-emerald-400 font-medium">PR created!</span>
                      {prResult.prUrl && (
                        <a
                          href={prResult.prUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-emerald-300 hover:text-emerald-200 underline inline-flex items-center gap-1"
                        >
                          #{prResult.prNumber} <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  </div>
                )}
                {prResult && !prResult.success && (
                  <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <XCircle size={14} className="text-red-400 flex-shrink-0" />
                    <span className="text-xs text-red-300">{prResult.error}</span>
                  </div>
                )}

                {/* Submit button */}
                <button
                  onClick={handleCreatePR}
                  disabled={creatingPr || !selectedGhRepo}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium transition-all"
                >
                  {creatingPr ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Creating Pull Request…
                    </>
                  ) : (
                    <>
                      <Github size={14} />
                      Create Pull Request
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Push Success Banner */}
          {pushResult?.success && pushResult.data && (
            <div className="px-5 py-4 bg-emerald-500/5 border-b border-emerald-500/20">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 size={16} className="text-emerald-400" />
                <h4 className="text-sm font-semibold text-emerald-400">Pushed to GitHub!</h4>
              </div>
              <div className="space-y-2">
                {pushResult.data.message ? (
                  <p className="text-xs text-slate-400">{pushResult.data.message}</p>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-xs">
                      <GitBranch size={12} className="text-slate-500" />
                      <span className="text-slate-400">Branch:</span>
                      <a
                        href={pushResult.data.branchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-violet-400 hover:text-violet-300 flex items-center gap-1"
                      >
                        {pushResult.data.branchName}
                        <ExternalLink size={10} />
                      </a>
                    </div>
                    {pushResult.data.pullRequest && (
                      <div className="flex items-center gap-2 text-xs">
                        <Github size={12} className="text-slate-500" />
                        <span className="text-slate-400">Pull Request:</span>
                        <a
                          href={pushResult.data.pullRequest.prUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                        >
                          PR #{pushResult.data.pullRequest.prNumber}
                          <ExternalLink size={10} />
                        </a>
                      </div>
                    )}
                    <p className="text-[10px] text-slate-600">
                      Commit: {pushResult.data.commitSha?.slice(0, 8)} · {pushResult.data.filesCount} files
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Result Stats */}
          {result.success && result.data && (
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard
                  icon={FileCode}
                  label="Files"
                  value={String(result.data.filesGenerated)}
                  color="text-violet-400"
                />
                <StatCard
                  icon={Zap}
                  label="Tests"
                  value={String(result.data.stats.totalTests)}
                  color="text-emerald-400"
                />
                <StatCard
                  icon={Clock}
                  label="Time"
                  value={`${(result.data.generationTimeMs / 1000).toFixed(1)}s`}
                  color="text-blue-400"
                />
                <StatCard
                  icon={Sparkles}
                  label="Tokens"
                  value={result.data.stats.tokensUsed.toLocaleString()}
                  color="text-amber-400"
                />
              </div>

              {/* Phase 5: Intelligence Score — signature transparency metric */}
              {result.data.intelligenceScore && (
                <IntelligenceScoreComponent 
                  score={result.data.intelligenceScore} 
                  title="Script Generation Intelligence Score"
                />
              )}

              {/* ── Generation Quality — at-a-glance proof scripts are grounded
                  in real data (real locators, real assertions) rather than AI
                  guesses. Surfaces the exact signals the Script Gen review
                  flagged: real locators, assertions, and grounding source. ── */}
              {(() => {
                const lr = result.data.locatorReport;
                const totalLoc = lr?.totalLocators ?? 0;
                const validated = lr?.validatedCount ?? 0;
                const realLocPct = totalLoc > 0 ? Math.round((validated / totalLoc) * 100) : null;
                const assertions = result.data.stats.totalAssertions ?? 0;
                // Truthful grounding signal: a generation is grounded in the
                // real application whenever a cached App Profile DOM was used
                // (profileCacheUsed / profileId) or a fresh crawl walked the DOM
                // (crawlStrategy present), or real locators were validated.
                const intel = result.data.intelligence;
                const grounded = Boolean(
                  intel?.profileCacheUsed ||
                  (intel?.profileId != null) ||
                  intel?.crawlStrategy ||
                  validated > 0
                );
                const groundingLabel = intel?.profileCacheUsed || intel?.profileId != null
                  ? 'App Profile'
                  : grounded ? 'Live Crawl' : 'AI only';
                const groundingSub = intel?.profileCacheUsed || intel?.profileId != null
                  ? 'cached real DOM'
                  : grounded ? 'real URLs & DOM' : 'no profile used';
                const qualityTone = (pct: number | null) =>
                  pct == null ? 'text-slate-300'
                    : pct >= 80 ? 'text-emerald-400'
                      : pct >= 50 ? 'text-amber-400' : 'text-red-400';
                return (
                  <div className="rounded-lg bg-gradient-to-br from-emerald-500/8 to-violet-500/5 border border-emerald-500/20 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <ShieldCheck size={14} className="text-emerald-400" />
                      <span className="text-xs font-semibold text-white">Generation Quality</span>
                      <span className="text-[10px] text-slate-500">— grounded in your real application</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-[#0c1222] rounded-lg p-3">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Real Locators</p>
                        <p className={`text-lg font-bold ${qualityTone(realLocPct)}`}>
                          {realLocPct != null ? `${realLocPct}%` : '—'}
                        </p>
                        <p className="text-[10px] text-slate-500">{validated}/{totalLoc} validated</p>
                      </div>
                      <div className="bg-[#0c1222] rounded-lg p-3">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Assertions</p>
                        <p className={`text-lg font-bold ${assertions > 0 ? 'text-emerald-400' : 'text-red-400'}`}>{assertions}</p>
                        <p className="text-[10px] text-slate-500">expect() checks</p>
                      </div>
                      <div className="bg-[#0c1222] rounded-lg p-3">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Tests</p>
                        <p className="text-lg font-bold text-violet-300">{result.data.stats.totalTests}</p>
                        <p className="text-[10px] text-slate-500">in {result.data.filesGenerated} file{result.data.filesGenerated !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="bg-[#0c1222] rounded-lg p-3">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Grounding</p>
                        <p className={`text-sm font-bold ${grounded ? 'text-emerald-400' : 'text-slate-400'}`}>
                          {groundingLabel}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {groundingSub}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ── Sprint 4: RTM auto-update — coverage delta + traceability link ── */}
              {result.data.rtmUpdate && (
                <div className="rounded-lg bg-gradient-to-br from-emerald-500/10 to-violet-500/5 border border-emerald-500/25 overflow-hidden">
                  <div className="px-4 py-3 flex items-start justify-between gap-3 border-b border-emerald-500/15">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                        <Target size={15} className="text-emerald-300" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">Requirements Traceability Updated</h4>
                        <p className="text-[11px] text-slate-400">
                          {result.data.rtmUpdate.linksCreated.length > 0
                            ? `${result.data.rtmUpdate.linksCreated.length} traceability link${result.data.rtmUpdate.linksCreated.length !== 1 ? 's' : ''} created`
                            : 'Requirement linked to generated scripts'}
                        </p>
                      </div>
                    </div>
                    <a
                      href="/rtm"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 transition-colors text-[11px] font-medium whitespace-nowrap"
                    >
                      <Link2 size={12} /> View RTM <ArrowRight size={11} />
                    </a>
                  </div>
                  <div className="px-4 py-3 flex items-center gap-6 flex-wrap">
                    {(result.data.rtmUpdate.coverageBefore != null || result.data.rtmUpdate.coverageAfter != null) && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">Coverage</span>
                        <span className="flex items-center gap-1.5 text-sm font-bold">
                          <span className="text-slate-400">{result.data.rtmUpdate.coverageBefore ?? 0}%</span>
                          <ArrowRight size={12} className="text-emerald-400" />
                          <span className="text-emerald-300">{result.data.rtmUpdate.coverageAfter ?? 0}%</span>
                          {result.data.rtmUpdate.coverageAfter != null && result.data.rtmUpdate.coverageBefore != null &&
                            result.data.rtmUpdate.coverageAfter > result.data.rtmUpdate.coverageBefore && (
                            <span className="text-[10px] text-emerald-400 font-medium">
                              +{result.data.rtmUpdate.coverageAfter - result.data.rtmUpdate.coverageBefore}%
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                    {(result.data.rtmUpdate.statusBefore || result.data.rtmUpdate.statusAfter) && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">Status</span>
                        <span className="flex items-center gap-1.5 text-xs font-medium">
                          <span className="text-slate-400">{result.data.rtmUpdate.statusBefore ?? '—'}</span>
                          <ArrowRight size={11} className="text-emerald-400" />
                          <span className="text-emerald-300">{result.data.rtmUpdate.statusAfter ?? '—'}</span>
                        </span>
                      </div>
                    )}
                    {result.data.rtmUpdate.requirementId && (
                      <span className="text-[10px] font-mono text-slate-500 ml-auto">
                        req {result.data.rtmUpdate.requirementId.slice(0, 8)}…
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* ── Sprint 4B: Test case automation marked + automation-coverage delta ── */}
              {result.data.automationUpdate && (
                <div className="rounded-lg bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/25 px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                      <span className="text-base leading-none">🤖</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-semibold text-white">
                        {result.data.automationUpdate.isAutomated
                          ? `Test case #${result.data.automationUpdate.testCaseId} marked automated`
                          : `Script linked to test case #${result.data.automationUpdate.testCaseId}`}
                      </h4>
                      {(result.data.automationUpdate.coverageBefore || result.data.automationUpdate.coverageAfter) && (
                        <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                          <span className="text-slate-500 uppercase tracking-wider text-[10px]">Requirement automation</span>
                          <span className="flex items-center gap-1.5 font-bold">
                            <span className="text-slate-400">{result.data.automationUpdate.coverageBefore?.automationPercentage ?? 0}%</span>
                            <ArrowRight size={11} className="text-emerald-400" />
                            <span className="text-emerald-300">{result.data.automationUpdate.coverageAfter?.automationPercentage ?? 0}%</span>
                          </span>
                          {result.data.automationUpdate.coverageAfter && (
                            <span className="text-slate-500">
                              ({result.data.automationUpdate.coverageAfter.automatedCount}/{result.data.automationUpdate.coverageAfter.totalTestCases} automated)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Sprint 4 / Tier B: Locator Grounding Report ──
                  Summary line + per-element breakdown showing exactly which
                  selectors were grounded in the REAL crawled DOM (✓) vs fell
                  back to a generic selector not found in the crawl (⚠). This is
                  the demo-grade proof that locators come from the App Profile,
                  not from AI guesses. ── */}
              {result.data.locatorReport && result.data.locatorReport.totalLocators > 0 && (() => {
                const lreport = result.data.locatorReport!;
                const groundedPct = lreport.totalLocators > 0
                  ? Math.round((lreport.validatedCount / lreport.totalLocators) * 100)
                  : 0;
                const pctTone = groundedPct >= 80 ? 'text-emerald-400'
                  : groundedPct >= 50 ? 'text-amber-400' : 'text-red-400';
                const entries = lreport.locators ?? [];
                return (
                  <div className="bg-[#0c1222] rounded-lg p-3">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
                      <span className="inline-flex items-center gap-2 text-slate-300 font-medium">
                        <Link2 size={14} className="text-blue-400 shrink-0" />
                        Locator Grounding Report
                      </span>
                      <span className="text-slate-500">
                        <span className={`font-semibold ${pctTone}`}>{groundedPct}%</span> grounded
                        {' '}(<span className="text-emerald-400 font-medium">{lreport.validatedCount}</span>/{lreport.totalLocators})
                      </span>
                      <span className="text-slate-500">
                        Avg confidence: <span className="text-blue-300 font-medium">{Math.round(lreport.avgConfidence)}%</span>
                      </span>
                      {lreport.todoCount > 0 && (
                        <span className="text-amber-400">{lreport.todoCount} not found in crawl</span>
                      )}
                    </div>
                    {/* App-Profile-grounding KPI — the customer proof point:
                        how many locators came from the App Profile (repository)
                        vs healed by AI. Goal: grow App-Profile %, shrink AI %. */}
                    {typeof lreport.appProfileCount === 'number' && (
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] border-t border-white/5 pt-2">
                        <span className="inline-flex items-center gap-1.5 text-slate-300">
                          <Fingerprint size={12} className="text-violet-400 shrink-0" />
                          Locator provenance
                        </span>
                        <span className="inline-flex items-center gap-1 text-emerald-300">
                          <CheckCircle2 size={12} className="shrink-0" />
                          <span className="font-semibold">{lreport.appProfileCount}</span> from App Profile
                        </span>
                        {typeof lreport.fallbackCount === 'number' && lreport.fallbackCount > 0 && (
                          <span className="text-slate-400">
                            <span className="font-semibold text-slate-300">{lreport.fallbackCount}</span> curated fallback
                          </span>
                        )}
                        <span className="text-slate-400">
                          <span className="font-semibold text-blue-300">{lreport.aiCount ?? 0}</span> healed by AI
                        </span>
                        <span className="text-slate-500">
                          <span className="font-semibold text-emerald-400">{lreport.appProfilePct ?? 0}%</span> Repository Grounded
                          {' · '}
                          <span className={`font-semibold ${(lreport.aiPct ?? 0) > 0 ? 'text-blue-300' : 'text-slate-500'}`}>{lreport.aiPct ?? 0}%</span> AI
                        </span>
                      </div>
                    )}
                    {entries.length > 0 && (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {entries.map((loc, i) => {
                          const ok = loc.validated ?? (loc.status === 'validated');
                          return (
                            <div
                              key={`${loc.element}-${i}`}
                              className="flex items-center gap-2 rounded-md bg-[#0a0f1c] border border-white/5 px-2.5 py-1.5"
                              title={ok ? `Grounded in crawl DOM via ${loc.source ?? 'match'}` : 'Not found in crawl — generic fallback selector'}
                            >
                              {ok
                                ? <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                                : <AlertTriangle size={13} className="text-amber-400 shrink-0" />}
                              <span className="text-[11px] text-slate-300 font-medium shrink-0 w-20 truncate">{loc.element}</span>
                              <code className="text-[10px] text-slate-400 font-mono truncate flex-1">{loc.selector}</code>
                              <span className={`text-[10px] font-medium shrink-0 ${ok ? 'text-emerald-300' : 'text-slate-500'}`}>
                                {ok ? `${loc.confidence}%` : 'fallback'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Intelligence Info */}
              {result.data.intelligence && (
                <div className="bg-[#0c1222] rounded-lg p-3 flex items-center gap-3">
                  <Fingerprint size={14} className="text-violet-400 shrink-0" />
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
                    <span className={`font-medium ${
                      result.data.intelligence.crawlStrategy === 'FAST_PATH'
                        ? 'text-emerald-400'
                        : 'text-blue-400'
                    }`}>
                      {result.data.intelligence.crawlStrategy === 'FAST_PATH'
                        ? '⚡ Fast Path (cached)'
                        : '🔍 Full Crawl'}
                    </span>
                    {result.data.intelligence.crawlTimeMs != null && (
                      <span className="text-slate-500">
                        Crawl: {(result.data.intelligence.crawlTimeMs / 1000).toFixed(1)}s
                      </span>
                    )}
                    {result.data.intelligence.patternsDetected != null && result.data.intelligence.patternsDetected > 0 && (
                      <span className="text-slate-500">
                        {result.data.intelligence.patternsDetected} pattern{result.data.intelligence.patternsDetected !== 1 ? 's' : ''} detected
                      </span>
                    )}
                    {result.data.intelligence.profileId != null && (
                      <span className="text-slate-600">
                        Profile #{result.data.intelligence.profileId} cached for 30 days
                      </span>
                    )}
                    {result.data.intelligence.generationSource && (
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <FileText size={10} />
                        Source: <span className="text-slate-400">{result.data.intelligence.generationSource.replace(/_/g, ' ')}</span>
                      </span>
                    )}
                    {result.data.intelligence.folderDecision?.targetDirectory && (
                      <span className="inline-flex items-center gap-1 text-slate-500" title={result.data.intelligence.folderDecision.reason || ''}>
                        <ListChecks size={10} />
                        <span className="text-slate-400 font-mono">{result.data.intelligence.folderDecision.targetDirectory}</span>
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Reliability Score — HONEST execution readiness.
                  Headlines `reliability.executionReadiness` (weakest-link of
                  code × grounding × coverage), NOT validationReport.overallScore
                  (code-only). The old code-only score reported 100% while 0/14
                  locators were grounded — the exact dishonesty the user flagged.
                  Falls back to overallScore only for responses from an older
                  backend that doesn't yet return `reliability`. */}
              {(() => {
                const rel = result.data.reliability;
                const score = rel
                  ? rel.executionReadiness
                  : (result.data.validationReport?.overallScore ?? null);
                if (score == null) return null;
                const tone = (n: number) =>
                  n >= 80 ? 'text-emerald-400' : n >= 60 ? 'text-amber-400' : 'text-red-400';
                const bar = (n: number) =>
                  n >= 80 ? 'bg-emerald-400' : n >= 60 ? 'bg-amber-400' : 'bg-red-400';
                const dims: Array<{ label: string; value: number | null }> = rel
                  ? [
                      { label: 'Code', value: rel.codeQuality },
                      { label: 'Grounding', value: rel.grounding },
                      { label: 'Coverage', value: rel.coverage },
                    ]
                  : [];
                return (
                  <div className="bg-[#0c1222] rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                        {rel ? 'Execution Readiness' : 'Reliability Score'}
                      </p>
                      <span className={`text-sm font-bold ${tone(score)}`}>{score}%</span>
                    </div>
                    <div className="w-full bg-[#1e293b] rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${bar(score)}`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                    {/* Decomposed dimensions so a perfect code score can never
                        masquerade as overall reliability when grounding/coverage
                        are zero. */}
                    {dims.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mt-3">
                        {dims.map((d) => (
                          <div key={d.label} className="bg-[#1a1f2e] rounded-md px-2 py-1.5">
                            <p className="text-[9px] text-slate-500 uppercase tracking-wider">{d.label}</p>
                            <p className={`text-xs font-semibold ${d.value == null ? 'text-slate-500' : tone(d.value)}`}>
                              {d.value == null ? 'n/a' : `${d.value}%`}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                    {rel && rel.executionReadiness < 60 && (
                      <p className="text-[10px] text-amber-300/70 mt-2 leading-relaxed">
                        Weakest-link score: low grounding or coverage collapses execution readiness even when the code is syntactically perfect.
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Generated Files */}
              {result.data.files && result.data.files.length > 0 && (
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Generated Files</p>
                  <div className="space-y-2">
                    {result.data.files.map((file) => (
                      <div key={file.path} className="bg-[#0c1222] rounded-lg border border-[#1e293b] px-3 py-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileCode size={12} className="text-violet-400" />
                          <span className="text-xs text-slate-300 font-mono">{file.path}</span>
                          <span className="text-[10px] text-slate-600">
                            {file.type} · {(file.size / 1024).toFixed(1)}KB
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Errors/Warnings */}
              {result.data.errors && result.data.errors.length > 0 && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle size={12} className="text-amber-400" />
                    <p className="text-[10px] text-amber-400 uppercase tracking-wider font-semibold">Warnings</p>
                  </div>
                  {result.data.errors.map((err, i) => (
                    <p key={i} className="text-xs text-amber-300/80 leading-relaxed">{err}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof FileCode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-[#0c1222] rounded-lg p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon size={10} className={color} />
        <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
      </div>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}
