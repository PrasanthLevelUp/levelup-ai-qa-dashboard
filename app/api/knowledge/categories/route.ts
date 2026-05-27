export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/** GET /api/knowledge/categories — Category distribution */
export async function GET(req: NextRequest) {
  try {
    const res = await fetch(backendUrl('/api/knowledge/categories'), {
      headers: proxyHeaders(extractProjectHeaders(req)),
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[Knowledge categories proxy]', error);
    return NextResponse.json([], { status: 502 });
  }
}
