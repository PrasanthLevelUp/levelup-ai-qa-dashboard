export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/**
 * GET /api/dom-memory — DOM memory stats (proxy)
 *
 * SECURITY (multi-tenant isolation): forwards the workspace-context headers
 * (x-project-id / x-environment-id / x-sprint-id) so the backend scopes the
 * DOM-memory analytics by BOTH company_id AND project_id.
 */
export async function GET(req: NextRequest) {
  try {
    const res = await fetch(backendUrl('/api/dom/stats'), {
      headers: proxyHeaders(extractProjectHeaders(req)),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[DOM Memory stats proxy]', error);
    return NextResponse.json({ success: false, error: 'Failed to reach backend' }, { status: 502 });
  }
}
