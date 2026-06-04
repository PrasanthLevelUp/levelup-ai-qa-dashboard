export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders } from '@/lib/backend-proxy';

/**
 * DELETE /api/tools/:id — Disconnect a tool (proxy to backend)
 *
 * SECURITY: proxyHeaders() forwards the session cookie so the backend only
 * deletes a connection owned by the current user.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const res = await fetch(backendUrl(`/api/notifications/config/${params.id}`), {
      method: 'DELETE',
      headers: proxyHeaders(),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[Tools DELETE proxy]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reach backend' },
      { status: 502 }
    );
  }
}

/**
 * PATCH /api/tools/:id — Update tool config (proxy to backend)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const res = await fetch(backendUrl(`/api/notifications/config/${params.id}`), {
      method: 'PATCH',
      headers: proxyHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[Tools PATCH proxy]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reach backend' },
      { status: 502 }
    );
  }
}
