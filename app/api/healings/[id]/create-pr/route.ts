/**
 * POST /api/healings/[id]/create-pr
 * Proxy to backend: Healing Auto-Commit — apply fix and create GitHub PR
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
      backendUrl(`/api/healings/${id}/create-pr`),
      {
        method: 'POST',
        headers: proxyHeaders(),
        body: JSON.stringify(body),
        cache: 'no-store',
      },
    );

    const data = await res.json();

    if (!res.ok) {
      console.error('[healing-create-pr] Backend error:', res.status, data);
      return NextResponse.json(data, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[healing-create-pr] Proxy error:', err);
    return NextResponse.json(
      { error: 'Failed to create healing PR', details: err.message },
      { status: 500 },
    );
  }
}
