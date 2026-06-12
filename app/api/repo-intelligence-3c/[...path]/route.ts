export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/**
 * Catch-all proxy for the Phase 3C Repository Intelligence API
 * (health / impact / knowledge-graph). Forwards GET requests — including the
 * query string — to the backend `/api/repo-intelligence-3c/*` routes, carrying
 * the auth key + session cookie + project headers.
 *
 * The backend route groups are themselves feature-flagged (they return 404 when
 * the corresponding ENABLE_* flag is off), so this proxy is a thin pass-through.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  try {
    const subPath = (params.path || []).join('/');
    const qs = req.nextUrl.search || '';
    const response = await fetch(
      backendUrl(`/api/repo-intelligence-3c/${subPath}${qs}`),
      {
        headers: proxyHeaders(extractProjectHeaders(req)),
        cache: 'no-store',
      },
    );
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[RepoIntelligence3C] proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to reach repo-intelligence-3c backend', details: String(error) },
      { status: 502 },
    );
  }
}
