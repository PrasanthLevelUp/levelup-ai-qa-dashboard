export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/** PUT /api/test-data/records/:recordId — update a record */
export async function PUT(req: NextRequest, { params }: { params: { recordId: string } }) {
  try {
    const body = await req.json();
    const res = await fetch(backendUrl(`/api/test-data/records/${params.recordId}`), {
      method: 'PUT',
      headers: proxyHeaders(extractProjectHeaders(req)),
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[TestData update record proxy]', error);
    return NextResponse.json({ error: 'Failed to reach backend' }, { status: 502 });
  }
}

/** DELETE /api/test-data/records/:recordId */
export async function DELETE(req: NextRequest, { params }: { params: { recordId: string } }) {
  try {
    const res = await fetch(backendUrl(`/api/test-data/records/${params.recordId}`), {
      method: 'DELETE',
      headers: proxyHeaders(extractProjectHeaders(req)),
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[TestData delete record proxy]', error);
    return NextResponse.json({ error: 'Failed to reach backend' }, { status: 502 });
  }
}
