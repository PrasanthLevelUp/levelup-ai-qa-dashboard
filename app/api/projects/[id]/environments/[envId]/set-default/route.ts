/** Set-default environment proxy — POST. */
import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string; envId: string } }) {
  try {
    const res = await fetch(backendUrl(`/api/projects/${params.id}/environments/${params.envId}/set-default`), {
      method: 'POST',
      headers: proxyHeaders(extractProjectHeaders(req)),
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to set default environment' }, { status: 500 });
  }
}
