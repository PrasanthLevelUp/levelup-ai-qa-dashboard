export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { backendPost } from '@/lib/backend-api';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await backendPost('/api/users/invite', body);
    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    console.error('[Users] Invite failed:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
