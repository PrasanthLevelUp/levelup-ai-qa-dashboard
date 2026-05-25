/**
 * Projects API proxy — GET list, POST create
 */
import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders } from '@/lib/backend-proxy';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await fetch(backendUrl('/api/projects'), {
      headers: proxyHeaders(),
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    console.error('[projects] GET error:', err.message);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(backendUrl('/api/projects'), {
      method: 'POST',
      headers: proxyHeaders(),
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    console.error('[projects] POST error:', err.message);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
