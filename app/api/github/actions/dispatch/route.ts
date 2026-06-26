export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders } from '@/lib/backend-proxy';

/**
 * POST /api/github/actions/dispatch
 * Body: { owner?, repo?, repoUrl?, workflowId, ref?, inputs? }
 * Triggers a workflow via the backend's workflow_dispatch integration and
 * returns the correlated run (if it has appeared yet) for the UI to poll.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(backendUrl('/api/github/actions/dispatch'), {
      method: 'POST',
      headers: proxyHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[GitHub Actions dispatch]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to dispatch workflow' },
      { status: 502 },
    );
  }
}
