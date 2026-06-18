export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/**
 * GET /api/learning/strategies — Strategy effectiveness (proxy)
 *
 * SECURITY (multi-tenant isolation): forwards workspace-context headers so the
 * backend scopes strategy effectiveness by BOTH company_id AND project_id.
 */
export async function GET(req: NextRequest) {
  try {
    const res = await fetch(backendUrl('/api/learning/strategies'), {
      headers: proxyHeaders(extractProjectHeaders(req)),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[Learning strategies proxy]', error);
    return NextResponse.json({ success: false, error: 'Failed to reach backend' }, { status: 502 });
  }
}
