export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders } from '@/lib/backend-proxy';

/**
 * GET /api/github/actions/runs/:runId/artifacts?owner=&repo=  (or ?repoUrl=)
 * Proxies the list of artifacts produced by a workflow run.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { runId: string } },
) {
  try {
    const qs = req.nextUrl.search;
    const res = await fetch(
      backendUrl(`/api/github/actions/runs/${encodeURIComponent(params.runId)}/artifacts${qs}`),
      { headers: proxyHeaders(), cache: 'no-store' },
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[GitHub Actions run artifacts]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list run artifacts' },
      { status: 502 },
    );
  }
}
