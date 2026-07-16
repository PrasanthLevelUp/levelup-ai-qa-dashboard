export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendGet, backendPost, BACKEND_URL, API_KEY } from '@/lib/backend-api';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      projectContextId, url, scenario, testTypes, includeNegativeTests, repoId,
      knowledgeItemIds, authConfig, additionalUrls, forceFreshCrawl,
      // ── Sprint 4: Enterprise Script Generation Enhancement ──
      testCaseId, requirementId, generationSource, locatorStrategy, folderStrategy,
      // Approved Generation Plan id — forwarded so the backend executes that
      // already-computed plan instead of re-analyzing the repository.
      planId,
      // Inline structured test cases from a CSV/Excel upload — forwarded so the
      // backend runs them through the deterministic, grounded engine.
      testCases,
    } = body;

    const missingFields: string[] = [];
    if (!url) missingFields.push('url');
    if (!scenario) missingFields.push('scenario');
    if (missingFields.length > 0) {
      return NextResponse.json(
        { success: false, error: `Missing required field(s): ${missingFields.join(', ')}. Please provide a target URL and test scenario.` },
        { status: 400 },
      );
    }

    // Load project context if provided to enrich instructions
    let enrichedInstructions = scenario;
    let credentials: { username?: string; password?: string } | undefined;

    // ── Prevent cross-project contamination ──────────────────────────────
    // Requirement-based and test-case-based generations run the backend's
    // DETERMINISTIC path, which derives URLs, selectors and credentials purely
    // from each test case's own data. Injecting an unrelated project context
    // (e.g. OrangeHRM's `Admin`/`admin123`) into those flows previously leaked
    // wrong credentials and instructions into SauceDemo scripts. So only enrich
    // from project context for plain-English / URL generations.
    const hasInlineTestCases = Array.isArray(testCases) && testCases.length > 0;
    const isDeterministicFlow = !!requirementId || testCaseId != null || hasInlineTestCases;
    if (projectContextId && isDeterministicFlow) {
      console.log('[ScriptGen] Skipping project-context enrichment for deterministic flow (requirement/test-case) to avoid contamination');
    }

    if (projectContextId && !isDeterministicFlow) {
      try {
        const ctxRes = await backendGet(`/api/dashboard/project-context/${projectContextId}`);
        const ctx = ctxRes?.data;
        if (ctx) {
          const contextParts: string[] = [];
          if (ctx.app_description) contextParts.push(`Application: ${ctx.app_description}`);
          if (ctx.framework) contextParts.push(`Framework: ${ctx.framework}`);
          if (ctx.auth_method) contextParts.push(`Auth: ${ctx.auth_method}`);
          if (ctx.selector_strategy) contextParts.push(`Selector convention: ${ctx.selector_strategy}`);
          if (ctx.navigation_flow) contextParts.push(`Navigation: ${ctx.navigation_flow}`);
          if (ctx.custom_rules) contextParts.push(`Rules: ${ctx.custom_rules}`);

          if (contextParts.length > 0) {
            enrichedInstructions = `PROJECT CONTEXT:\n${contextParts.join('\n')}\n\nTEST SCENARIO:\n${scenario}`;
          }

          if (ctx.credentials) {
            try {
              credentials = typeof ctx.credentials === 'string' ? JSON.parse(ctx.credentials) : ctx.credentials;
            } catch {
              // ignore parse errors
            }
          }
        }
      } catch (ctxErr) {
        console.error('[ScriptGen] Failed to load project context (non-blocking):', ctxErr);
      }
    }

    console.log('[ScriptGen] Generating for:', url, 'with context:', !!projectContextId);

    // Call backend script generation engine
    // Forward workspace context headers (project / environment / sprint) so the
    // backend can isolate by project and stamp new scripts with write-path
    // attribution (environment_id / sprint_id).
    const projectIdHeader = req.headers.get('x-project-id');
    const environmentIdHeader = req.headers.get('x-environment-id');
    const sprintIdHeader = req.headers.get('x-sprint-id');
    const response = await fetch(`${BACKEND_URL}/api/scripts/generate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        ...(projectIdHeader ? { 'x-project-id': projectIdHeader } : {}),
        ...(environmentIdHeader ? { 'x-environment-id': environmentIdHeader } : {}),
        ...(sprintIdHeader ? { 'x-sprint-id': sprintIdHeader } : {}),
      },
      body: JSON.stringify({
        url,
        instructions: enrichedInstructions,
        testTypes: testTypes || ['smoke', 'functional'],
        credentials,
        includeNegativeTests: includeNegativeTests ?? true,
        followLinks: false,
        maxPages: 3,
        ...(forceFreshCrawl ? { forceFreshCrawl: true } : {}),
        ...(repoId ? { repoId } : {}),
        ...(Array.isArray(knowledgeItemIds) && knowledgeItemIds.length > 0 ? { knowledgeItemIds } : {}),
        // ── Sprint 4: Requirement → Test Case → Script context + strategies ──
        ...(testCaseId != null ? { testCaseId } : {}),
        ...(requirementId ? { requirementId } : {}),
        ...(planId ? { planId } : {}),
        ...(hasInlineTestCases ? { testCases } : {}),
        ...(generationSource ? { generationSource } : {}),
        ...(locatorStrategy ? { locatorStrategy } : {}),
        ...(folderStrategy ? { folderStrategy } : {}),
        // Pass auth config through — backend validates & sanitizes
        ...(authConfig && typeof authConfig === 'object' && authConfig.username && authConfig.password
          ? { authConfig }
          : {}),
        ...(Array.isArray(additionalUrls) && additionalUrls.length > 0
          ? { additionalUrls }
          : {}),
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || 'Backend generation failed', details: data },
        { status: response.status },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[ScriptGen] Generate error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate scripts', details: String(error) },
      { status: 500 },
    );
  }
}
