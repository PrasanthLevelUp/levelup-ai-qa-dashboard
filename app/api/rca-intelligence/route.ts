export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders } from '@/lib/backend-proxy';

/** GET /api/rca-intelligence — Full environment intelligence report */
export async function GET(req: NextRequest) {
  try {
    const days = req.nextUrl.searchParams.get('days') || '30';
    const startDate = req.nextUrl.searchParams.get('startDate');
    const endDate = req.nextUrl.searchParams.get('endDate');
    const win = startDate && endDate
      ? `&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
      : '';
    const res = await fetch(backendUrl(`/api/rca-intelligence/report?days=${days}${win}`), { headers: proxyHeaders() });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[RCA intelligence report proxy]', error);
    return NextResponse.json({ success: false, error: 'Failed to reach backend' }, { status: 502 });
  }
}
