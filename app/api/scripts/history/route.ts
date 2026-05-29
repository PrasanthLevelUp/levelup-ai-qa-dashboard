export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/**
 * GET /api/scripts/history
 * Fetches script generation history for the current project.
 */
export async function GET(req: NextRequest) {
  try {
    const projectHeaders = extractProjectHeaders(req);
    const limit = req.nextUrl.searchParams.get('limit') || '50';
    const offset = req.nextUrl.searchParams.get('offset') || '0';

    const res = await fetch(
      backendUrl(`/api/scripts/history?limit=${limit}&offset=${offset}`),
      { headers: proxyHeaders(projectHeaders), cache: 'no-store' },
    );

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
    console.error('[Scripts] History error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch script history' },
      { status: 500 },
    );
  }
}
