export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/**
 * GET /api/script-health/changes
 * Change-detection: diff of the two most recent crawls per app, plus the list
 * of scripts impacted by removed selectors.
 */
export async function GET(req: NextRequest) {
  try {
    const projectHeaders = extractProjectHeaders(req);
    const res = await fetch(backendUrl('/api/script-health/changes'), {
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
    console.error('[ScriptHealth] changes error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch change detection' },
      { status: 500 },
    );
  }
}
