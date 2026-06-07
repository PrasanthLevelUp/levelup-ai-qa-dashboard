export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/** GET /api/metrics/current — live KPI metrics + last snapshot (proxy, project-scoped) */
export async function GET(req: NextRequest) {
  try {
    const res = await fetch(backendUrl('/api/metrics/current'), {
      headers: proxyHeaders(extractProjectHeaders(req)),
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[Metrics current proxy]', error);
    return NextResponse.json({ success: false, error: 'Failed to reach backend' }, { status: 502 });
  }
}
