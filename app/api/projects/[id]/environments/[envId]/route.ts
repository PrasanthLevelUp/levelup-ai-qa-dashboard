/**
 * Single environment API proxy — GET, PUT, DELETE.
 */
import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string; envId: string } }) {
  try {
    const res = await fetch(backendUrl(`/api/projects/${params.id}/environments/${params.envId}`), {
      headers: proxyHeaders(extractProjectHeaders(req)),
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch environment' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string; envId: string } }) {
  try {
    const body = await req.json();
    const res = await fetch(backendUrl(`/api/projects/${params.id}/environments/${params.envId}`), {
      method: 'PUT',
      headers: proxyHeaders(extractProjectHeaders(req)),
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to update environment' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string; envId: string } }) {
  try {
    const res = await fetch(backendUrl(`/api/projects/${params.id}/environments/${params.envId}`), {
      method: 'DELETE',
      headers: proxyHeaders(extractProjectHeaders(req)),
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to delete environment' }, { status: 500 });
  }
}
