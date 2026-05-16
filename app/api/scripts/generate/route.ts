export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:8080';
const API_KEY = process.env.BACKEND_API_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectContextId, url, scenario, testTypes, includeNegativeTests } = body;

    if (!url || !scenario) {
      return NextResponse.json(
        { success: false, error: 'url and scenario are required' },
        { status: 400 }
      );
    }

    // Load project context if provided to enrich instructions
    let enrichedInstructions = scenario;
    let credentials: { username?: string; password?: string } | undefined;

    if (projectContextId) {
      const ctx = await prisma.projectContext.findUnique({
        where: { id: Number(projectContextId) },
      });
      if (ctx) {
        const contextParts: string[] = [];
        if (ctx.appDescription) contextParts.push(`Application: ${ctx.appDescription}`);
        if (ctx.framework) contextParts.push(`Framework: ${ctx.framework}`);
        if (ctx.authMethod) contextParts.push(`Auth: ${ctx.authMethod}`);
        if (ctx.selectorStrategy) contextParts.push(`Selector convention: ${ctx.selectorStrategy}`);
        if (ctx.navigationFlow) contextParts.push(`Navigation: ${ctx.navigationFlow}`);
        if (ctx.customRules) contextParts.push(`Rules: ${ctx.customRules}`);

        if (contextParts.length > 0) {
          enrichedInstructions = `PROJECT CONTEXT:\n${contextParts.join('\n')}\n\nTEST SCENARIO:\n${scenario}`;
        }

        if (ctx.credentials) {
          try {
            credentials = JSON.parse(ctx.credentials);
          } catch {
            // ignore parse errors
          }
        }
      }
    }

    console.log('[ScriptGen] Generating for:', url, 'with context:', !!projectContextId);

    // Call backend script generation engine
    const response = await fetch(`${BACKEND_URL}/api/scripts/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'x-api-key': API_KEY,
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
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || 'Backend generation failed', details: data },
        { status: response.status }
      );
    }

    // Also save to dashboard DB for local history
    if (data.success && data.data) {
      try {
        await prisma.generatedScript.create({
          data: {
            projectContextId: projectContextId ? Number(projectContextId) : null,
            url,
            pageType: data.data.testPlan?.pageType || 'unknown',
            instructions: scenario,
            scriptContent: data.data.files?.map((f: any) => `// === ${f.path} ===`).join('\n') || null,
            testPlan: data.data.testPlan || null,
            validationStatus: data.data.validationReport?.overallScore >= 80 ? 'passed' : 'needs_review',
            reliabilityScore: data.data.validationReport?.overallScore || 0,
            tokensUsed: data.data.stats?.tokensUsed || 0,
            model: data.data.stats?.model || null,
            generationTimeMs: data.data.generationTimeMs || 0,
            filesGenerated: data.data.files || null,
            negativeTestsIncluded: includeNegativeTests ?? true,
          },
        });
      } catch (dbErr) {
        console.error('[ScriptGen] Failed to save to dashboard DB (non-blocking):', dbErr);
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[ScriptGen] Generate error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate scripts', details: String(error) },
      { status: 500 }
    );
  }
}
