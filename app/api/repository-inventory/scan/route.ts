export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/**
 * POST /api/repository-inventory/scan — run a deterministic scan of a repo and
 * persist its per-test inventory (Sprint RCI-1). Body: { repositoryId } or
 * { repoPath }. No LLM / no generation.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(backendUrl('/api/repository-inventory/scan'), {
      method: 'POST',
      headers: proxyHeaders(extractProjectHeaders(req)),
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error('[RepositoryInventory proxy SCAN] Backend returned', res.status, errText);
      return NextResponse.json({ error: 'Backend error', details: errText }, { status: res.status });
    }
    return NextResponse.json(await res.json(), { status: res.status });
  } catch (error) {
    console.error('[RepositoryInventory proxy SCAN]', error);
    return NextResponse.json({ error: 'Failed to scan repository' }, { status: 502 });
  }
}
