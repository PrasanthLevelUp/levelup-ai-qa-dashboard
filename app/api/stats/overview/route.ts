export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams?.get('period') ?? '7d';
    const days = period === '30d' ? 30 : period === '90d' ? 90 : 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const prevSince = new Date(since.getTime() - days * 24 * 60 * 60 * 1000);

    // Current period
    const executions = await prisma.testExecution.findMany({ where: { createdAt: { gte: since } } });
    const totalRuns = executions?.length ?? 0;
    const healed = executions?.filter((e: any) => e?.status === 'healed')?.length ?? 0;
    const healingAttempted = executions?.filter((e: any) => e?.healingAttempted)?.length ?? 0;
    const nonAi = executions?.filter((e: any) => e?.healingAttempted && e?.healingStrategy !== 'ai')?.length ?? 0;
    const successRate = healingAttempted > 0 ? Math.round((healed / healingAttempted) * 1000) / 10 : 0;
    const aiCallsSaved = healingAttempted > 0 ? Math.round((nonAi / healingAttempted) * 1000) / 10 : 0;

    const tokenData = await prisma.tokenUsage.aggregate({ where: { date: { gte: since } }, _sum: { tokensUsed: true } });
    const totalTokens = tokenData?._sum?.tokensUsed ?? 0;

    // Previous period for trends
    const prevExec = await prisma.testExecution.findMany({ where: { createdAt: { gte: prevSince, lt: since } } });
    const prevTotal = prevExec?.length ?? 0;
    const prevHealed = prevExec?.filter((e: any) => e?.status === 'healed')?.length ?? 0;
    const prevAttempted = prevExec?.filter((e: any) => e?.healingAttempted)?.length ?? 0;
    const prevNonAi = prevExec?.filter((e: any) => e?.healingAttempted && e?.healingStrategy !== 'ai')?.length ?? 0;
    const prevSuccessRate = prevAttempted > 0 ? (prevHealed / prevAttempted) * 100 : 0;
    const prevAiSaved = prevAttempted > 0 ? (prevNonAi / prevAttempted) * 100 : 0;

    return NextResponse.json({
      totalRuns,
      successRate,
      aiCallsSaved,
      totalTokens,
      trends: {
        runs: totalRuns >= prevTotal ? 'up' : 'down',
        success: successRate >= prevSuccessRate ? 'up' : 'down',
        savings: aiCallsSaved >= prevAiSaved ? 'up' : 'down',
        tokens: 'down', // less tokens = good
      },
      prevRuns: prevTotal,
      prevSuccessRate: Math.round(prevSuccessRate * 10) / 10,
    });
  } catch (error: any) {
    console.error('Overview API error:', error);
    return NextResponse.json({ error: 'Failed to fetch overview stats' }, { status: 500 });
  }
}
