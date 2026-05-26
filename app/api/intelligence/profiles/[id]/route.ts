export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { backendGet, backendDelete } from '@/lib/backend-api';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const data = await backendGet(`/api/intelligence/profiles/${params.id}`);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const data = await backendDelete(`/api/intelligence/profiles/${params.id}`);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
