export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { backendGet } from '@/lib/backend-api';

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } },
) {
  try {
    const { jobId } = params;
    const result = await backendGet(`/api/dashboard/jobs/${jobId}`);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[Job Detail] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job details', details: String(error) },
      { status: 500 },
    );
  }
}
