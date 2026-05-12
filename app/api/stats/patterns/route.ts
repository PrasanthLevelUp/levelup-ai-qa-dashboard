export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const patterns = await prisma.learnedPattern.findMany({
      orderBy: { successCount: 'desc' },
    });

    const result = (patterns ?? []).map((p: any) => ({
      id: p?.id ?? 0,
      testName: p?.testName ?? '',
      failedLocator: p?.failedLocator ?? '',
      healedLocator: p?.healedLocator ?? '',
      strategy: p?.solutionStrategy ?? 'unknown',
      confidence: p?.confidence ?? 0,
      successCount: p?.successCount ?? 0,
      usageCount: p?.usageCount ?? 0,
      avgTokensSaved: p?.avgTokensSaved ?? 0,
    }));

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Patterns API error:', error);
    return NextResponse.json([], { status: 500 });
  }
}
