export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/**
 * GET /api/github/actions/diagnose?owner=&repo=  (or ?repoUrl=)  [&branch=] [&testFile=]
 *
 * Proxies to the backend healing-environment diagnostic. The backend clones the
 * target repo and runs the real healing stages (environment probe, xvfb smoke
 * test, clone, install, list tests, run spec) INSIDE the production container,
 * returning a verdict that pinpoints exactly where healing breaks.
 *
 * The diagnostic can take ~30-60s because it actually runs a Playwright spec,
 * so this proxy uses a long timeout and never caches.
 */
export async function GET(req: NextRequest) {
  try {
    const qs = req.nextUrl.search; // forward owner/repo/repoUrl/branch/testFile as-is
    const res = await fetch(backendUrl(`/api/github/actions/diagnose${qs}`), {
      headers: proxyHeaders(extractProjectHeaders(req)),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[GitHub Actions diagnose]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to run healing environment diagnostic' },
      { status: 502 },
    );
  }
}
