export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders } from '@/lib/backend-proxy';

/** GET /api/test-coverage/knowledge — List application knowledge */
export async function GET() {
  try {
    const res = await fetch(backendUrl('/api/test-coverage/knowledge'), { headers: proxyHeaders(), cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Test coverage knowledge proxy]', error);
    return NextResponse.json([], { status: 502 });
  }
}

/** POST /api/test-coverage/knowledge — Upsert knowledge entry */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(backendUrl('/api/test-coverage/knowledge'), {
      method: 'POST',
      headers: proxyHeaders(),
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[Test coverage knowledge save proxy]', error);
    return NextResponse.json({ error: 'Failed to reach backend' }, { status: 502 });
  }
}
