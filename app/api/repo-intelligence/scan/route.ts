export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const response = await fetch(backendUrl('/api/repo-intelligence/scan'), {
      method: 'POST',
      headers: proxyHeaders(extractProjectHeaders(req)),
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[RepoIntelligence Scan] Error:', error);
    return NextResponse.json({ error: 'Failed to scan repository', details: String(error) }, { status: 502 });
  }
}
