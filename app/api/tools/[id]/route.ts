export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * DELETE /api/tools/:id — Disconnect a tool
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
    }

    await prisma.toolConnection.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Tools DELETE]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to disconnect tool' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tools/:id — Update tool config
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
    }

    const body = await req.json();
    const { config, displayName } = body;

    const updated = await prisma.toolConnection.update({
      where: { id },
      data: {
        ...(config && { config }),
        ...(displayName && { displayName }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('[Tools PATCH]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update tool' },
      { status: 500 }
    );
  }
}
