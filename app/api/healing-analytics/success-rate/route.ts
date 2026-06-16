export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/** GET /api/healing-analytics/success-rate?timeRange=today|week|month|all */
export async function GET(req: NextRequest) {
  try {
    const timeRange = req.nextUrl.searchParams.get('timeRange') || 'all';
    const res = await fetch(
      backendUrl(`/api/intelligence/healing/success-rate?timeRange=${encodeURIComponent(timeRange)}`),
      { headers: proxyHeaders(extractProjectHeaders(req)) },
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[healing-analytics success-rate proxy]', error);
    return NextResponse.json({ success: false, error: 'Failed to reach backend' }, { status: 502 });
  }
}
