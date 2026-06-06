export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/** GET /api/migrations — list migrations for the current scope. */
export async function GET(req: NextRequest) {
  try {
    const res = await fetch(backendUrl('/api/migrations'), {
      headers: proxyHeaders(extractProjectHeaders(req)),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.ok ? 200 : res.status });
  } catch (error) {
    console.error('[Migrations] list error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch migrations' }, { status: 500 });
  }
}
