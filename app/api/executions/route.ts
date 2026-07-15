export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { backendGet } from '@/lib/backend-api';

/** GET /api/executions?limit=50&projectId= — recent canonical execution records. */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const limit = searchParams.get('limit') || '50';
    const projectId = searchParams.get('projectId') || '';
    // Time window (WHEN). Environment is intentionally NOT forwarded here —
    // execution records have no environment dimension.
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    let qs = `?limit=${limit}`;
    if (projectId) qs += `&projectId=${encodeURIComponent(projectId)}`;
    if (startDate) qs += `&startDate=${encodeURIComponent(startDate)}`;
    if (endDate) qs += `&endDate=${encodeURIComponent(endDate)}`;
    const result = await backendGet(`/api/dashboard/executions${qs}`);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Executions API] Error:', error);
    return NextResponse.json(
      { executions: [], count: 0, error: String(error?.message || error) },
      { status: 500 },
    );
  }
}
