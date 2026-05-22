export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders } from '@/lib/backend-proxy';

/** GET /api/knowledge — List with filters */
export async function GET(req: NextRequest) {
  try {
    const qs = req.nextUrl.search; // preserve query params
    const res = await fetch(backendUrl(`/api/knowledge${qs}`), {
      headers: proxyHeaders(),
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[Knowledge list proxy]', error);
    return NextResponse.json({ items: [], total: 0 }, { status: 502 });
  }
}

/** POST /api/knowledge — Create item */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(backendUrl('/api/knowledge'), {
      method: 'POST',
      headers: proxyHeaders(),
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[Knowledge create proxy]', error);
    return NextResponse.json({ error: 'Failed to reach backend' }, { status: 502 });
  }
}
