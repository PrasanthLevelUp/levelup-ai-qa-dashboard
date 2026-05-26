export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { backendGet } from '@/lib/backend-api';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams?.get('period') ?? '7d';
    const projectId = searchParams?.get('projectId') ?? '';
    const pid = projectId ? `&projectId=${projectId}` : '';
    const result = await backendGet(`/api/dashboard/stats/trend?period=${period}${pid}`);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('trend API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trend', details: error?.message || String(error) },
      { status: 500 },
    );
  }
}
