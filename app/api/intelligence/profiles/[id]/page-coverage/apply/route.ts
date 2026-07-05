export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { backendPost } from '@/lib/backend-api';

function extractProjectHeaders(req: Request): Record<string, string> {
  const projectId = req.headers.get('x-project-id');
  return projectId ? { 'x-project-id': projectId } : {};
}

/**
 * One-click "Add missing pages & crawl".
 * Proxies to backend POST /api/intelligence/profiles/:id/page-coverage/apply
 * which persists the referenced-but-missing pages onto the profile and (unless
 * body.crawl === false) kicks off a background crawl that captures their DOM.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    const data = await backendPost(
      `/api/intelligence/profiles/${params.id}/page-coverage/apply`,
      body,
      extractProjectHeaders(req),
    );
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
