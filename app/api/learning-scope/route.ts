export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/** GET /api/learning-scope — current learning-scope privacy setting + options (project-scoped) */
export async function GET(req: NextRequest) {
  try {
    const res = await fetch(backendUrl('/api/metrics/learning-scope'), {
      headers: proxyHeaders(extractProjectHeaders(req)),
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[learning-scope GET proxy]', error);
    return NextResponse.json({ success: false, error: 'Failed to reach backend' }, { status: 502 });
  }
}

/** PUT /api/learning-scope — update the learning-scope privacy setting (project-scoped) */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(backendUrl('/api/metrics/learning-scope'), {
      method: 'PUT',
      headers: proxyHeaders(extractProjectHeaders(req)),
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[learning-scope PUT proxy]', error);
    return NextResponse.json({ success: false, error: 'Failed to reach backend' }, { status: 502 });
  }
}
