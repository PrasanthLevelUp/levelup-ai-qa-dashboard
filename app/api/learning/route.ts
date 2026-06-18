export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/**
 * GET /api/learning — Learning engine stats (proxy)
 *
 * SECURITY (multi-tenant isolation): forwards the workspace-context headers
 * (x-project-id / x-environment-id / x-sprint-id) so the backend can scope the
 * learning analytics by BOTH company_id AND project_id. Without forwarding
 * these, the dashboard would aggregate every project in the company.
 */
export async function GET(req: NextRequest) {
  try {
    const res = await fetch(backendUrl('/api/learning/stats'), {
      headers: proxyHeaders(extractProjectHeaders(req)),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[Learning stats proxy]', error);
    return NextResponse.json({ success: false, error: 'Failed to reach backend' }, { status: 502 });
  }
}
