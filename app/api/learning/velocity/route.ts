export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/**
 * GET /api/learning/velocity — Learning velocity trend (proxy)
 *
 * SECURITY (multi-tenant isolation): forwards workspace-context headers so the
 * backend scopes the velocity trend by BOTH company_id AND project_id.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const days = searchParams.get('days') || '30';
    const res = await fetch(backendUrl(`/api/learning/velocity?days=${days}`), {
      headers: proxyHeaders(extractProjectHeaders(req)),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[Learning velocity proxy]', error);
    return NextResponse.json({ success: false, error: 'Failed to reach backend' }, { status: 502 });
  }
}
