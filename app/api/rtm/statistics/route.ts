export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/** GET /api/rtm/statistics — coverage analytics by category/priority + trends (project-scoped) */
export async function GET(req: NextRequest) {
  try {
    const res = await fetch(backendUrl('/api/rtm/statistics'), {
      headers: proxyHeaders(extractProjectHeaders(req)),
      cache: 'no-store',
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error('[RTM statistics proxy] Backend returned', res.status, errText);
      return NextResponse.json({ success: false, error: 'Backend error', details: errText }, { status: res.status });
    }
    return NextResponse.json(await res.json());
  } catch (error) {
    console.error('[RTM statistics proxy]', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch RTM statistics' }, { status: 502 });
  }
}
