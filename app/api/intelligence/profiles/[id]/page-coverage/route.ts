export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { backendGet } from '@/lib/backend-api';

function extractProjectHeaders(req: Request): Record<string, string> {
  const projectId = req.headers.get('x-project-id');
  return projectId ? { 'x-project-id': projectId } : {};
}

/**
 * Test-case page coverage for a profile.
 * Proxies to backend GET /api/intelligence/profiles/:id/page-coverage which
 * derives the pages the project's test cases reference and reports which the
 * crawl already covers vs. which are missing.
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const data = await backendGet(
      `/api/intelligence/profiles/${params.id}/page-coverage`,
      extractProjectHeaders(req),
    );
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
