export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders } from '@/lib/backend-proxy';

/** DELETE /api/test-coverage/knowledge/:id */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const res = await fetch(backendUrl(`/api/test-coverage/knowledge/${params.id}`), {
      method: 'DELETE',
      headers: proxyHeaders(),
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[Test coverage knowledge delete proxy]', error);
    return NextResponse.json({ error: 'Failed to reach backend' }, { status: 502 });
  }
}
