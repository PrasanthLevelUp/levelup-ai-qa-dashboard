export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/**
 * GET /api/learning/top — Top patterns by usage (proxy)
 *
 * SECURITY (multi-tenant isolation): forwards workspace-context headers so the
 * backend scopes the top patterns by BOTH company_id AND project_id.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get('limit') || '10';
    const res = await fetch(backendUrl(`/api/learning/top?limit=${limit}`), {
      headers: proxyHeaders(extractProjectHeaders(req)),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[Learning top patterns proxy]', error);
    return NextResponse.json({ success: false, error: 'Failed to reach backend' }, { status: 502 });
  }
}
