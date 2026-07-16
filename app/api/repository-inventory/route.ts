export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/**
 * GET /api/repository-inventory — grouped, searchable Repository Coverage
 * Inventory (Sprint RCI-1). Supports ?repository_id= and ?search=.
 * Deterministic read — no AI.
 */
export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.search || '';
    const res = await fetch(backendUrl(`/api/repository-inventory${search}`), {
      headers: proxyHeaders(extractProjectHeaders(req)),
      cache: 'no-store',
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error('[RepositoryInventory proxy GET] Backend returned', res.status, errText);
      return NextResponse.json({ error: 'Backend error', details: errText }, { status: res.status });
    }
    return NextResponse.json(await res.json());
  } catch (error) {
    console.error('[RepositoryInventory proxy GET]', error);
    return NextResponse.json({ error: 'Failed to fetch repository inventory' }, { status: 502 });
  }
}
