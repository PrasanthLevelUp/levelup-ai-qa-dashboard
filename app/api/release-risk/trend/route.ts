export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/** GET /api/release-risk/trend?days=30 */
export async function GET(req: NextRequest) {
  try {
    const days = req.nextUrl.searchParams.get('days') || '30';
    const res = await fetch(backendUrl(`/api/release-risk/trend?days=${days}`), { headers: proxyHeaders(extractProjectHeaders(req)) });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Release risk trend proxy]', error);
    return NextResponse.json({ success: false, error: 'Failed to reach backend' }, { status: 502 });
  }
}
