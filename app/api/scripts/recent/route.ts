export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const scripts = await prisma.generatedScript.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        projectContext: { select: { name: true } },
      },
    });

    return NextResponse.json({ success: true, data: scripts });
  } catch (error) {
    console.error('[Scripts] Recent error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch scripts', details: String(error) },
      { status: 500 }
    );
  }
}
