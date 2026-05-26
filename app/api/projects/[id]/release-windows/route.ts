export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { backendGet, backendPost } from '@/lib/backend-api';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const result = await backendGet(`/api/projects/${params.id}/release-windows`);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Release windows GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch release windows', details: error?.message || String(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const result = await backendPost(`/api/projects/${params.id}/release-windows`, body);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Release windows POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create release window', details: error?.message || String(error) },
      { status: 500 },
    );
  }
}
