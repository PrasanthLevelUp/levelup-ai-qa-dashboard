export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { backendGet } from '@/lib/backend-api';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params?.id ?? '0';
    const result = await backendGet(`/api/dashboard/healings/${id}`);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Healing detail API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch healing detail', details: error?.message || String(error) },
      { status: 500 },
    );
  }
}
