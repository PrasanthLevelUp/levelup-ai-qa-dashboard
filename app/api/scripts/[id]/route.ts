export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
    }

    const script = await prisma.generatedScript.findUnique({
      where: { id },
      include: {
        projectContext: { select: { name: true, appUrl: true } },
      },
    });

    if (!script) {
      return NextResponse.json({ success: false, error: 'Script not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: script });
  } catch (error) {
    console.error('[Scripts] GET/:id error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch script', details: String(error) },
      { status: 500 }
    );
  }
}
