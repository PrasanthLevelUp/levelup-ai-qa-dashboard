export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/** GET /api/requirements/jira/projects — list Jira projects from the stored connection */
export async function GET(req: NextRequest) {
  try {
    const res = await fetch(backendUrl('/api/requirements/jira/projects'), {
      headers: proxyHeaders(extractProjectHeaders(req)),
      cache: 'no-store',
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch (error) {
    console.error('[Jira projects proxy]', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch Jira projects' }, { status: 502 });
  }
}
