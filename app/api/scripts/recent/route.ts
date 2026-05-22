export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { backendGet } from '@/lib/backend-api';

export async function GET() {
  try {
    const result = await backendGet('/api/dashboard/scripts/recent');
    return NextResponse.json(result);
  } catch (error) {
    console.error('[Scripts] Recent error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch scripts', details: String(error) },
      { status: 500 },
    );
  }
}
