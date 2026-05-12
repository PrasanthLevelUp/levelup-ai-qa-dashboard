export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams?.get('limit') ?? '20', 10);

    const actions = await prisma.healingAction.findMany({
      take: Math.min(limit, 50),
      orderBy: { createdAt: 'desc' },
      include: { execution: true },
    });

    const result = (actions ?? []).map((a: any) => ({
      id: a?.id ?? 0,
      executionId: a?.testExecutionId ?? 0,
      timestamp: a?.createdAt?.toISOString() ?? '',
      testName: a?.testName ?? '',
      repository: a?.execution?.testName ?? 'unknown',
      failedLocator: a?.failedLocator ?? '',
      healedLocator: a?.healedLocator ?? '',
      status: a?.success ? 'healed' : 'failed',
      strategy: a?.healingStrategy ?? 'unknown',
      confidence: a?.confidence ?? 0,
      tokensUsed: a?.aiTokensUsed ?? 0,
    }));

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Recent healings API error:', error);
    return NextResponse.json([], { status: 500 });
  }
}
