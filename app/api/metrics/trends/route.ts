export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/** GET /api/metrics/trends?period=30d — daily KPI time series (proxy, project-scoped) */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '30d';
    const res = await fetch(backendUrl(`/api/metrics/trends?period=${encodeURIComponent(period)}`), {
      headers: proxyHeaders(extractProjectHeaders(req)),
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[Metrics trends proxy]', error);
    return NextResponse.json({ success: false, error: 'Failed to reach backend' }, { status: 502 });
  }
}
