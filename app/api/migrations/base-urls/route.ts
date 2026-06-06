export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/** GET /api/migrations/base-urls — apps that have at least one crawl snapshot. */
export async function GET(req: NextRequest) {
  try {
    const res = await fetch(backendUrl('/api/migrations/base-urls'), {
      headers: proxyHeaders(extractProjectHeaders(req)),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.ok ? 200 : res.status });
  } catch (error) {
    console.error('[Migrations] base-urls error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch base URLs' }, { status: 500 });
  }
}
