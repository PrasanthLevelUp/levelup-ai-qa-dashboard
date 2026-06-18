export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/**
 * GET /api/dom-memory/snapshots — DOM snapshots list (proxy)
 *
 * SECURITY (multi-tenant isolation): forwards workspace-context headers so the
 * backend scopes the snapshots list by BOTH company_id AND project_id.
 */
export async function GET(req: NextRequest) {
  try {
    const limit = new URL(req.url).searchParams.get('limit') || '50';
    const res = await fetch(backendUrl(`/api/dom/snapshots?limit=${limit}`), {
      headers: proxyHeaders(extractProjectHeaders(req)),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[DOM Memory snapshots proxy]', error);
    return NextResponse.json({ success: false, error: 'Failed to reach backend' }, { status: 502 });
  }
}
