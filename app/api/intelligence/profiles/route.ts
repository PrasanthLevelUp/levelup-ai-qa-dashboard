export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { backendGet } from '@/lib/backend-api';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || '';
    const limit = searchParams.get('limit') || '50';
    const offset = searchParams.get('offset') || '0';
    const qs = `?status=${status}&limit=${limit}&offset=${offset}`;
    const data = await backendGet(`/api/intelligence/profiles${qs}`);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
