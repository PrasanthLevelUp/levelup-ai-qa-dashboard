export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams?.get('period') ?? '7d';
    const days = period === '30d' ? 30 : period === '90d' ? 90 : 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const executions = await prisma.testExecution.findMany({
      where: { createdAt: { gte: since }, healingAttempted: true },
    });

    const counts: Record<string, number> = {};
    for (const ex of executions ?? []) {
      const strat = ex?.healingStrategy ?? 'unknown';
      counts[strat] = (counts[strat] ?? 0) + 1;
    }

    const total = executions?.length ?? 1;
    const strategies = Object.entries(counts ?? {}).map(([name, count]: [string, number]) => ({
      name,
      count,
      percentage: Math.round((count / total) * 1000) / 10,
    }));

    return NextResponse.json(strategies);
  } catch (error: any) {
    console.error('Strategies API error:', error);
    return NextResponse.json({ error: 'Failed to fetch strategies', details: error?.message || String(error) }, { status: 500 });
  }
}
