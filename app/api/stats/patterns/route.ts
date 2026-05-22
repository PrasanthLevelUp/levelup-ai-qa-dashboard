export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { backendGet } from '@/lib/backend-api';

export async function GET() {
  try {
    const result = await backendGet('/api/dashboard/stats/patterns');
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Patterns API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch patterns', details: error?.message || String(error) },
      { status: 500 },
    );
  }
}
