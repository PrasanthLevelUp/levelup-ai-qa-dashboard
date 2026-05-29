export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

export async function GET(req: NextRequest) {
  try {
    const response = await fetch(backendUrl('/api/repo-intelligence/list'), {
      headers: proxyHeaders(extractProjectHeaders(req)),
      cache: 'no-store',
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[RepoIntelligence List] Error:', error);
    return NextResponse.json({ error: 'Failed to list repo intelligence', details: String(error) }, { status: 502 });
  }
}
