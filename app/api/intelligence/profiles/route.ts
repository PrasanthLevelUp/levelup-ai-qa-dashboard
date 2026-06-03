export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { backendGet, backendPost } from '@/lib/backend-api';

function extractProjectHeaders(req: Request): Record<string, string> {
  const projectId = req.headers.get('x-project-id');
  return projectId ? { 'x-project-id': projectId } : {};
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || '';
    const limit = searchParams.get('limit') || '50';
    const offset = searchParams.get('offset') || '0';
    const qs = `?status=${status}&limit=${limit}&offset=${offset}`;
    const data = await backendGet(`/api/intelligence/profiles${qs}`, extractProjectHeaders(req));
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = await backendPost('/api/intelligence/profiles', body, extractProjectHeaders(req));
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
