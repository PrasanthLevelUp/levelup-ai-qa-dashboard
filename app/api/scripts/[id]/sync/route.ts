export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/**
 * POST /api/scripts/[id]/sync
 * Proxies to the backend Script Sync endpoint: re-validate locators against the
 * latest crawl and auto-repair outdated selectors. Body: { dryRun?: boolean }.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    const projectHeaders = extractProjectHeaders(req);
    const res = await fetch(backendUrl(`/api/scripts/${encodeURIComponent(params.id)}/sync`), {
      method: 'POST',
      headers: proxyHeaders(projectHeaders),
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: data.error || `Backend returned ${res.status}` },
        { status: res.status },
      );
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('[ScriptSync] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to sync script' }, { status: 500 });
  }
}
