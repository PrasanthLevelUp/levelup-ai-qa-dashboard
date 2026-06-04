/**
 * Current sprint proxy — GET the active/current sprint for a project.
 */
import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const res = await fetch(backendUrl(`/api/projects/${params.id}/sprints/current`), {
      headers: proxyHeaders(extractProjectHeaders(req)),
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    console.error('[sprints/current] GET error:', err.message);
    return NextResponse.json({ error: 'Failed to fetch current sprint' }, { status: 500 });
  }
}
