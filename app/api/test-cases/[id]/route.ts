export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/**
 * GET /api/test-cases/:id
 * Proxy to the backend single-test-case endpoint (Sprint 4). Returns the full
 * Requirement → Test Case → Steps context used to pre-populate the Script
 * Generation page. Company-scoped via the forwarded session cookie.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const res = await fetch(backendUrl(`/api/test-cases/${params.id}`), {
      headers: proxyHeaders(extractProjectHeaders(req)),
      cache: 'no-store',
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error('[TestCase proxy GET] Backend returned', res.status, errText);
      return NextResponse.json(
        { success: false, error: 'Backend error', details: errText },
        { status: res.status },
      );
    }
    return NextResponse.json(await res.json());
  } catch (error) {
    console.error('[TestCase proxy GET]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch test case' },
      { status: 502 },
    );
  }
}
