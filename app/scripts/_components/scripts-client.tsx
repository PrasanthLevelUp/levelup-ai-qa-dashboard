'use client';

import { useEffect, useState, useCallback } from 'react';
import { ProjectSetup } from './project-setup';
import { ScriptGenerator } from './script-generator';
import { ScriptHistory } from './script-history';
import { UploadTestCases } from './upload-test-cases';
import {
  Settings,
  Pencil,
  Plus,
  RefreshCw,
  FileCode,
  FolderOpen,
  ChevronDown,
  ChevronUp,
  Sparkles,
  FileSpreadsheet,
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
  const [scripts, setScripts] = useState<GeneratedScriptRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [editingContext, setEditingContext] = useState<ProjectContext | null>(null);
  const [showContextPanel, setShowContextPanel] = useState(false);

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

  const fetchScripts = useCallback(async () => {
    try {
      const res = await fetch('/api/scripts/recent');
      const data = await res.json();
      if (data.success && data.data) {
        setScripts(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch scripts:', err);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchContexts(), fetchScripts()]).finally(() => setLoading(false));
  }, [fetchContexts, fetchScripts]);

  const handleContextSaved = (ctx: ProjectContext) => {
    setShowSetup(false);
    setEditingContext(null);
    setActiveContext(ctx);
    fetchContexts();
  };

  const handleScriptGenerated = () => {
    fetchScripts();
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
          <button
            onClick={() => setShowSetup(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white font-medium transition-all shadow-lg shadow-violet-500/20"
          >
            <Plus size={18} />
            Set Up Project
          </button>
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

  // Main view — has context, show generator + history
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-display">Script Generation</h1>
          <p className="text-sm text-slate-400 mt-1">AI-powered test script creation from plain English</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSetup(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1e293b] border border-[#334155] text-slate-300 hover:text-white hover:bg-[#334155] transition-colors text-xs"
          >
            <Plus size={12} />
            New Project
          </button>
          <button
            onClick={() => fetchScripts()}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1e293b] border border-[#334155] text-slate-300 hover:text-white hover:bg-[#334155] transition-colors text-xs"
          >
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>
      </div>

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
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white">{activeContext.name}</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400">
                    Active
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeContext.appUrl}
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
        />
      )}

      {/* Script History */}
      <ScriptHistory scripts={scripts} />
    </div>
  );
}

type InputMode = 'scenario' | 'upload';

function InputModes({
  projectContext,
  onGenerated,
}: {
  projectContext: ProjectContext;
  onGenerated: () => void;
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
