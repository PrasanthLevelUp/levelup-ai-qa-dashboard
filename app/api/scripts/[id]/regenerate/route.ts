export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/**
 * POST /api/scripts/[id]/regenerate
 * Proxies to the backend Smart Regeneration endpoint: refresh page-objects /
 * locators against the latest crawl while preserving hand-written test logic.
 * Body: { dryRun?, preserveTestData?, preserveAssertions?, preserveCustomRegions? }
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    const projectHeaders = extractProjectHeaders(req);
    const res = await fetch(backendUrl(`/api/scripts/${encodeURIComponent(params.id)}/regenerate`), {
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
    console.error('[SmartRegen] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to regenerate script' }, { status: 500 });
  }
}
