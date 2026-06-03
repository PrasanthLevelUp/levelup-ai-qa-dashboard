export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/** GET /api/rtm/traceability/:id — full drill-down chain for a single requirement (project-scoped) */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const res = await fetch(backendUrl(`/api/rtm/traceability/${params.id}`), {
      headers: proxyHeaders(extractProjectHeaders(req)),
      cache: 'no-store',
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error('[RTM traceability proxy] Backend returned', res.status, errText);
      return NextResponse.json({ success: false, error: 'Backend error', details: errText }, { status: res.status });
    }
    return NextResponse.json(await res.json());
  } catch (error) {
    console.error('[RTM traceability proxy]', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch traceability detail' }, { status: 502 });
  }
}
