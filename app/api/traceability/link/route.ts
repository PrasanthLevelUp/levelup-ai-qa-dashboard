export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/** POST /api/traceability/link — link a test case to a requirement (project-scoped).
 *  Body: { requirementId: string (UUID), testCaseId: number } */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(backendUrl('/api/traceability/link'), {
      method: 'POST',
      headers: proxyHeaders({ ...extractProjectHeaders(req), 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch (error) {
    console.error('[Traceability link proxy]', error);
    return NextResponse.json({ success: false, error: 'Failed to create traceability link' }, { status: 502 });
  }
}
