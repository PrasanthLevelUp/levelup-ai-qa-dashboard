export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { backendUrl, proxyHeaders } from '@/lib/backend-proxy';

/** GET /api/similarity/distribution */
export async function GET() {
  try {
    const res = await fetch(backendUrl('/api/similarity/distribution'), { headers: proxyHeaders() });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Similarity distribution proxy]', error);
    return NextResponse.json({ success: false, error: 'Failed to reach backend' }, { status: 502 });
  }
}
