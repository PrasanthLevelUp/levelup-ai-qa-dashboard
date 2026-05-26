export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendPut } from '@/lib/backend-api';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = await backendPut(`/api/users/${id}/role`, body);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[Users] Update role failed:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
