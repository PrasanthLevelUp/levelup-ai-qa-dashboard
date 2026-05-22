export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders } from '@/lib/backend-proxy';

/** GET /api/knowledge/:id — Single item with relationships */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const res = await fetch(backendUrl(`/api/knowledge/${params.id}`), {
      headers: proxyHeaders(), cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[Knowledge get proxy]', error);
    return NextResponse.json({ error: 'Failed to reach backend' }, { status: 502 });
  }
}

/** PUT /api/knowledge/:id — Update item */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const res = await fetch(backendUrl(`/api/knowledge/${params.id}`), {
      method: 'PUT',
      headers: proxyHeaders(),
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[Knowledge update proxy]', error);
    return NextResponse.json({ error: 'Failed to reach backend' }, { status: 502 });
  }
}

/** DELETE /api/knowledge/:id */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const res = await fetch(backendUrl(`/api/knowledge/${params.id}`), {
      method: 'DELETE',
      headers: proxyHeaders(),
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[Knowledge delete proxy]', error);
    return NextResponse.json({ error: 'Failed to reach backend' }, { status: 502 });
  }
}
