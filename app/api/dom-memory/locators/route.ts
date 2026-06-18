export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/**
 * GET /api/dom-memory/locators — Locator evolution (proxy)
 *
 * SECURITY (multi-tenant isolation): forwards workspace-context headers so the
 * backend scopes locator evolution by BOTH company_id AND project_id.
 */
export async function GET(req: NextRequest) {
  try {
    const limit = new URL(req.url).searchParams.get('limit') || '50';
    const res = await fetch(backendUrl(`/api/dom/locators?limit=${limit}`), {
      headers: proxyHeaders(extractProjectHeaders(req)),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[DOM Memory locators proxy]', error);
    return NextResponse.json({ success: false, error: 'Failed to reach backend' }, { status: 502 });
  }
}
