/**
 * Single sprint proxy — GET detail, PUT update, DELETE.
 */
import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string; sprintId: string } }) {
  try {
    const res = await fetch(backendUrl(`/api/projects/${params.id}/sprints/${params.sprintId}`), {
      headers: proxyHeaders(extractProjectHeaders(req)),
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    console.error('[sprints/:id] GET error:', err.message);
    return NextResponse.json({ error: 'Failed to fetch sprint' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string; sprintId: string } }) {
  try {
    const body = await req.json();
    const res = await fetch(backendUrl(`/api/projects/${params.id}/sprints/${params.sprintId}`), {
      method: 'PUT',
      headers: proxyHeaders(extractProjectHeaders(req)),
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    console.error('[sprints/:id] PUT error:', err.message);
    return NextResponse.json({ error: 'Failed to update sprint' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string; sprintId: string } }) {
  try {
    const res = await fetch(backendUrl(`/api/projects/${params.id}/sprints/${params.sprintId}`), {
      method: 'DELETE',
      headers: proxyHeaders(extractProjectHeaders(req)),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    console.error('[sprints/:id] DELETE error:', err.message);
    return NextResponse.json({ error: 'Failed to delete sprint' }, { status: 500 });
  }
}
