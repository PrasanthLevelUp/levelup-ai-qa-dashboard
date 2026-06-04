/**
 * Environment health-check proxy — POST run a health check.
 */
import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string; envId: string } }) {
  try {
    let body: any = {};
    try { body = await req.json(); } catch { body = {}; }
    const res = await fetch(
      backendUrl(`/api/projects/${params.id}/environments/${params.envId}/health-check`),
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
    console.error('[environments/health-check] POST error:', err.message);
    return NextResponse.json({ error: 'Failed to run health check' }, { status: 500 });
  }
}
