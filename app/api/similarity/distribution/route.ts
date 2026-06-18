export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/** GET /api/similarity/distribution */
export async function GET(req: NextRequest) {
  try {
    const res = await fetch(backendUrl('/api/similarity/distribution'), { headers: proxyHeaders(extractProjectHeaders(req)) });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[Similarity distribution proxy]', error);
    return NextResponse.json({ success: false, error: 'Failed to reach backend' }, { status: 502 });
  }
}
