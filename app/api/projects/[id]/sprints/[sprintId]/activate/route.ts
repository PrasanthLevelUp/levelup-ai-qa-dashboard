/**
 * Sprint activate proxy — POST set a sprint as the current/active one.
 */
import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string; sprintId: string } }) {
  try {
    let body: any = {};
    try { body = await req.json(); } catch { body = {}; }
    const res = await fetch(
      backendUrl(`/api/projects/${params.id}/sprints/${params.sprintId}/activate`),
      {
        method: 'POST',
        headers: proxyHeaders(extractProjectHeaders(req)),
        body: JSON.stringify(body),
        cache: 'no-store',
      }
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    console.error('[sprints/activate] POST error:', err.message);
    return NextResponse.json({ error: 'Failed to activate sprint' }, { status: 500 });
  }
}
