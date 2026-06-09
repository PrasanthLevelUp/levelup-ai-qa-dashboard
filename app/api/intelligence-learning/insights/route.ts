export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/** GET /api/intelligence-learning/insights — intelligence insights feed (optional ?type=) */
export async function GET(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get('type');
    const limit = req.nextUrl.searchParams.get('limit') || '50';
    const qs = new URLSearchParams();
    qs.set('limit', limit);
    if (type) qs.set('type', type);
    const res = await fetch(backendUrl(`/api/intelligence-learning/insights?${qs.toString()}`), {
      headers: proxyHeaders(extractProjectHeaders(req)),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[intelligence-learning insights proxy]', error);
    return NextResponse.json({ success: false, error: 'Failed to reach backend' }, { status: 502 });
  }
}
