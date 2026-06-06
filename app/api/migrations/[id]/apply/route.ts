export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { backendUrl, proxyHeaders, extractProjectHeaders } from '@/lib/backend-proxy';

/** POST /api/migrations/[id]/apply — apply mapping (with overrides). Body: { overrides?, dryRun? } */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    const res = await fetch(
      backendUrl(`/api/migrations/${encodeURIComponent(params.id)}/apply`),
      {
        method: 'POST',
        headers: proxyHeaders(extractProjectHeaders(req)),
        body: JSON.stringify(body),
        cache: 'no-store',
      },
    );
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.ok ? 200 : res.status });
  } catch (error) {
    console.error('[Migrations] apply error:', error);
    return NextResponse.json({ success: false, error: 'Failed to apply migration' }, { status: 500 });
  }
}
