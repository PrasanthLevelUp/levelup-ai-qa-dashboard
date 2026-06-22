export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/** POST /api/test-data/test-case/:testCaseId/datasets/:datasetId — link */
export async function POST(
  req: NextRequest,
  { params }: { params: { testCaseId: string; datasetId: string } },
) {
  try {
    const res = await fetch(
      backendUrl(`/api/test-data/test-case/${params.testCaseId}/datasets/${params.datasetId}`),
      {
        method: 'POST',
        headers: proxyHeaders(extractProjectHeaders(req)),
        cache: 'no-store',
      },
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[TestData link proxy]', error);
    return NextResponse.json({ error: 'Failed to reach backend' }, { status: 502 });
  }
}

/** DELETE /api/test-data/test-case/:testCaseId/datasets/:datasetId — unlink */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { testCaseId: string; datasetId: string } },
) {
  try {
    const res = await fetch(
      backendUrl(`/api/test-data/test-case/${params.testCaseId}/datasets/${params.datasetId}`),
      {
        method: 'DELETE',
        headers: proxyHeaders(extractProjectHeaders(req)),
        cache: 'no-store',
      },
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[TestData unlink proxy]', error);
    return NextResponse.json({ error: 'Failed to reach backend' }, { status: 502 });
  }
}
