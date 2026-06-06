export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/**
 * GET /api/script-health
 * Proxies to the backend script-health endpoint: health scores for every
 * active generated script in the current project scope, plus a summary.
 */
export async function GET(req: NextRequest) {
  try {
    const projectHeaders = extractProjectHeaders(req);
    const res = await fetch(backendUrl('/api/script-health'), {
      headers: proxyHeaders(projectHeaders),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { success: false, error: errText || `Backend returned ${res.status}` },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[ScriptHealth] list error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch script health' },
      { status: 500 },
    );
  }
}
