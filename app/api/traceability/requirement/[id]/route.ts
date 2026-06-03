export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/** GET /api/traceability/requirement/:id — list all traceability links for a requirement (project-scoped) */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const res = await fetch(backendUrl(`/api/traceability/requirement/${params.id}`), {
      headers: proxyHeaders(extractProjectHeaders(req)),
      cache: 'no-store',
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch (error) {
    console.error('[Traceability requirement proxy]', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch traceability links' }, { status: 502 });
  }
}
