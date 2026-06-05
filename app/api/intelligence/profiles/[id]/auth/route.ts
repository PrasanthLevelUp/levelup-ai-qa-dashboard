export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { backendPost } from '@/lib/backend-api';

function extractProjectHeaders(req: Request): Record<string, string> {
  const projectId = req.headers.get('x-project-id');
  return projectId ? { 'x-project-id': projectId } : {};
}

/**
 * Save authentication config for a profile.
 * Proxies to backend POST /api/intelligence/profiles/:id/auth.
 * Credentials are forwarded to the backend, stored server-side, and never
 * returned to the browser (backend sanitizes the response).
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const data = await backendPost(
      `/api/intelligence/profiles/${params.id}/auth`,
      body,
      extractProjectHeaders(req),
    );
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
