export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { backendGet, backendPost } from '@/lib/backend-api';

// GET — fetch active project context(s)
export async function GET() {
  try {
    const result = await backendGet('/api/dashboard/project-context');
    return NextResponse.json(result);
  } catch (error) {
    console.error('[ProjectContext] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch project contexts', details: String(error) },
      { status: 500 },
    );
  }
}

// POST — create or update project context
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await backendPost('/api/dashboard/project-context', body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[ProjectContext] POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save project context', details: String(error) },
      { status: 500 },
    );
  }
}
