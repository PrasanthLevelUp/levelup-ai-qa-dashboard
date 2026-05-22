export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders } from '@/lib/backend-proxy';

/** GET /api/knowledge/search?q=... — Full-text search */
export async function GET(req: NextRequest) {
  try {
    const qs = req.nextUrl.search;
    const res = await fetch(backendUrl(`/api/knowledge/search${qs}`), {
      headers: proxyHeaders(),
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[Knowledge search proxy]', error);
    return NextResponse.json({ items: [], total: 0 }, { status: 502 });
  }
}
