export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL, API_KEY } from '@/lib/backend-api';

/**
 * Generation Plan proxy — analyze only, NO generation.
 *
 * Forwards the same context a generation would receive (requirementId /
 * testCaseId / inline testCases + repoId) to the backend's read-only
 * /api/scripts/plan endpoint, which runs the frozen Requirement Intelligence
 * pipeline and returns a render-ready plan (decision, confidence, covered vs
 * missing flows, reused repo assets, estimated savings). The dashboard renders
 * this as the "Generation Plan" screen BEFORE the user approves generation.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      repoId,
      requirementId,
      testCaseId,
      testCases,
      scenario,
      instructions,
    } = body ?? {};

    const projectIdHeader = req.headers.get('x-project-id');
    const environmentIdHeader = req.headers.get('x-environment-id');
    const sprintIdHeader = req.headers.get('x-sprint-id');
    const sessionCookie = req.cookies.get('levelup_session')?.value;

    const response = await fetch(`${BACKEND_URL}/api/scripts/plan`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        ...(sessionCookie ? { Cookie: `levelup_session=${sessionCookie}` } : {}),
        ...(projectIdHeader ? { 'x-project-id': projectIdHeader } : {}),
        ...(environmentIdHeader ? { 'x-environment-id': environmentIdHeader } : {}),
        ...(sprintIdHeader ? { 'x-sprint-id': sprintIdHeader } : {}),
      },
      body: JSON.stringify({
        ...(repoId ? { repoId } : {}),
        ...(requirementId ? { requirementId } : {}),
        ...(testCaseId != null ? { testCaseId } : {}),
        ...(Array.isArray(testCases) && testCases.length > 0 ? { testCases } : {}),
        ...(scenario ? { scenario } : {}),
        ...(instructions ? { instructions } : {}),
      }),
      cache: 'no-store',
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || 'Backend plan failed', details: data },
        { status: response.status },
      );
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('[ScriptGen] Plan proxy error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to build generation plan', details: String(error) },
      { status: 500 },
    );
  }
}
