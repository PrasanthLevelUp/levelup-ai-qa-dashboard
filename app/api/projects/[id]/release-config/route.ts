export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { backendPut } from '@/lib/backend-api';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const result = await backendPut(`/api/projects/${params.id}/release-config`, body);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Release config API error:', error);
    return NextResponse.json(
      { error: 'Failed to update release config', details: error?.message || String(error) },
      { status: 500 },
    );
  }
}
