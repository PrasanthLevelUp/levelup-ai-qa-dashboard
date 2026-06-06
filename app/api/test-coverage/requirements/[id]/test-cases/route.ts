export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/**
 * DELETE /api/test-coverage/requirements/:id/test-cases
 * Clears the generated scenarios/cases for a requirement so it can be
 * regenerated (Issue #1 — duplicate prevention). Marks generation_state='deleted'.
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const res = await fetch(backendUrl(`/api/test-coverage/requirements/${params.id}/test-cases`), {
      method: 'DELETE',
      headers: proxyHeaders(extractProjectHeaders(req)),
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[Test coverage clear test-cases proxy]', error);
    return NextResponse.json({ error: 'Failed to reach backend' }, { status: 502 });
  }
}
