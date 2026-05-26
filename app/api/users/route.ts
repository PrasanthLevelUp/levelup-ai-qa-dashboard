export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { backendGet } from '@/lib/backend-api';

export async function GET() {
  try {
    const data = await backendGet('/api/users');
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[Users] List failed:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
