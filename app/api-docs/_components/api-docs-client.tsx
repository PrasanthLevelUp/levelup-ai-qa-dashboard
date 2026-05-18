'use client';

import { useEffect, useRef, useState } from 'react';
import { BookOpen, ExternalLink, Copy, Check, Search } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Swagger UI Loader                                                  */
/* ------------------------------------------------------------------ */

function SwaggerUIEmbed() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Load Swagger UI CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css';
    document.head.appendChild(link);

    // Load Swagger UI JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js';
    script.onload = () => {
      if (containerRef.current && (window as any).SwaggerUIBundle) {
        (window as any).SwaggerUIBundle({
          url: '/openapi.json',
          dom_id: '#swagger-ui-container',
          deepLinking: true,
          presets: [
            (window as any).SwaggerUIBundle.presets.apis,
          ],
          layout: 'BaseLayout',
          defaultModelsExpandDepth: 2,
          defaultModelExpandDepth: 2,
          docExpansion: 'list',
          filter: true,
          showExtensions: true,
          showCommonExtensions: true,
          tryItOutEnabled: false,
        });
        setLoaded(true);
      }
    };
    document.body.appendChild(script);

    return () => {
      document.head.removeChild(link);
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div className="relative">
      {!loaded && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" />
          <span className="ml-3 text-slate-400">Loading Swagger UI...</span>
        </div>
      )}
      <div
        id="swagger-ui-container"
        ref={containerRef}
        className="swagger-dark-theme"
      />
      {/* Dark theme overrides for Swagger UI */}
      <style jsx global>{`
        .swagger-dark-theme .swagger-ui {
          background: transparent;
          color: #cbd5e1;
        }
        .swagger-dark-theme .swagger-ui .topbar { display: none; }
        .swagger-dark-theme .swagger-ui .info { margin: 0; }
        .swagger-dark-theme .swagger-ui .info .title { color: #f1f5f9; }
        .swagger-dark-theme .swagger-ui .info .description p { color: #94a3b8; }
        .swagger-dark-theme .swagger-ui .info a { color: #8b5cf6; }
        .swagger-dark-theme .swagger-ui .scheme-container {
          background: #1e293b;
          box-shadow: none;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
        }
        .swagger-dark-theme .swagger-ui .opblock-tag {
          color: #e2e8f0;
          border-bottom-color: #334155;
        }
        .swagger-dark-theme .swagger-ui .opblock-tag:hover { background: #1e293b40; }
        .swagger-dark-theme .swagger-ui .opblock-tag small { color: #64748b; }
        .swagger-dark-theme .swagger-ui .opblock {
          background: #1e293b;
          border-color: #334155;
          border-radius: 8px;
          margin-bottom: 8px;
          box-shadow: none;
        }
        .swagger-dark-theme .swagger-ui .opblock .opblock-summary {
          border-bottom-color: #334155;
        }
        .swagger-dark-theme .swagger-ui .opblock .opblock-summary-description {
          color: #94a3b8;
        }
        .swagger-dark-theme .swagger-ui .opblock .opblock-summary-method { border-radius: 6px; font-weight: 700; }
        .swagger-dark-theme .swagger-ui .opblock .opblock-summary-path { color: #e2e8f0; }
        .swagger-dark-theme .swagger-ui .opblock .opblock-summary-path__deprecated { color: #64748b; }
        .swagger-dark-theme .swagger-ui .opblock.opblock-get { background: #1e293b; border-color: #3b82f640; }
        .swagger-dark-theme .swagger-ui .opblock.opblock-get .opblock-summary { border-bottom-color: #3b82f620; }
        .swagger-dark-theme .swagger-ui .opblock.opblock-post { background: #1e293b; border-color: #10b98140; }
        .swagger-dark-theme .swagger-ui .opblock.opblock-post .opblock-summary { border-bottom-color: #10b98120; }
        .swagger-dark-theme .swagger-ui .opblock.opblock-put { background: #1e293b; border-color: #f59e0b40; }
        .swagger-dark-theme .swagger-ui .opblock.opblock-delete { background: #1e293b; border-color: #ef444440; }
        .swagger-dark-theme .swagger-ui .opblock.opblock-patch { background: #1e293b; border-color: #8b5cf640; }
        .swagger-dark-theme .swagger-ui .opblock-body pre {
          background: #0f172a;
          color: #e2e8f0;
          border-radius: 6px;
        }
        .swagger-dark-theme .swagger-ui .opblock-section-header {
          background: #0f172a80;
          box-shadow: none;
        }
        .swagger-dark-theme .swagger-ui .opblock-section-header h4 { color: #e2e8f0; }
        .swagger-dark-theme .swagger-ui .opblock-description-wrapper p { color: #94a3b8; }
        .swagger-dark-theme .swagger-ui table thead tr th,
        .swagger-dark-theme .swagger-ui table thead tr td { color: #94a3b8; border-bottom-color: #334155; }
        .swagger-dark-theme .swagger-ui table tbody tr td { color: #cbd5e1; border-bottom-color: #1e293b; }
        .swagger-dark-theme .swagger-ui .parameter__name { color: #e2e8f0; }
        .swagger-dark-theme .swagger-ui .parameter__type { color: #64748b; }
        .swagger-dark-theme .swagger-ui .parameter__in { color: #64748b; }
        .swagger-dark-theme .swagger-ui .response-col_status { color: #10b981; }
        .swagger-dark-theme .swagger-ui .response-col_description { color: #94a3b8; }
        .swagger-dark-theme .swagger-ui .responses-inner h4,
        .swagger-dark-theme .swagger-ui .responses-inner h5 { color: #e2e8f0; }
        .swagger-dark-theme .swagger-ui .model-box { background: #1e293b; }
        .swagger-dark-theme .swagger-ui .model { color: #cbd5e1; }
        .swagger-dark-theme .swagger-ui .model-title { color: #e2e8f0; }
        .swagger-dark-theme .swagger-ui .model .property { color: #94a3b8; }
        .swagger-dark-theme .swagger-ui .model .property.primitive { color: #8b5cf6; }
        .swagger-dark-theme .swagger-ui section.models { border-color: #334155; }
        .swagger-dark-theme .swagger-ui section.models h4 { color: #e2e8f0; border-bottom-color: #334155; }
        .swagger-dark-theme .swagger-ui section.models .model-container { background: #1e293b; border-radius: 8px; margin: 4px 0; }
        .swagger-dark-theme .swagger-ui .model-container { background: #1e293b; }
        .swagger-dark-theme .swagger-ui input[type=text],
        .swagger-dark-theme .swagger-ui textarea,
        .swagger-dark-theme .swagger-ui select {
          background: #0f172a;
          color: #e2e8f0;
          border-color: #334155;
          border-radius: 6px;
        }
        .swagger-dark-theme .swagger-ui .btn {
          color: #e2e8f0;
          border-color: #475569;
          border-radius: 6px;
        }
        .swagger-dark-theme .swagger-ui .btn:hover { background: #334155; }
        .swagger-dark-theme .swagger-ui .filter-container .operation-filter-input {
          background: #0f172a;
          color: #e2e8f0;
          border-color: #334155;
          border-radius: 8px;
          padding: 8px 12px;
        }
        .swagger-dark-theme .swagger-ui .loading-container .loading::after { color: #8b5cf6; }
        .swagger-dark-theme .swagger-ui .servers-title,
        .swagger-dark-theme .swagger-ui .servers > label { color: #94a3b8; }
        .swagger-dark-theme .swagger-ui .servers > label select {
          background: #0f172a;
          border-color: #334155;
          color: #e2e8f0;
        }
        .swagger-dark-theme .swagger-ui .arrow { fill: #64748b; }
        .swagger-dark-theme .swagger-ui svg.arrow { fill: #64748b; }
        .swagger-dark-theme .swagger-ui .expand-operation svg { fill: #64748b; }
        .swagger-dark-theme .swagger-ui .authorization__btn svg { fill: #94a3b8; }
        .swagger-dark-theme .swagger-ui .prop-type { color: #8b5cf6; }
        .swagger-dark-theme .swagger-ui .prop-format { color: #64748b; }
        .swagger-dark-theme .swagger-ui .renderedMarkdown p { color: #94a3b8; }
        .swagger-dark-theme .swagger-ui .markdown p, .swagger-dark-theme .swagger-ui .markdown code {
          color: #94a3b8;
        }
        .swagger-dark-theme .swagger-ui .response-control-media-type__accept-message { color: #10b981; }
        .swagger-dark-theme .swagger-ui .model-box-control,
        .swagger-dark-theme .swagger-ui .models-control { cursor: pointer; }
      `}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stats Bar                                                          */
/* ------------------------------------------------------------------ */

function StatsBar() {
  const [spec, setSpec] = useState<any>(null);

  useEffect(() => {
    fetch('/openapi.json').then(r => r.json()).then(setSpec).catch(() => {});
  }, []);

  if (!spec) return null;

  const paths = Object.keys(spec.paths || {});
  const methods = paths.flatMap(p => Object.keys(spec.paths[p]));
  const tags = spec.tags || [];
  const getCount = methods.filter(m => m === 'get').length;
  const postCount = methods.filter(m => m === 'post').length;
  const otherCount = methods.length - getCount - postCount;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
      {[
        { label: 'Total Endpoints', value: methods.length, color: 'text-violet-400 bg-violet-500/20' },
        { label: 'GET', value: getCount, color: 'text-blue-400 bg-blue-500/20' },
        { label: 'POST', value: postCount, color: 'text-emerald-400 bg-emerald-500/20' },
        { label: 'PUT/PATCH/DELETE', value: otherCount, color: 'text-amber-400 bg-amber-500/20' },
        { label: 'API Groups', value: tags.length, color: 'text-pink-400 bg-pink-500/20' },
      ].map((s, i) => (
        <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 text-center">
          <div className={`text-2xl font-bold ${s.color.split(' ')[0]}`}>{s.value}</div>
          <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function ApiDocsClient() {
  const [copied, setCopied] = useState(false);

  const copySpecUrl = () => {
    navigator.clipboard.writeText(window.location.origin + '/openapi.json');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">API Reference</h1>
              <p className="text-sm text-slate-400">OpenAPI 3.0 — Complete endpoint documentation</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={copySpecUrl}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-700/80 hover:bg-slate-600 text-sm text-slate-300 rounded-lg transition-all"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy Spec URL'}
            </button>
            <a
              href="/openapi.json"
              target="_blank"
              className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-500 text-sm text-white rounded-lg transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              Raw JSON
            </a>
          </div>
        </div>
      </div>

      <StatsBar />

      {/* Swagger UI */}
      <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-4 sm:p-6">
        <SwaggerUIEmbed />
      </div>
    </div>
  );
}
