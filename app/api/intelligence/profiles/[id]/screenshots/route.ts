export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { BACKEND_URL, API_KEY } from '@/lib/backend-api';

// Multipart passthrough — cannot use backendPost (it JSON.stringifies the body).
// We forward the raw FormData and let fetch set the multipart boundary itself.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const formData = await req.formData();
    const headers: Record<string, string> = { Authorization: `Bearer ${API_KEY}` };
    const projectId = req.headers.get('x-project-id');
    if (projectId) headers['x-project-id'] = projectId;
    const cookie = req.headers.get('cookie');
    if (cookie) headers['cookie'] = cookie;

    const res = await fetch(`${BACKEND_URL}/api/intelligence/profiles/${params.id}/screenshots`, {
      method: 'POST',
      headers,
      body: formData,
      cache: 'no-store',
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
