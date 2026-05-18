export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders } from '@/lib/backend-proxy';

/** GET /api/similarity/top-matches?limit=20 */
export async function GET(req: NextRequest) {
  try {
    const limit = req.nextUrl.searchParams.get('limit') || '20';
    const res = await fetch(backendUrl(`/api/similarity/top-matches?limit=${limit}`), { headers: proxyHeaders() });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Similarity top-matches proxy]', error);
    return NextResponse.json({ success: false, error: 'Failed to reach backend' }, { status: 502 });
  }
}
