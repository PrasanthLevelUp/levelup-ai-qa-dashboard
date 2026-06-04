/**
 * Sprint metrics proxy — GET aggregated metrics for a sprint.
 */
import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string; sprintId: string } }) {
  try {
    const qs = req.nextUrl.search || '';
    const res = await fetch(
      backendUrl(`/api/projects/${params.id}/sprints/${params.sprintId}/metrics${qs}`),
      {
        headers: proxyHeaders(extractProjectHeaders(req)),
        cache: 'no-store',
      }
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    console.error('[sprints/metrics] GET error:', err.message);
    return NextResponse.json({ error: 'Failed to fetch sprint metrics' }, { status: 500 });
  }
}
