export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { backendUrl, proxyHeaders } from '@/lib/backend-proxy';

/** GET /api/similarity — Stats (proxy to backend /api/similarity/stats) */
export async function GET() {
  try {
    const res = await fetch(backendUrl('/api/similarity/stats'), { headers: proxyHeaders() });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Similarity stats proxy]', error);
    return NextResponse.json({ success: false, error: 'Failed to reach backend' }, { status: 502 });
  }
}
