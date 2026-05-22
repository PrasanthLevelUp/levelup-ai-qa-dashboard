'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText, Sparkles, BarChart3, ChevronDown, ChevronRight,
  CheckCircle2, AlertTriangle, Shield, Zap, Clock, Tag, Trash2,
  Plus, Loader2, RefreshCw, ClipboardList, Lightbulb, Target,
  ArrowRight, CheckSquare, XCircle, Eye, ChevronUp, TestTubeDiagonal,
} from 'lucide-react';

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
/*  Generate Tab                                                       */
/* ------------------------------------------------------------------ */

function GenerateTab({ onViewHistory }: { onViewHistory: () => void }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
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

  const toggleType = (t: CoverageType) => {
    setSelectedTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const handleGenerate = async () => {
    if (!title.trim() || !description.trim()) return;
    setLoading(true);
    setError(null);
    setStep(3);
    try {
      const res = await fetch('/api/test-coverage/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          jiraId: jiraId.trim() || undefined,
          businessFlow: businessFlow.trim() || undefined,
          acceptanceCriteria: acceptanceCriteria.trim() || undefined,
          module: module.trim() || undefined,
          coverageTypes: selectedTypes,
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
    setStep(1);
    setResult(null);
    setError(null);
    setTitle('');
    setDescription('');
    setJiraId('');
    setBusinessFlow('');
    setAcceptanceCriteria('');
    setModule('');
    setSelectedTypes(['positive', 'negative', 'edge_cases']);
  };

  return (
    <div>
      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              s < step ? 'bg-emerald-500 text-white'
              : s === step ? 'bg-violet-600 text-white ring-2 ring-violet-400/50'
              : 'bg-slate-700 text-slate-500'
            }`}>
              {s < step ? <CheckCircle2 className="w-4 h-4" /> : s}
            </div>
            <span className={`text-sm hidden sm:inline ${s === step ? 'text-white font-medium' : 'text-slate-500'}`}>
              {s === 1 ? 'Describe Requirement' : s === 2 ? 'Select Coverage' : 'Results'}
            </span>
            {s < 3 && <ArrowRight className="w-4 h-4 text-slate-600" />}
          </div>
        ))}
      </div>

      {/* Step 1: Requirement Input */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-violet-400" />
              Describe Your Requirement
            </h3>
            <p className="text-sm text-slate-400 mb-6">Enter a Jira story, feature description, or plain English requirement. AI will generate comprehensive manual test cases with step-by-step instructions, expected results, and coverage analysis.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Users should login using email OTP"
                  className="w-full bg-slate-900/50 border border-slate-600/50 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Description *</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Describe the requirement in detail. Include business rules, expected behavior, edge cases you're concerned about..."
                  className="w-full bg-slate-900/50 border border-slate-600/50 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Jira ID</label>
                <input
                  type="text"
                  value={jiraId}
                  onChange={e => setJiraId(e.target.value)}
                  placeholder="e.g. PROJ-1234"
                  className="w-full bg-slate-900/50 border border-slate-600/50 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Module</label>
                <input
                  type="text"
                  value={module}
                  onChange={e => setModule(e.target.value)}
                  placeholder="e.g. Authentication, Payments"
                  className="w-full bg-slate-900/50 border border-slate-600/50 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Business Flow</label>
                <textarea
                  value={businessFlow}
                  onChange={e => setBusinessFlow(e.target.value)}
                  rows={2}
                  placeholder="e.g. User enters email → receives OTP → enters OTP → session created → redirect to dashboard"
                  className="w-full bg-slate-900/50 border border-slate-600/50 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 resize-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Acceptance Criteria</label>
                <textarea
                  value={acceptanceCriteria}
                  onChange={e => setAcceptanceCriteria(e.target.value)}
                  rows={3}
                  placeholder="e.g.\n- OTP should expire in 5 minutes\n- Account locks after 5 failed attempts\n- Admin can reset locked accounts"
                  className="w-full bg-slate-900/50 border border-slate-600/50 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setStep(2)}
                disabled={!title.trim() || !description.trim()}
                className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-medium transition-all"
              >
                Next: Select Coverage
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Coverage Type Selection */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <Target className="w-5 h-5 text-violet-400" />
              Select Coverage Types
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              Choose which types of manual test cases to generate. This reduces noise and ensures relevant coverage.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {COVERAGE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => toggleType(opt.value)}
                  className={`relative flex flex-col items-start p-3 rounded-xl border transition-all text-left ${
                    selectedTypes.includes(opt.value)
                      ? 'bg-violet-600/20 border-violet-500/50 ring-1 ring-violet-500/30'
                      : 'bg-slate-900/30 border-slate-700/50 hover:border-slate-600/50'
                  }`}
                >
                  {selectedTypes.includes(opt.value) && (
                    <div className="absolute top-2 right-2">
                      <CheckSquare className="w-4 h-4 text-violet-400" />
                    </div>
                  )}
                  <span className="text-lg mb-1">{opt.icon}</span>
                  <span className={`text-sm font-medium ${selectedTypes.includes(opt.value) ? 'text-white' : 'text-slate-300'}`}>
                    {opt.label}
                  </span>
                  <span className="text-xs text-slate-500 mt-0.5">{opt.description}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-700/50">
              <div className="text-sm text-slate-400">
                {selectedTypes.length} type{selectedTypes.length !== 1 ? 's' : ''} selected
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm font-medium transition-all"
                >
                  Back
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={selectedTypes.length === 0}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-white rounded-lg font-medium transition-all shadow-lg shadow-violet-600/20"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate Test Cases
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Results */}
      {step === 3 && (
        <div className="space-y-6">
          {loading ? (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-12 text-center">
              <Loader2 className="w-12 h-12 text-violet-400 animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Generating Test Cases</h3>
              <p className="text-sm text-slate-400">AI is analyzing your requirement, creating manual test scenarios, and identifying coverage gaps...</p>
              <div className="flex items-center justify-center gap-4 mt-6 text-xs text-slate-500">
                <span>This may take 15-30 seconds...</span>
              </div>
            </div>
          ) : result ? (
            <ResultsDisplay result={result} onReset={handleReset} onViewHistory={onViewHistory} />
          ) : (
            <div className="bg-slate-800/50 rounded-xl border border-red-500/30 p-8 text-center">
              <XCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">Generation Failed</h3>
              <p className="text-sm text-slate-400 mb-2">Could not generate test cases. Please try again.</p>
              {error && (
                <p className="text-xs text-red-400/80 bg-red-500/10 rounded-lg px-3 py-2 mb-4 max-w-lg mx-auto">
                  {error}
                </p>
              )}
              <button onClick={handleReset} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm">
                Start Over
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Results Display                                                    */
/* ------------------------------------------------------------------ */

function ResultsDisplay({ result, onReset, onViewHistory }: { result: any; onReset: () => void; onViewHistory: () => void }) {
  const [expandedScenarios, setExpandedScenarios] = useState<Set<number>>(new Set([0]));
  const [expandedCases, setExpandedCases] = useState<Set<number>>(new Set());
  const [showGaps, setShowGaps] = useState(true);

  const analysis = result.requirementAnalysis || {};
  const scenarios = result.scenarios || [];
  const testCases = result.testCases || [];
  const gaps = result.coverageGaps || [];
  const stats = result.stats || {};
  const isSaved = result.requirementId != null;
  const warning = result._warning;

  const toggleScenario = (i: number) => {
    setExpandedScenarios(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const toggleCase = (i: number) => {
    setExpandedCases(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Success Banner */}
      <div className={`bg-gradient-to-r ${isSaved ? 'from-emerald-600/20 to-violet-600/20 border-emerald-500/30' : 'from-amber-600/20 to-orange-600/20 border-amber-500/30'} border rounded-xl p-5`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className={`w-8 h-8 ${isSaved ? 'text-emerald-400' : 'text-amber-400'}`} />
            <div>
              <h3 className="text-lg font-semibold text-white">Test Cases Generated Successfully</h3>
              <p className="text-sm text-slate-300 mt-0.5">
                {stats.totalScenarios || scenarios.length} scenarios • {stats.totalTestCases || testCases.length} test cases • {stats.automationReadyCount ?? testCases.filter((tc: any) => tc.automationReady).length} automation-ready • {stats.gapsFound ?? gaps.length} gaps found
              </p>
              {warning && (
                <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {warning}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {isSaved && (
              <button
                onClick={onViewHistory}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600/80 hover:bg-violet-500 text-sm text-white rounded-lg transition-all"
              >
                <ClipboardList className="w-3.5 h-3.5" />
                View in History
              </button>
            )}
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700/80 hover:bg-slate-600 text-sm text-slate-300 rounded-lg transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              New
            </button>
          </div>
        </div>
      </div>

      {/* Requirement Analysis */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
        <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-400" />
          Requirement Analysis
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-xs text-slate-500 mb-1">Feature Type</div>
            <div className="text-sm font-medium text-white capitalize">{analysis.featureType || 'N/A'}</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-xs text-slate-500 mb-1">Risk Level</div>
            <div className={`text-sm font-medium capitalize ${RISK_COLORS[analysis.riskLevel] || 'text-white'}`}>
              {analysis.riskLevel || 'N/A'}
            </div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-xs text-slate-500 mb-1">Impacted Modules</div>
            <div className="text-sm font-medium text-white">{(analysis.impactedModules || []).length}</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <div className="text-xs text-slate-500 mb-1">User Roles</div>
            <div className="text-sm font-medium text-white">{(analysis.userRolesAffected || []).length}</div>
          </div>
        </div>
        {analysis.summary && (
          <p className="text-sm text-slate-300 bg-slate-900/30 rounded-lg p-3">{analysis.summary}</p>
        )}
        {analysis.workflowSteps?.length > 0 && (
          <div className="mt-3">
            <div className="text-xs text-slate-500 mb-2">Workflow</div>
            <div className="flex flex-wrap items-center gap-1.5">
              {analysis.workflowSteps.map((s: string, i: number) => (
                <span key={i} className="flex items-center gap-1">
                  <span className="bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded text-xs font-medium">{s}</span>
                  {i < analysis.workflowSteps.length - 1 && <ArrowRight className="w-3 h-3 text-slate-600" />}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Test Scenarios & Cases */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
        <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-blue-400" />
          Test Scenarios ({scenarios.length})
        </h3>
        <div className="space-y-3">
          {scenarios.map((sc: any, si: number) => {
            const isExpanded = expandedScenarios.has(si);
            const relatedCases = testCases.filter((tc: any) =>
              tc.tags?.some((t: string) => sc.coverageType.includes(t) || sc.scenario.toLowerCase().includes(t.toLowerCase()))
            );
            return (
              <div key={si} className="border border-slate-700/50 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleScenario(si)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-slate-700/30 transition-all text-left"
                >
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  <span className={`px-2 py-0.5 rounded text-xs font-bold border ${PRIORITY_COLORS[sc.priority] || PRIORITY_COLORS.P2}`}>
                    {sc.priority}
                  </span>
                  <span className="text-sm text-white flex-1">{sc.scenario}</span>
                  <span className="text-xs bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded">{sc.coverageType}</span>
                </button>
                {isExpanded && sc.riskArea && (
                  <div className="px-3 pb-3 pt-0">
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Risk: {sc.riskArea}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Test Cases */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
        <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          Test Cases ({testCases.length})
          <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded ml-auto">
            {stats.automationReadyCount} automation-ready
          </span>
        </h3>
        <div className="space-y-2">
          {testCases.map((tc: any, ci: number) => {
            const isExpanded = expandedCases.has(ci);
            return (
              <div key={ci} className="border border-slate-700/50 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleCase(ci)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-slate-700/30 transition-all text-left"
                >
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  <span className={`px-2 py-0.5 rounded text-xs font-bold border ${PRIORITY_COLORS[tc.priority] || PRIORITY_COLORS.P2}`}>
                    {tc.priority}
                  </span>
                  <span className="text-sm text-white flex-1 line-clamp-1">{tc.title}</span>
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-xs ${SEVERITY_COLORS[tc.severity] || ''}`}>
                      {tc.severity}
                    </span>
                    {tc.automationReady && (
                      <span title="Automation Ready"><Zap className="w-3.5 h-3.5 text-emerald-400" /></span>
                    )}
                  </div>
                </button>
                {isExpanded && (
                  <div className="border-t border-slate-700/50 p-4 bg-slate-900/30 space-y-3">
                    {tc.preconditions && (
                      <div>
                        <div className="text-xs font-medium text-slate-500 mb-1">Preconditions</div>
                        <div className="text-sm text-slate-300">{tc.preconditions}</div>
                      </div>
                    )}
                    {tc.steps?.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-slate-500 mb-1">Steps</div>
                        <ol className="list-decimal list-inside space-y-1">
                          {tc.steps.map((s: string, i: number) => (
                            <li key={i} className="text-sm text-slate-300">{s}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-medium text-slate-500 mb-1">Expected Result</div>
                      <div className="text-sm text-emerald-300">{tc.expectedResult}</div>
                    </div>
                    {tc.testData && (
                      <div>
                        <div className="text-xs font-medium text-slate-500 mb-1">Test Data</div>
                        <div className="text-sm text-slate-300 font-mono bg-slate-800/50 px-2 py-1 rounded">{tc.testData}</div>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-700/30">
                      {tc.tags?.map((tag: string, ti: number) => (
                        <span key={ti} className="bg-slate-700/50 text-slate-400 px-2 py-0.5 rounded text-xs flex items-center gap-1">
                          <Tag className="w-3 h-3" />{tag}
                        </span>
                      ))}
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        tc.automationReady ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-600/30 text-slate-500'
                      }`}>
                        {tc.automationReady ? '✓ Automation Ready' : '✗ Manual Only'}
                      </span>
                      {tc.automationComplexity && (
                        <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded text-xs">
                          Complexity: {tc.automationComplexity}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Coverage Gaps */}
      {gaps.length > 0 && (
        <div className="bg-slate-800/50 rounded-xl border border-amber-500/30 p-5">
          <button
            onClick={() => setShowGaps(!showGaps)}
            className="w-full flex items-center gap-2 text-left"
          >
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="text-base font-semibold text-white flex-1">
              Coverage Gaps ({gaps.length})
            </h3>
            {showGaps ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          {showGaps && (
            <div className="mt-4 space-y-3">
              {gaps.map((gap: any, gi: number) => (
                <div key={gi} className="bg-slate-900/40 border border-slate-700/50 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Shield className={`w-4 h-4 mt-0.5 ${RISK_COLORS[gap.severity] || 'text-amber-400'}`} />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">{gap.area}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{gap.description}</div>
                      <div className="text-xs text-emerald-400 mt-1.5 flex items-center gap-1">
                        <Lightbulb className="w-3 h-3" />
                        {gap.suggestion}
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs ${SEVERITY_COLORS[gap.severity] || ''}`}>
                      {gap.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  History Tab                                                        */
/* ------------------------------------------------------------------ */

function HistoryTab() {
  const [requirements, setRequirements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchRequirements = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/test-coverage/requirements');
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
  }, []);

  useEffect(() => { fetchRequirements(); }, [fetchRequirements]);

  const viewDetail = async (id: number) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/test-coverage/requirements/${id}`);
      const data = await res.json();
      setSelectedReq(data);
    } catch { /* ignore */ }
    setDetailLoading(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this requirement and all generated test cases?')) return;
    await fetch(`/api/test-coverage/requirements/${id}`, { method: 'DELETE' });
    setSelectedReq(null);
    fetchRequirements();
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
        <button onClick={fetchRequirements} className="p-2 hover:bg-slate-700/50 rounded-lg transition-all">
          <RefreshCw className="w-4 h-4 text-slate-400" />
        </button>
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
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => viewDetail(req.id)}
                    className="p-2 hover:bg-slate-700/50 rounded-lg transition-all"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4 text-slate-400" />
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
    </div>
  );
}

/* ---- Requirement Detail View ---- */
function RequirementDetail({ data, onBack, onDelete, loading }: { data: any; onBack: () => void; onDelete: (id: number) => void; loading: boolean }) {
  const [expandedCases, setExpandedCases] = useState<Set<number>>(new Set());
  const req = data.requirement || {};
  const scenarios = data.scenarios || [];
  const testCases = data.testCases || [];
  const analysis = req.analysis || {};

  const toggleCase = (i: number) => {
    setExpandedCases(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });
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
          onClick={() => onDelete(req.id)}
          className="p-2 hover:bg-red-500/20 rounded-lg transition-all"
        >
          <Trash2 className="w-4 h-4 text-red-400" />
        </button>
      </div>

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

      {/* Test Cases */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
        <h4 className="text-sm font-semibold text-white mb-3">{testCases.length} Test Cases</h4>
        <div className="space-y-2">
          {testCases.map((tc: any, ci: number) => {
            const isExpanded = expandedCases.has(ci);
            const steps = typeof tc.steps === 'string' ? JSON.parse(tc.steps) : (tc.steps || []);
            const tags = typeof tc.tags === 'string' ? JSON.parse(tc.tags) : (tc.tags || []);
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
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stats Tab                                                          */
/* ------------------------------------------------------------------ */

function StatsTab() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/test-coverage/stats');
        const data = await res.json();
        setStats(data);
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

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
      {/* Metric Cards */}
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

      {/* Coverage Type Breakdown */}
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

      {/* Priority Breakdown */}
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
