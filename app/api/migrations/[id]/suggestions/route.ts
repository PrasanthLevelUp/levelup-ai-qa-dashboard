export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/** GET /api/migrations/[id]/suggestions — mappings + affected scripts + previews. */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const res = await fetch(
      backendUrl(`/api/migrations/${encodeURIComponent(params.id)}/suggestions`),
      { headers: proxyHeaders(extractProjectHeaders(req)), cache: 'no-store' },
    );
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.ok ? 200 : res.status });
  } catch (error) {
    console.error('[Migrations] suggestions error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch suggestions' }, { status: 500 });
  }
}
