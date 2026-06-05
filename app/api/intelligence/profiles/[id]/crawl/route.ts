export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { backendPost } from '@/lib/backend-api';

function extractProjectHeaders(req: Request): Record<string, string> {
  const projectId = req.headers.get('x-project-id');
  return projectId ? { 'x-project-id': projectId } : {};
}

/**
 * Manually trigger a deep crawl for a profile ("Crawl Now").
 * Proxies to backend POST /api/intelligence/profiles/:id/crawl which runs the
 * crawl asynchronously (returns 202). The client then polls GET /profiles/:id
 * until the profile status leaves `crawling`.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    const data = await backendPost(
      `/api/intelligence/profiles/${params.id}/crawl`,
      body,
      extractProjectHeaders(req),
    );
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
