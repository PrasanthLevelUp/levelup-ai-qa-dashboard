export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:8080';
const API_KEY = process.env.BACKEND_API_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { repository, branch, testFile, projectId, executionMode, providerConfig } = body;

    if (!repository) {
      return NextResponse.json(
        { error: 'Missing required field: repository' },
        { status: 400 }
      );
    }

    // Project scoping travels in the body because /api/heal does not run the
    // project-context middleware (it cannot read the x-project-id header).
    const payload: Record<string, unknown> = { repository, branch, testFile };
    if (projectId != null && projectId !== '') payload.projectId = Number(projectId);
    // Execution source (optional). Forward only for GitHub Actions; absence ⇒
    // backend defaults to the Local Runner (unchanged behavior, zero regression).
    if (executionMode === 'github_actions' && providerConfig && typeof providerConfig === 'object') {
      payload.executionMode = 'github_actions';
      payload.providerConfig = providerConfig;
    }

    console.log('[Trigger Job] Calling backend:', `${BACKEND_URL}/api/heal`, {
      repository, branch, testFile, projectId: payload.projectId,
      hasApiKey: !!API_KEY,
      apiKeyPrefix: API_KEY ? API_KEY.slice(0, 10) + '...' : 'EMPTY',
    });

    const response = await fetch(`${BACKEND_URL}/api/heal`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log('[Trigger Job] Backend response status:', response.status);

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || data.error || 'Failed to trigger healing', details: data },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Trigger Job] Error:', error);
    return NextResponse.json(
      { error: 'Failed to trigger healing job', details: String(error) },
      { status: 500 }
    );
  }
}
