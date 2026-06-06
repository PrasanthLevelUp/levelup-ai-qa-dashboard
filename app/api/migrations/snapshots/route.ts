export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/** GET /api/migrations/snapshots?baseUrl=... — snapshots for a given app. */
export async function GET(req: NextRequest) {
  try {
    const baseUrl = req.nextUrl.searchParams.get('baseUrl') || '';
    const res = await fetch(
      backendUrl(`/api/migrations/snapshots?baseUrl=${encodeURIComponent(baseUrl)}`),
      { headers: proxyHeaders(extractProjectHeaders(req)), cache: 'no-store' },
    );
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.ok ? 200 : res.status });
  } catch (error) {
    console.error('[Migrations] snapshots error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch snapshots' }, { status: 500 });
  }
}
