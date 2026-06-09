export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/** GET /api/intelligence-learning/patterns — maintenance patterns the AI has learned */
export async function GET(req: NextRequest) {
  try {
    const limit = req.nextUrl.searchParams.get('limit') || '20';
    const res = await fetch(backendUrl(`/api/intelligence-learning/patterns?limit=${limit}`), {
      headers: proxyHeaders(extractProjectHeaders(req)),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[intelligence-learning patterns proxy]', error);
    return NextResponse.json({ success: false, error: 'Failed to reach backend' }, { status: 502 });
  }
}
