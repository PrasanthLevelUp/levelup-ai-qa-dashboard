export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/** GET /api/test-data/test-case/:testCaseId/datasets — datasets linked to a test case */
export async function GET(req: NextRequest, { params }: { params: { testCaseId: string } }) {
  try {
    const res = await fetch(backendUrl(`/api/test-data/test-case/${params.testCaseId}/datasets`), {
      headers: proxyHeaders(extractProjectHeaders(req)),
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[TestData linked datasets proxy]', error);
    return NextResponse.json({ datasets: [] }, { status: 502 });
  }
}
