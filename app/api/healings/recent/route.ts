export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { backendGet } from '@/lib/backend-api';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams?.get('limit') ?? '20';
    const result = await backendGet(`/api/dashboard/healings/recent?limit=${limit}`);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Recent healings API error:', error);
    return NextResponse.json([], { status: 500 });
  }
}
