export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders } from '@/lib/backend-proxy';

/**
 * GET /api/github/repos — proxy to backend
 *
 * SECURITY: proxyHeaders() forwards the session cookie so repositories are
 * listed using the CURRENT USER's stored GitHub token.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = searchParams.get('page') || '1';
    const perPage = searchParams.get('per_page') || '30';
    const sort = searchParams.get('sort') || 'pushed';

    const res = await fetch(
      backendUrl(`/api/github/repos?page=${page}&per_page=${perPage}&sort=${sort}`),
      { headers: proxyHeaders(), cache: 'no-store' },
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[GitHub Repos]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch repositories' },
      { status: 502 },
    );
  }
}
