export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/** GET /api/requirements/jira/issue-types?projectKey=... — list issue types for a Jira project */
export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.search || '';
    const res = await fetch(backendUrl(`/api/requirements/jira/issue-types${search}`), {
      headers: proxyHeaders(extractProjectHeaders(req)),
      cache: 'no-store',
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch (error) {
    console.error('[Jira issue-types proxy]', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch Jira issue types' }, { status: 502 });
  }
}
