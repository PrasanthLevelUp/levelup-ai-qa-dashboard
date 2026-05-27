export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/** GET /api/knowledge/stats — Aggregate statistics */
export async function GET(req: NextRequest) {
  try {
    const res = await fetch(backendUrl('/api/knowledge/stats'), {
      headers: proxyHeaders(extractProjectHeaders(req)),
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[Knowledge stats proxy]', error);
    return NextResponse.json({}, { status: 502 });
  }
}
