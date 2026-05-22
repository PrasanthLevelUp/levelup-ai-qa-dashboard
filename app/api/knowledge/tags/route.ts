export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders } from '@/lib/backend-proxy';

/** GET /api/knowledge/tags — All unique tags with counts */
export async function GET(req: NextRequest) {
  try {
    const res = await fetch(backendUrl('/api/knowledge/tags'), {
      headers: proxyHeaders(),
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[Knowledge tags proxy]', error);
    return NextResponse.json([], { status: 502 });
  }
}
