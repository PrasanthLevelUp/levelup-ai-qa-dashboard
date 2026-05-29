export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/** GET /api/test-coverage/requirements — List all requirements (project-scoped) */
export async function GET(req: NextRequest) {
  try {
    const res = await fetch(backendUrl('/api/test-coverage/requirements'), {
      headers: proxyHeaders(extractProjectHeaders(req)),
      cache: 'no-store',
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error('[Test coverage requirements proxy] Backend returned', res.status, errText);
      return NextResponse.json({ error: 'Backend error', details: errText }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Test coverage requirements proxy]', error);
    return NextResponse.json([], { status: 502 });
  }
}
