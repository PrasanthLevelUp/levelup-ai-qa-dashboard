export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { backendPost } from '@/lib/backend-api';

export async function POST(req: Request) {
  try {
    const data = await backendPost('/api/intelligence/migrate', {});
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
