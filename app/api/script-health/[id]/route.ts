export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/**
 * GET /api/script-health/[id]
 * Detailed health for a single generated script (full outdated-locator list).
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const projectHeaders = extractProjectHeaders(req);
    const res = await fetch(backendUrl(`/api/script-health/${encodeURIComponent(params.id)}`), {
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
    console.error('[ScriptHealth] detail error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch script health detail' },
      { status: 500 },
    );
  }
}
