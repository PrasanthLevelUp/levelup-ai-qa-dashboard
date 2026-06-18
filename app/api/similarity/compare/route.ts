export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/** POST /api/similarity/compare */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(backendUrl('/api/similarity/compare'), {
      method: 'POST',
      headers: proxyHeaders(extractProjectHeaders(req)),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[Similarity compare proxy]', error);
    return NextResponse.json({ success: false, error: 'Failed to reach backend' }, { status: 502 });
  }
}
