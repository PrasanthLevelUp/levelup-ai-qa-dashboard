export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { backendGet } from '@/lib/backend-api';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams?.get('limit') ?? '20';
    const projectId = searchParams?.get('projectId') ?? '';
    const status = searchParams?.get('status') ?? '';
    // Workspace scope: environment (WHERE) + time window (WHEN).
    const environmentId = searchParams?.get('environmentId') ?? '';
    const startDate = searchParams?.get('startDate') ?? '';
    const endDate = searchParams?.get('endDate') ?? '';
    const pid = projectId ? `&projectId=${encodeURIComponent(projectId)}` : '';
    const st = status ? `&status=${encodeURIComponent(status)}` : '';
    const env = environmentId ? `&environmentId=${encodeURIComponent(environmentId)}` : '';
    const sd = startDate ? `&startDate=${encodeURIComponent(startDate)}` : '';
    const ed = endDate ? `&endDate=${encodeURIComponent(endDate)}` : '';
    const result = await backendGet(`/api/dashboard/healings/recent?limit=${limit}${pid}${st}${env}${sd}${ed}`);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Recent healings API error:', error);
    return NextResponse.json([], { status: 500 });
  }
}
