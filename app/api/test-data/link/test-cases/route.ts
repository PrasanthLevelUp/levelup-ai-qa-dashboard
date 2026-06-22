export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/** GET /api/test-data/link/test-cases — candidate test cases for linkage picker */
export async function GET(req: NextRequest) {
  try {
    const res = await fetch(backendUrl('/api/test-data/link/test-cases'), {
      headers: proxyHeaders(extractProjectHeaders(req)),
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[TestData link candidates proxy]', error);
    return NextResponse.json({ testCases: [] }, { status: 502 });
  }
}
