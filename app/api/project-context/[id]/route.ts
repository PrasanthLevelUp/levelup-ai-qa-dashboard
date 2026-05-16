export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET — fetch single project context
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
    }
    const context = await prisma.projectContext.findUnique({
      where: { id },
      include: { scripts: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });
    if (!context) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: context });
  } catch (error) {
    console.error('[ProjectContext] GET/:id error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch context', details: String(error) },
      { status: 500 }
    );
  }
}

// DELETE — soft-delete (deactivate) project context
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
    }
    await prisma.projectContext.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ProjectContext] DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete context', details: String(error) },
      { status: 500 }
    );
  }
}
