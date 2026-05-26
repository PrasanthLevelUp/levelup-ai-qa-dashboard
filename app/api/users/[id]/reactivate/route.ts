export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendPut } from '@/lib/backend-api';

export async function PUT(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await backendPut(`/api/users/${id}/reactivate`, {});
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
