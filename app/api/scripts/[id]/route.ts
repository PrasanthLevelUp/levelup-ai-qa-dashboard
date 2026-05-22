export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { backendGet } from '@/lib/backend-api';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = params.id;
    const result = await backendGet(`/api/dashboard/scripts/${id}`);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[Scripts] GET/:id error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch script', details: String(error) },
      { status: 500 },
    );
  }
}
