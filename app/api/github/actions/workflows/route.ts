export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders } from '@/lib/backend-proxy';

/**
 * GET /api/github/actions/workflows?owner=&repo=  (or ?repoUrl=)
 * Proxies to the backend GitHub Actions integration. Lists the workflows
 * defined in the repository's .github/workflows using the current user's PAT.
 */
export async function GET(req: NextRequest) {
  try {
    const qs = req.nextUrl.search; // forward owner/repo/repoUrl as-is
    const res = await fetch(backendUrl(`/api/github/actions/workflows${qs}`), {
      headers: proxyHeaders(),
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[GitHub Actions workflows]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list workflows' },
      { status: 502 },
    );
  }
}
