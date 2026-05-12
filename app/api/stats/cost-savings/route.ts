export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams?.get('period') ?? '7d';
    const days = period === '30d' ? 30 : period === '90d' ? 90 : 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const healingActions = await prisma.healingAction.findMany({
      where: { createdAt: { gte: since } },
    });

    const totalActions = healingActions?.length ?? 0;
    const avgTokensPerAiCall = 500;
    const costPerToken = 0.000003;

    // Traditional: every healing uses AI
    const traditionalTokens = totalActions * avgTokensPerAiCall;
    const traditionalCost = Math.round(traditionalTokens * costPerToken * 100) / 100;

    // Actual: only AI engine actions use tokens
    const actualTokens = (healingActions ?? []).reduce((sum: number, a: any) => sum + (a?.aiTokensUsed ?? 0), 0);
    const actualCost = Math.round(actualTokens * costPerToken * 100) / 100;

    const saved = Math.round((traditionalCost - actualCost) * 100) / 100;
    const percentage = traditionalCost > 0 ? Math.round((saved / traditionalCost) * 1000) / 10 : 0;

    return NextResponse.json({
      traditionalCost,
      actualCost,
      saved,
      percentage,
      traditionalTokens,
      actualTokens,
    });
  } catch (error: any) {
    console.error('Cost savings API error:', error);
    return NextResponse.json({ error: 'Failed to fetch cost savings' }, { status: 500 });
  }
}
