export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { backendGet } from '@/lib/backend-api';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const limit = searchParams.get('limit') || '50';
    const status = searchParams.get('status') || '';

    let qs = `?limit=${limit}`;
    if (status) qs += `&status=${status}`;

    const result = await backendGet(`/api/dashboard/jobs${qs}`);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[Jobs API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs', details: String(error) },
      { status: 500 },
    );
  }
}
