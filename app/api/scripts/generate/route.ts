export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendGet, backendPost, BACKEND_URL, API_KEY } from '@/lib/backend-api';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectContextId, url, scenario, testTypes, includeNegativeTests, repoId } = body;

    if (!url || !scenario) {
      return NextResponse.json(
        { success: false, error: 'url and scenario are required' },
        { status: 400 },
      );
    }

    // Load project context if provided to enrich instructions
    let enrichedInstructions = scenario;
    let credentials: { username?: string; password?: string } | undefined;

    if (projectContextId) {
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
    const response = await fetch(`${BACKEND_URL}/api/scripts/generate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        instructions: enrichedInstructions,
        testTypes: testTypes || ['smoke', 'functional'],
        credentials,
        includeNegativeTests: includeNegativeTests ?? true,
        followLinks: false,
        maxPages: 3,
        ...(repoId ? { repoId } : {}),
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
