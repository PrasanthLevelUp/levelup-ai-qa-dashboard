/**
 * Next sprint proxy — POST create the next sprint (auto-named/scheduled).
 */
import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    let body: any = {};
    try { body = await req.json(); } catch { body = {}; }
    const res = await fetch(backendUrl(`/api/projects/${params.id}/sprints/next`), {
      method: 'POST',
      headers: proxyHeaders(extractProjectHeaders(req)),
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    console.error('[sprints/next] POST error:', err.message);
    return NextResponse.json({ error: 'Failed to create next sprint' }, { status: 500 });
  }
}
