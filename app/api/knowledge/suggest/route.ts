export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders } from '@/lib/backend-proxy';

/** GET /api/knowledge/suggest?module=X&searchTerm=Y&category=Z — Suggest relevant knowledge */
export async function GET(req: NextRequest) {
  try {
    const qs = req.nextUrl.search;
    const res = await fetch(backendUrl(`/api/knowledge/suggest${qs}`), {
      headers: proxyHeaders(),
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[Knowledge suggest proxy]', error);
    return NextResponse.json([], { status: 502 });
  }
}
