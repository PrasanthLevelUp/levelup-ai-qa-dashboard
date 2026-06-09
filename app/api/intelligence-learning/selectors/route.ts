export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/** GET /api/intelligence-learning/selectors — fragile selectors with severity + suggested fix */
export async function GET(req: NextRequest) {
  try {
    const res = await fetch(backendUrl(`/api/intelligence-learning/selectors`), {
      headers: proxyHeaders(extractProjectHeaders(req)),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[intelligence-learning selectors proxy]', error);
    return NextResponse.json({ success: false, error: 'Failed to reach backend' }, { status: 502 });
  }
}
