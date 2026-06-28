export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { backendPost } from '@/lib/backend-api';

/**
 * POST /api/jobs/:jobId/create-pr
 * 
 * Create a pull request with all successful healings from a job. The backend
 * owns the relationship: job → healings → group by file → patch → ONE PR.
 * The frontend only passes the jobId.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { jobId: string } },
) {
  try {
    const { jobId } = params;
    const body = await req.json().catch(() => ({}));
    
    const result = await backendPost(
      `/api/jobs/${jobId}/create-pr`,
      body,
    );
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('[Create PR] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create PR', details: String(error) },
      { status: 500 },
    );
  }
}
