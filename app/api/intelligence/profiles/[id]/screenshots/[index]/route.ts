export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { backendDelete } from '@/lib/backend-api';

function extractProjectHeaders(req: Request): Record<string, string> {
  const projectId = req.headers.get('x-project-id');
  return projectId ? { 'x-project-id': projectId } : {};
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string; index: string } }
) {
  try {
    const data = await backendDelete(
      `/api/intelligence/profiles/${params.id}/screenshots/${params.index}`,
      extractProjectHeaders(req)
    );
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
