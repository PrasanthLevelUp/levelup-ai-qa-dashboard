export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders } from '@/lib/backend-proxy';

/**
 * POST /api/github/actions/runs/:runId/record
 * Body: { owner?, repo?, repoUrl?, projectId?, profile? }
 *
 * Records a FINISHED workflow run's tests (pass + fail) as execution records on
 * the backend, so the run shows up on the Execution / Healing / Jobs screens.
 * Does NOT heal and does NOT re-run anything — healing stays an opt-in action.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { runId: string } },
) {
  try {
    const body = await req.json().catch(() => ({}));
    const res = await fetch(
      backendUrl(`/api/github/actions/runs/${encodeURIComponent(params.runId)}/record`),
      {
        method: 'POST',
        headers: proxyHeaders(),
        body: JSON.stringify(body),
      },
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[GitHub Actions record run]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to record workflow run' },
      { status: 502 },
    );
  }
}
