/**
 * POST /api/test-coverage/requirements/[id]/generate-scripts
 * Proxy to backend: Test Case Lab → Script Gen → GitHub PR pipeline
 */
import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders } from '@/lib/backend-proxy';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = await req.json();
    const { id } = params;

    const res = await fetch(
      backendUrl(`/api/test-coverage/requirements/${id}/generate-scripts-and-commit`),
      {
        method: 'POST',
        headers: proxyHeaders(),
        body: JSON.stringify(body),
        cache: 'no-store',
      },
    );

    const data = await res.json();

    if (!res.ok) {
      console.error('[generate-scripts] Backend error:', res.status, data);
      return NextResponse.json(data, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[generate-scripts] Proxy error:', err);
    return NextResponse.json(
      { error: 'Failed to generate scripts', details: err.message },
      { status: 500 },
    );
  }
}
