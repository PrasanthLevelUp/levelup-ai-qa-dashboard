export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { backendGet, backendDelete } from '@/lib/backend-api';

// GET — fetch single project context
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = params.id;
    const result = await backendGet(`/api/dashboard/project-context/${id}`);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[ProjectContext] GET/:id error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch context', details: String(error) },
      { status: 500 },
    );
  }
}

// DELETE — soft-delete (deactivate) project context
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = params.id;
    const result = await backendDelete(`/api/dashboard/project-context/${id}`);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[ProjectContext] DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete context', details: String(error) },
      { status: 500 },
    );
  }
}
