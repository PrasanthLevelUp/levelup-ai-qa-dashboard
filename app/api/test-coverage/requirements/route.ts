export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders } from '@/lib/backend-proxy';

/** GET /api/test-coverage/requirements — List all requirements */
export async function GET() {
  try {
    const res = await fetch(backendUrl('/api/test-coverage/requirements'), { headers: proxyHeaders() });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Test coverage requirements proxy]', error);
    return NextResponse.json([], { status: 502 });
  }
}
