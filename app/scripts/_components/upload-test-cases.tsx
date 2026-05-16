'use client';

import { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Trash2,
  ChevronDown,
  ChevronUp,
  Play,
  FileText,
} from 'lucide-react';
import type { ProjectContext } from './scripts-client';

interface ParsedTestCase {
  id: string;
  title: string;
  steps: string;
  expectedResult: string;
  priority: string;
  module: string;
  scenario: string;
}

interface ParseResult {
  success: boolean;
  data?: {
    fileName: string;
    totalRows: number;
    parsedCount: number;
    columns: Record<string, string | null>;
    modules: string[];
    testCases: ParsedTestCase[];
  };
  error?: string;
  detectedHeaders?: string[];
}

interface UploadTestCasesProps {
  projectContext: ProjectContext;
  onScenariosReady: (scenarios: string[]) => void;
}

export function UploadTestCases({ projectContext, onScenariosReady }: UploadTestCasesProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [selectedCases, setSelectedCases] = useState<Set<string>>(new Set());
  const [showPreview, setShowPreview] = useState(true);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file: File) => {
    setParsing(true);
    setParseResult(null);
    setSelectedCases(new Set());

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/scripts/parse-upload', {
        method: 'POST',
        body: formData,
      });

      const data: ParseResult = await res.json();
      setParseResult(data);

      if (data.success && data.data) {
        // Select all by default
        setSelectedCases(new Set(data.data.testCases.map(tc => tc.id)));
      }
    } catch (err) {
      setParseResult({ success: false, error: 'Failed to upload file' });
    } finally {
      setParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const toggleCase = (id: string) => {
    setSelectedCases(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (!parseResult?.data) return;
    if (selectedCases.size === parseResult.data.testCases.length) {
      setSelectedCases(new Set());
    } else {
      setSelectedCases(new Set(parseResult.data.testCases.map(tc => tc.id)));
    }
  };

  const handleGenerateSelected = () => {
    if (!parseResult?.data) return;
    const selected = parseResult.data.testCases.filter(tc => selectedCases.has(tc.id));
    const scenarios = selected.map(tc => tc.scenario);
    onScenariosReady(scenarios);
  };

  const getPriorityColor = (priority: string) => {
    const p = priority.toLowerCase();
    if (p.includes('high') || p.includes('critical') || p === 'p1') return 'text-red-400';
    if (p.includes('medium') || p === 'p2') return 'text-amber-400';
    return 'text-slate-500';
  };

  return (
    <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
          <FileSpreadsheet size={16} className="text-white" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">Upload Test Cases</h2>
          <p className="text-xs text-slate-500">
            Import from Excel/CSV — auto-converts to AI scenarios
          </p>
        </div>
      </div>

      {/* Upload Zone */}
      {!parseResult && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            dragOver
              ? 'border-blue-400 bg-blue-500/5'
              : 'border-[#334155] hover:border-blue-500/50 hover:bg-[#0c1222]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileInput}
            className="hidden"
          />

          {parsing ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 size={24} className="animate-spin text-blue-400" />
              <p className="text-sm text-slate-400">Parsing file...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload size={24} className="text-slate-500" />
              <p className="text-sm text-slate-300">Drop CSV or Excel file here</p>
              <p className="text-xs text-slate-500">
                Supports: .csv, .xlsx, .xls — columns like Title, Steps, Expected Result
              </p>
            </div>
          )}
        </div>
      )}

      {/* Parse Error */}
      {parseResult && !parseResult.success && (
        <div className="space-y-3">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <XCircle size={14} className="text-red-400" />
              <span className="text-sm text-red-400 font-medium">Parse Failed</span>
            </div>
            <p className="text-xs text-red-300/80">{parseResult.error}</p>
            {parseResult.detectedHeaders && (
              <div className="mt-2">
                <p className="text-[10px] text-slate-500 mb-1">Detected columns:</p>
                <div className="flex flex-wrap gap-1">
                  {parseResult.detectedHeaders.map(h => (
                    <span key={h} className="px-2 py-0.5 rounded bg-[#1e293b] text-[10px] text-slate-400">{h}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => { setParseResult(null); }}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            ← Try another file
          </button>
        </div>
      )}

      {/* Parse Success + Preview */}
      {parseResult?.success && parseResult.data && (
        <div className="space-y-3">
          {/* Summary */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-400" />
              <span className="text-sm text-emerald-400 font-medium">
                {parseResult.data.parsedCount} test cases parsed
              </span>
              <span className="text-xs text-slate-500">
                from {parseResult.data.fileName}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setParseResult(null); }}
                className="p-1.5 rounded-md hover:bg-[#334155] text-slate-400 hover:text-white transition-colors"
                title="Remove file"
              >
                <Trash2 size={13} />
              </button>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="p-1.5 rounded-md hover:bg-[#334155] text-slate-400 hover:text-white transition-colors"
              >
                {showPreview ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            </div>
          </div>

          {/* Column Mapping */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(parseResult.data.columns).map(([key, val]) =>
              val ? (
                <span key={key} className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-400">
                  {key}: {val}
                </span>
              ) : null
            )}
          </div>

          {/* Modules */}
          {parseResult.data.modules.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {parseResult.data.modules.map(m => (
                <span key={m} className="px-2 py-0.5 rounded bg-violet-500/10 border border-violet-500/20 text-[10px] text-violet-400">
                  {m}
                </span>
              ))}
            </div>
          )}

          {/* Test Cases Preview */}
          {showPreview && (
            <div className="bg-[#0c1222] rounded-lg border border-[#1e293b] overflow-hidden">
              {/* Select All Header */}
              <div className="px-3 py-2 border-b border-[#1e293b] flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCases.size === parseResult.data.testCases.length}
                    onChange={toggleAll}
                    className="w-3.5 h-3.5 rounded border-[#334155] bg-[#1a1f2e] text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                  />
                  <span className="text-xs text-slate-400">
                    {selectedCases.size} of {parseResult.data.testCases.length} selected
                  </span>
                </label>
              </div>

              {/* Cases List */}
              <div className="max-h-64 overflow-y-auto divide-y divide-[#1e293b]">
                {parseResult.data.testCases.map((tc) => (
                  <label
                    key={tc.id}
                    className={`px-3 py-2 flex items-start gap-2 cursor-pointer hover:bg-[#1a1f2e]/50 transition-colors ${
                      selectedCases.has(tc.id) ? '' : 'opacity-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCases.has(tc.id)}
                      onChange={() => toggleCase(tc.id)}
                      className="w-3.5 h-3.5 mt-0.5 rounded border-[#334155] bg-[#1a1f2e] text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-600 font-mono">{tc.id}</span>
                        <span className={`text-[10px] ${getPriorityColor(tc.priority)}`}>{tc.priority}</span>
                        {tc.module && (
                          <span className="text-[10px] text-violet-400/60">{tc.module}</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5 line-clamp-2">
                        {tc.title || tc.steps}
                      </p>
                      {tc.expectedResult && (
                        <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                          Expected: {tc.expectedResult}
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerateSelected}
            disabled={selectedCases.size === 0}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-all shadow-lg shadow-blue-500/20"
          >
            <Play size={16} />
            Generate Scripts for {selectedCases.size} Test Case{selectedCases.size !== 1 ? 's' : ''}
          </button>
        </div>
      )}
    </div>
  );
}
