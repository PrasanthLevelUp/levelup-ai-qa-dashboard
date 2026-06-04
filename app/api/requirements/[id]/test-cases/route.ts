export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/**
 * GET /api/requirements/:id/test-cases
 * Sprint 4 — lists the test cases linked to a requirement (RTM UUID FK) along
 * with their automation state (is_automated, automation_status, script_count).
 * Powers the Script Generation requirement → test-case selector and the
 * "no test cases" validation warning. Project-scoped via forwarded headers.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const search = req.nextUrl.search || '';
    const res = await fetch(backendUrl(`/api/requirements/${params.id}/test-cases${search}`), {
      headers: proxyHeaders(extractProjectHeaders(req)),
      cache: 'no-store',
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error('[Requirement test-cases proxy GET] Backend returned', res.status, errText);
      return NextResponse.json({ success: false, error: 'Backend error', details: errText }, { status: res.status });
    }
    return NextResponse.json(await res.json());
  } catch (error) {
    console.error('[Requirement test-cases proxy GET]', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch requirement test cases' }, { status: 502 });
  }
}
