export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/**
 * GET /api/repos — list repositories
 * Forwards x-project-id header to backend for project filtering.
 * Also supports ?project_id=N query param.
 */
export async function GET(req: NextRequest) {
  try {
    const qs = req.nextUrl.search; // preserve query params like ?project_id=N
    const res = await fetch(backendUrl(`/api/repos${qs}`), {
      headers: proxyHeaders(extractProjectHeaders(req)),
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[Repos API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch repos', details: String(error) },
      { status: 502 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(backendUrl('/api/repos'), {
      method: 'POST',
      headers: proxyHeaders(extractProjectHeaders(req)),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[Repos API POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to add repo', details: String(error) },
      { status: 502 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const repoId = searchParams.get('id');
    if (!repoId) {
      return NextResponse.json({ error: 'Missing repo id' }, { status: 400 });
    }
    const res = await fetch(backendUrl(`/api/repos/${repoId}`), {
      method: 'DELETE',
      headers: proxyHeaders(extractProjectHeaders(req)),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[Repos API DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete repo', details: String(error) },
      { status: 502 }
    );
  }
}
