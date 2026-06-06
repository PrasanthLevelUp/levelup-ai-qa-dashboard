export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/** GET /api/healing-settings — current effective healing strategy settings (project-scoped) */
export async function GET(req: NextRequest) {
  try {
    const res = await fetch(backendUrl('/api/healing-settings'), {
      headers: proxyHeaders(extractProjectHeaders(req)),
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[Healing settings GET proxy]', error);
    return NextResponse.json({ error: 'Failed to reach backend' }, { status: 502 });
  }
}

/** PUT /api/healing-settings — update healing strategy settings (project-scoped) */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(backendUrl('/api/healing-settings'), {
      method: 'PUT',
      headers: proxyHeaders(extractProjectHeaders(req)),
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[Healing settings PUT proxy]', error);
    return NextResponse.json({ error: 'Failed to reach backend' }, { status: 502 });
  }
}
