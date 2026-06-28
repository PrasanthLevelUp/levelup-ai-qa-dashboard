export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/**
 * GET /api/github/actions/check-pr-access?owner=&repo=  (or ?repoUrl=)
 *
 * Proxies to the backend PR push-access pre-flight. Answers "will the Create PR
 * button work?" by mirroring the EXACT token resolution the PR-creation flow
 * uses (process.env.GITHUB_TOKEN). Returns tokenSource / tokenPresent /
 * tokenLength / canPush / reason. The token value itself is never returned.
 */
export async function GET(req: NextRequest) {
  try {
    const qs = req.nextUrl.search; // forward owner/repo/repoUrl as-is
    const res = await fetch(backendUrl(`/api/github/actions/check-pr-access${qs}`), {
      headers: proxyHeaders(extractProjectHeaders(req)),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[GitHub Actions check-pr-access]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check PR push access' },
      { status: 502 },
    );
  }
}
