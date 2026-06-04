export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/** GET /api/release-risk/modules?days=30 */
export async function GET(req: NextRequest) {
  try {
    const days = req.nextUrl.searchParams.get('days') || '30';
    // Phase 2: forward the active sprint window (WHEN) when present.
    const startDate = req.nextUrl.searchParams.get('startDate') || '';
    const endDate = req.nextUrl.searchParams.get('endDate') || '';
    const win = startDate && endDate
      ? `&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
      : '';
    const res = await fetch(backendUrl(`/api/release-risk/modules?days=${days}${win}`), { headers: proxyHeaders(extractProjectHeaders(req)) });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Release risk modules proxy]', error);
    return NextResponse.json({ success: false, error: 'Failed to reach backend' }, { status: 502 });
  }
}
