/**
 * Environment usage stats proxy — GET usage statistics for an environment.
 */
import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string; envId: string } }) {
  try {
    const qs = req.nextUrl.search || '';
    const res = await fetch(
      backendUrl(`/api/projects/${params.id}/environments/${params.envId}/usage${qs}`),
      {
        headers: proxyHeaders(extractProjectHeaders(req)),
        cache: 'no-store',
      }
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    console.error('[environments/usage] GET error:', err.message);
    return NextResponse.json({ error: 'Failed to fetch usage stats' }, { status: 500 });
  }
}
