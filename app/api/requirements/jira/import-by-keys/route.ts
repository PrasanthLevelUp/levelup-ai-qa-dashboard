export const dynamic = 'force-dynamic';
// Fetching a handful of issues by key + upserting rows.
export const maxDuration = 120;
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/** POST /api/requirements/jira/import-by-keys — import specific Jira issues by key */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(backendUrl('/api/requirements/jira/import-by-keys'), {
      method: 'POST',
      headers: proxyHeaders(extractProjectHeaders(req)),
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch (error) {
    console.error('[Jira import-by-keys proxy]', error);
    return NextResponse.json({ success: false, error: 'Failed to import from Jira' }, { status: 502 });
  }
}
