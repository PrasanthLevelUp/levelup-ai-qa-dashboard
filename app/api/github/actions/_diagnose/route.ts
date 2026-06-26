export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders } from '@/lib/backend-proxy';

/**
 * GET /api/github/actions/_diagnose?owner=&repo=  (or ?repoUrl=)
 *
 * TEMPORARY diagnostic proxy. Forwards the user's session cookie to the
 * backend's step-by-step workflow-loading diagnostics so we can see EXACTLY
 * which step fails (DB context → SQL → token → GitHub API). Tokens are masked
 * by the backend; nothing sensitive is returned.
 */
export async function GET(req: NextRequest) {
  try {
    const qs = req.nextUrl.search; // forward owner/repo/repoUrl as-is
    const res = await fetch(backendUrl(`/api/github/actions/_diagnose${qs}`), {
      headers: proxyHeaders(),
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[GitHub Actions diagnose]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to run diagnostics' },
      { status: 502 },
    );
  }
}
