/**
 * Per-project user context proxy — GET current selection, PUT persist selection.
 */
import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { projectId: string } }) {
  try {
    const res = await fetch(backendUrl(`/api/users/me/context/${params.projectId}`), {
      headers: proxyHeaders(extractProjectHeaders(req)),
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    console.error('[users/me/context] GET error:', err.message);
    return NextResponse.json({ error: 'Failed to fetch user context' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { projectId: string } }) {
  try {
    const body = await req.json();
    const res = await fetch(backendUrl(`/api/users/me/context/${params.projectId}`), {
      method: 'PUT',
      headers: proxyHeaders(extractProjectHeaders(req)),
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    console.error('[users/me/context] PUT error:', err.message);
    return NextResponse.json({ error: 'Failed to update user context' }, { status: 500 });
  }
}
