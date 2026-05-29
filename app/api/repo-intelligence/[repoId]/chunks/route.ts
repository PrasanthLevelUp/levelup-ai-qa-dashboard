export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

export async function GET(req: NextRequest, { params }: { params: { repoId: string } }) {
  try {
    const { repoId } = params;
    const { searchParams } = new URL(req.url);
    const qs = searchParams.toString();
    const response = await fetch(
      backendUrl(`/api/repo-intelligence/${encodeURIComponent(repoId)}/chunks${qs ? `?${qs}` : ''}`),
      {
        headers: proxyHeaders(extractProjectHeaders(req)),
        cache: 'no-store',
      }
    );
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get chunks', details: String(error) }, { status: 502 });
  }
}
