export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/** POST /api/knowledge/:id/relationships — Create relationship */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const res = await fetch(backendUrl(`/api/knowledge/${params.id}/relationships`), {
      method: 'POST',
      headers: proxyHeaders(extractProjectHeaders(req)),
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[Knowledge relationship create proxy]', error);
    return NextResponse.json({ error: 'Failed to reach backend' }, { status: 502 });
  }
}
