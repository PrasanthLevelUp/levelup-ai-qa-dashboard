export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/** GET /api/rtm/matrix — full traceability matrix (project-scoped). Supports ?category=&priority=&status= */
export async function GET(req: NextRequest) {
  try {
    const res = await fetch(backendUrl('/api/rtm/matrix' + (req.nextUrl.search || '')), {
      headers: proxyHeaders(extractProjectHeaders(req)),
      cache: 'no-store',
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error('[RTM matrix proxy] Backend returned', res.status, errText);
      return NextResponse.json({ success: false, error: 'Backend error', details: errText }, { status: res.status });
    }
    return NextResponse.json(await res.json());
  } catch (error) {
    console.error('[RTM matrix proxy]', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch RTM matrix' }, { status: 502 });
  }
}
