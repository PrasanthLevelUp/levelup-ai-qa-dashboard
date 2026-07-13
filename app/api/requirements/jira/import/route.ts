export const dynamic = 'force-dynamic';
// Importing a backlog can involve many Jira API calls + row upserts.
export const maxDuration = 120;
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/** POST /api/requirements/jira/import — import selected Jira issue types as requirements */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(backendUrl('/api/requirements/jira/import'), {
      method: 'POST',
      headers: proxyHeaders(extractProjectHeaders(req)),
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch (error) {
    console.error('[Jira import proxy]', error);
    return NextResponse.json({ success: false, error: 'Failed to import from Jira' }, { status: 502 });
  }
}
