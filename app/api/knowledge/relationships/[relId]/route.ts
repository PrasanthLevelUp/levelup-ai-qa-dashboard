export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/** DELETE /api/knowledge/relationships/:relId */
export async function DELETE(req: NextRequest, { params }: { params: { relId: string } }) {
  try {
    const res = await fetch(backendUrl(`/api/knowledge/relationships/${params.relId}`), {
      method: 'DELETE',
      headers: proxyHeaders(extractProjectHeaders(req)),
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[Knowledge relationship delete proxy]', error);
    return NextResponse.json({ error: 'Failed to reach backend' }, { status: 502 });
  }
}
