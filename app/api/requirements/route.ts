export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/** GET /api/requirements — list requirements (project-scoped, supports search/category/priority/status filters) */
export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.search || '';
    const res = await fetch(backendUrl(`/api/requirements${search}`), {
      headers: proxyHeaders(extractProjectHeaders(req)),
      cache: 'no-store',
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error('[Requirements proxy GET] Backend returned', res.status, errText);
      return NextResponse.json({ success: false, error: 'Backend error', details: errText }, { status: res.status });
    }
    return NextResponse.json(await res.json());
  } catch (error) {
    console.error('[Requirements proxy GET]', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch requirements' }, { status: 502 });
  }
}

/** POST /api/requirements — create a new requirement */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(backendUrl('/api/requirements'), {
      method: 'POST',
      headers: proxyHeaders(extractProjectHeaders(req)),
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error('[Requirements proxy POST] Backend returned', res.status, errText);
      return NextResponse.json({ success: false, error: 'Backend error', details: errText }, { status: res.status });
    }
    return NextResponse.json(await res.json(), { status: res.status });
  } catch (error) {
    console.error('[Requirements proxy POST]', error);
    return NextResponse.json({ success: false, error: 'Failed to create requirement' }, { status: 502 });
  }
}
