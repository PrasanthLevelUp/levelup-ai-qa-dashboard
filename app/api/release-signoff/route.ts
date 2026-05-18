export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders } from '@/lib/backend-proxy';

/** GET /api/release-signoff — Full signoff report (proxy to backend /api/release-signoff/generate) */
export async function GET(req: NextRequest) {
  try {
    const days = req.nextUrl.searchParams.get('days') || '30';
    const res = await fetch(backendUrl(`/api/release-signoff/generate?days=${days}`), { headers: proxyHeaders() });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Release signoff proxy]', error);
    return NextResponse.json({ success: false, error: 'Failed to reach backend' }, { status: 502 });
  }
}
