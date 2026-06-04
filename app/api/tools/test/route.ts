export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders } from '@/lib/backend-proxy';

/**
 * POST /api/tools/test — Test a tool connection (proxy to backend)
 *
 * SECURITY: proxyHeaders() forwards the session cookie so any persisted test
 * result is scoped to the current user's connection.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(backendUrl('/api/notifications/test'), {
      method: 'POST',
      headers: proxyHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[Tools Test proxy]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reach backend' },
      { status: 502 }
    );
  }
}
