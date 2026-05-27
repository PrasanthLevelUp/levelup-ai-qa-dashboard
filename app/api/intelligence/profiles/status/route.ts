export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { backendGet } from '@/lib/backend-api';

function extractProjectHeaders(req: Request): Record<string, string> {
  const projectId = req.headers.get('x-project-id');
  return projectId ? { 'x-project-id': projectId } : {};
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url') || '';
    if (!url) return NextResponse.json({ success: false, error: 'url required' }, { status: 400 });
    const data = await backendGet(`/api/intelligence/profiles/status?url=${encodeURIComponent(url)}`, extractProjectHeaders(req));
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
