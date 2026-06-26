export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders } from '@/lib/backend-proxy';

/**
 * GET /api/github/actions/runs/:runId?owner=&repo=  (or ?repoUrl=)
 * Proxies a single workflow-run status lookup (used for polling).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { runId: string } },
) {
  try {
    const qs = req.nextUrl.search;
    const res = await fetch(
      backendUrl(`/api/github/actions/runs/${encodeURIComponent(params.runId)}${qs}`),
      { headers: proxyHeaders(), cache: 'no-store' },
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[GitHub Actions run]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get workflow run' },
      { status: 502 },
    );
  }
}
