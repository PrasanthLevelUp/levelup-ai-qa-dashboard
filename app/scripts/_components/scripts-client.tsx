'use client';

import { useEffect, useState, useCallback } from 'react';
import { ProjectSetup } from './project-setup';
import { ScriptGenerator } from './script-generator';
import { ScriptHistoryTab } from './script-history-tab';
import { ScriptHealthTab } from './script-health-tab';
import { MigrationAssistant } from './migration-assistant';
import { UploadTestCases } from './upload-test-cases';
import {
  Settings,
  Pencil,
  Plus,
  RefreshCw,
  FolderOpen,
  ChevronDown,
  ChevronUp,
  Sparkles,
  FileSpreadsheet,
  History,
  Code2,
  Activity,
  ShieldCheck,
  ArrowRight,
  GitMerge,
  Download,
} from 'lucide-react';

export interface ProjectContext {
  id: number;
  name: string;
  appUrl: string;
  framework: string | null;
  authMethod: string | null;
  selectorStrategy: string | null;
  appDescription: string | null;
  navigationFlow: string | null;
  customRules: string | null;
  credentials: string | null;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  _count?: { scripts: number };
}

export interface GeneratedScriptRecord {
  id: number;
  projectContextId: number | null;
  url: string;
  pageType: string | null;
  instructions: string | null;
  validationStatus: string | null;
  reliabilityScore: number | null;
  tokensUsed: number | null;
  model: string | null;
  generationTimeMs: number | null;
  filesGenerated: any;
  createdAt: string | null;
  projectContext?: { name: string } | null;
}

export function ScriptsClient() {
  const [contexts, setContexts] = useState<ProjectContext[]>([]);
  const [activeContext, setActiveContext] = useState<ProjectContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [editingContext, setEditingContext] = useState<ProjectContext | null>(null);
  const [showContextPanel, setShowContextPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<'generate' | 'history' | 'health' | 'migrate'>('generate');
  // Sprint 4 — deep link from the Test Case Lab: /scripts?requirement_id=X&test_case_id=Y.
  // Read once on mount (window.location avoids a Suspense boundary for useSearchParams).
  const [deepLink, setDeepLink] = useState<{ requirementId: string | null; testCaseId: string | null }>({
    requirementId: null,
    testCaseId: null,
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    const requirementId = sp.get('requirement_id');
    const testCaseId = sp.get('test_case_id');
    if (requirementId || testCaseId) {
      setDeepLink({ requirementId, testCaseId });
      setActiveTab('generate');
    }
  }, []);

  const fetchContexts = useCallback(async () => {
    try {
      const res = await fetch('/api/project-context');
      const data = await res.json();
      if (data.success && data.data) {
        setContexts(data.data);
        if (data.data.length > 0 && !activeContext) {
          setActiveContext(data.data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch contexts:', err);
    }
  }, [activeContext]);

  useEffect(() => {
    fetchContexts().finally(() => setLoading(false));
  }, [fetchContexts]);

  const handleContextSaved = (ctx: ProjectContext) => {
    setShowSetup(false);
    setEditingContext(null);
    setActiveContext(ctx);
    fetchContexts();
  };

  const handleScriptGenerated = () => {
    fetchContexts(); // refresh script count
  };

  const handleEditContext = (ctx: ProjectContext) => {
    setEditingContext(ctx);
    setShowSetup(true);
  };

  const hasContexts = contexts.length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-slate-400">
          <RefreshCw size={20} className="animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  // No project context yet — show full-page setup wizard
  if (!hasContexts && !showSetup) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white font-display">Script Generation</h1>
          <p className="text-sm text-slate-400 mt-1">AI-powered test script creation from plain English</p>
        </div>

        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/20 to-violet-600/20 border border-violet-500/30 flex items-center justify-center mb-6">
            <FolderOpen size={32} className="text-violet-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Set Up Your First Project</h2>
          <p className="text-sm text-slate-400 text-center max-w-md mb-8">
            Before generating test scripts, tell us about your application. This context
            helps the AI create scripts that match your framework, selectors, and patterns.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={() => setShowSetup(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white font-medium transition-all shadow-lg shadow-violet-500/20"
            >
              <Plus size={18} />
              Set Up Project
            </button>
            <a
              href="/levelup-playwright-framework.zip"
              download
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#1e293b] border border-[#334155] text-slate-300 hover:text-white hover:bg-[#334155] font-medium transition-colors"
              title="Download a ready-to-use Playwright + TypeScript starter framework (Page Object Model, helpers, fixtures, config & README) to base your project on."
            >
              <Download size={18} />
              Download Framework
            </a>
          </div>
          <p className="text-xs text-slate-500 text-center mt-4 max-w-md">
            New to automation? Download the starter Playwright framework, push it to GitHub,
            and connect it via Repo Intelligence so generated scripts match its patterns.
          </p>
        </div>
      </div>
    );
  }

  // Show setup form (create or edit)
  if (showSetup) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white font-display">
              {editingContext ? 'Edit Project Context' : 'New Project Setup'}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              {editingContext
                ? 'Update your application details for smarter script generation'
                : 'Tell us about your application for intelligent test generation'}
            </p>
          </div>
          {hasContexts && (
            <button
              onClick={() => { setShowSetup(false); setEditingContext(null); }}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              ← Back to Scripts
            </button>
          )}
        </div>
        <ProjectSetup
          existing={editingContext}
          onSaved={handleContextSaved}
          onCancel={hasContexts ? () => { setShowSetup(false); setEditingContext(null); } : undefined}
        />
      </div>
    );
  }

  // Main view — has context, show generator + history via tabs
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-display">Script Generation</h1>
          <p className="text-sm text-slate-400 mt-1">AI-powered test script creation from plain English</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/intelligence"
            className="group flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-violet-600/20 to-blue-600/20 border border-violet-500/40 text-violet-300 hover:text-white hover:from-violet-600/40 hover:to-blue-600/40 transition-all text-xs font-medium shadow-sm shadow-violet-500/10"
            title="Open the Intelligence Hub — see the health of every intelligence source (Repository, App Profiles, Knowledge, DOM Memory, Learning & more), grounding scores and recommended actions."
          >
            <ShieldCheck size={12} className="text-violet-400 group-hover:text-white transition-colors" />
            Intelligence Hub
            <ArrowRight size={12} className="opacity-0 -ml-1 group-hover:opacity-100 group-hover:ml-0 transition-all" />
          </a>
          <a
            href="/levelup-playwright-framework.zip"
            download
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1e293b] border border-[#334155] text-slate-300 hover:text-white hover:bg-[#334155] transition-colors text-xs"
            title="Download a ready-to-use Playwright + TypeScript starter framework (Page Object Model, helpers, fixtures, config & README). Push it to GitHub and connect it to Repo Intelligence so generated scripts match your patterns."
          >
            <Download size={12} />
            Download Framework
          </a>
          <button
            onClick={() => setShowSetup(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1e293b] border border-[#334155] text-slate-300 hover:text-white hover:bg-[#334155] transition-colors text-xs"
            title="Set up a new project context (target app URL, framework, selectors) to generate scripts against. Switch between projects from the project selector when you have more than one."
          >
            <Plus size={12} />
            New Project
          </button>
        </div>
      </div>

      {/* Top-Level Tab Switcher */}
      <div className="flex gap-1 bg-[#0c1222] p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('generate')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-medium transition-colors ${
            activeTab === 'generate'
              ? 'bg-[#1a1f2e] text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Code2 size={13} />
          Generate Scripts
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-medium transition-colors ${
            activeTab === 'history'
              ? 'bg-[#1a1f2e] text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <History size={13} />
          History
        </button>
        <button
          onClick={() => setActiveTab('health')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-medium transition-colors ${
            activeTab === 'health'
              ? 'bg-[#1a1f2e] text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Activity size={13} />
          Script Health
        </button>
        <button
          onClick={() => setActiveTab('migrate')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-medium transition-colors ${
            activeTab === 'migrate'
              ? 'bg-[#1a1f2e] text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <GitMerge size={13} />
          Migration Assistant
        </button>
      </div>

      {/* ---- Generate Tab ---- */}
      {activeTab === 'generate' && (
        <>
          {/* Active Project Context Card */}
          {activeContext && (
            <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl overflow-hidden">
              <button
                onClick={() => setShowContextPanel(!showContextPanel)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-[#1e2538] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center">
                    <Settings size={16} className="text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] uppercase tracking-wider text-violet-400/70 font-medium">Project Context</p>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-white">{activeContext.name}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400">
                        Active
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Default target &amp; generation settings · {activeContext.appUrl}
                      {activeContext.framework && ` · ${activeContext.framework}`}
                      {activeContext._count && ` · ${activeContext._count.scripts} scripts generated`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEditContext(activeContext); }}
                    className="p-1.5 rounded-md hover:bg-[#334155] text-slate-400 hover:text-white transition-colors"
                    title="Edit project context"
                  >
                    <Pencil size={13} />
                  </button>
                  {showContextPanel ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
                </div>
              </button>

              {showContextPanel && (
                <div className="px-5 pb-4 border-t border-[#2a3040]">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                    {activeContext.appDescription && (
                      <ContextField label="App Description" value={activeContext.appDescription} />
                    )}
                    {activeContext.framework && (
                      <ContextField label="Framework" value={activeContext.framework} />
                    )}
                    {activeContext.authMethod && (
                      <ContextField label="Auth Method" value={activeContext.authMethod} />
                    )}
                    {activeContext.selectorStrategy && (
                      <ContextField label="Selector Strategy" value={activeContext.selectorStrategy} />
                    )}
                    {activeContext.navigationFlow && (
                      <ContextField label="Navigation Flow" value={activeContext.navigationFlow} />
                    )}
                    {activeContext.customRules && (
                      <ContextField label="Custom Rules" value={activeContext.customRules} />
                    )}
                  </div>

                  {/* Context switcher if multiple projects */}
                  {contexts.length > 1 && (
                    <div className="mt-3 pt-3 border-t border-[#2a3040]">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Switch Project</p>
                      <div className="flex flex-wrap gap-2">
                        {contexts.map((ctx) => (
                          <button
                            key={ctx.id}
                            onClick={() => { setActiveContext(ctx); setShowContextPanel(false); }}
                            className={`px-3 py-1.5 rounded-lg text-xs transition-colors border ${
                              ctx.id === activeContext.id
                                ? 'bg-violet-500/10 border-violet-500/30 text-violet-400'
                                : 'bg-[#0c1222] border-[#334155] text-slate-400 hover:text-white hover:border-slate-500'
                            }`}
                          >
                            {ctx.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Input Mode Tabs + Generator */}
          {activeContext && (
            <InputModes
              projectContext={activeContext}
              onGenerated={handleScriptGenerated}
              deepLink={deepLink}
            />
          )}

        </>
      )}

      {/* ---- History Tab ---- */}
      {activeTab === 'history' && (
        <ScriptHistoryTab />
      )}

      {/* ---- Script Health Tab ---- */}
      {activeTab === 'health' && (
        <ScriptHealthTab />
      )}

      {/* ---- Migration Assistant Tab ---- */}
      {activeTab === 'migrate' && (
        <MigrationAssistant />
      )}

    </div>
  );
}

type InputMode = 'scenario' | 'upload';

function InputModes({
  projectContext,
  onGenerated,
  deepLink,
}: {
  projectContext: ProjectContext;
  onGenerated: () => void;
  deepLink?: { requirementId: string | null; testCaseId: string | null };
}) {
  const [mode, setMode] = useState<InputMode>('scenario');
  const [uploadScenarios, setUploadScenarios] = useState<string[] | null>(null);

  const handleScenariosReady = (scenarios: string[]) => {
    setUploadScenarios(scenarios);
    setMode('scenario'); // Switch to scenario mode with pre-filled scenarios
  };

  return (
    <div className="space-y-4">
      {/* Mode Tabs */}
      <div className="flex gap-1 bg-[#0c1222] p-1 rounded-lg w-fit">
        <button
          onClick={() => setMode('scenario')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-medium transition-colors ${
            mode === 'scenario'
              ? 'bg-[#1a1f2e] text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Sparkles size={12} />
          Plain English
        </button>
        <button
          onClick={() => setMode('upload')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-medium transition-colors ${
            mode === 'upload'
              ? 'bg-[#1a1f2e] text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <FileSpreadsheet size={12} />
          Upload CSV/Excel
        </button>
      </div>

      {/* Active Mode */}
      {mode === 'scenario' && (
        <ScriptGenerator
          projectContext={projectContext}
          onGenerated={onGenerated}
          prefillScenarios={uploadScenarios}
          onPrefillConsumed={() => setUploadScenarios(null)}
          requirementId={deepLink?.requirementId ?? null}
          testCaseId={deepLink?.testCaseId ?? null}
        />
      )}

      {mode === 'upload' && (
        <UploadTestCases
          projectContext={projectContext}
          onScenariosReady={handleScenariosReady}
        />
      )}
    </div>
  );
}

function ContextField({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#0c1222] rounded-lg p-3">
      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">{value}</p>
    </div>
  );
}
