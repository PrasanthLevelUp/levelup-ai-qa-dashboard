export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders } from '@/lib/backend-proxy';

/**
 * GET /api/tools — List the CURRENT USER's tool connections (proxy to backend)
 *
 * SECURITY: proxyHeaders() forwards the levelup_session cookie so the backend
 * can resolve the logged-in user (and tenant) and return only that user's
 * connections. Without the cookie the backend would fall back to a default
 * tenant and leak other users' tools.
 */
export async function GET() {
  try {
    const res = await fetch(backendUrl('/api/notifications/config'), {
      headers: proxyHeaders(),
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[Tools GET proxy]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reach backend' },
      { status: 502 }
    );
  }
}

/**
 * POST /api/tools — Create or update a tool connection for the current user
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(backendUrl('/api/notifications/config'), {
      method: 'POST',
      headers: proxyHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[Tools POST proxy]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reach backend' },
      { status: 502 }
    );
  }
}
