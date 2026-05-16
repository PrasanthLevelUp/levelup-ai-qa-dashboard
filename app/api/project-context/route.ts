export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET — fetch active project context(s)
export async function GET() {
  try {
    const contexts = await prisma.projectContext.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { scripts: true } } },
    });
    return NextResponse.json({ success: true, data: contexts });
  } catch (error) {
    console.error('[ProjectContext] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch project contexts', details: String(error) },
      { status: 500 }
    );
  }
}

// POST — create or update project context
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      name,
      appUrl,
      framework,
      authMethod,
      selectorStrategy,
      appDescription,
      navigationFlow,
      customRules,
      credentials,
    } = body;

    if (!name || !appUrl) {
      return NextResponse.json(
        { success: false, error: 'name and appUrl are required' },
        { status: 400 }
      );
    }

    let context;
    if (id) {
      // Update existing
      context = await prisma.projectContext.update({
        where: { id: Number(id) },
        data: {
          name,
          appUrl,
          framework: framework || null,
          authMethod: authMethod || null,
          selectorStrategy: selectorStrategy || null,
          appDescription: appDescription || null,
          navigationFlow: navigationFlow || null,
          customRules: customRules || null,
          credentials: credentials || null,
        },
      });
    } else {
      // Create new
      context = await prisma.projectContext.create({
        data: {
          name,
          appUrl,
          framework: framework || null,
          authMethod: authMethod || null,
          selectorStrategy: selectorStrategy || null,
          appDescription: appDescription || null,
          navigationFlow: navigationFlow || null,
          customRules: customRules || null,
          credentials: credentials || null,
        },
      });
    }

    return NextResponse.json({ success: true, data: context });
  } catch (error) {
    console.error('[ProjectContext] POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save project context', details: String(error) },
      { status: 500 }
    );
  }
}
