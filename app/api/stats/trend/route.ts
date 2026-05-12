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
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const byDate: Record<string, { total: number; healed: number; attempted: number }> = {};
    for (const ex of executions ?? []) {
      const dateStr = ex?.createdAt?.toISOString()?.split('T')?.[0] ?? 'unknown';
      if (!byDate[dateStr]) byDate[dateStr] = { total: 0, healed: 0, attempted: 0 };
      const entry = byDate[dateStr]!;
      entry.total++;
      if (ex?.healingAttempted) entry.attempted++;
      if (ex?.status === 'healed') entry.healed++;
    }

    const trend = Object.entries(byDate ?? {}).map(([date, data]: [string, any]) => ({
      date,
      successRate: data?.attempted > 0 ? Math.round((data.healed / data.attempted) * 1000) / 10 : 100,
      totalRuns: data?.total ?? 0,
      healed: data?.healed ?? 0,
    }));

    return NextResponse.json(trend);
  } catch (error: any) {
    console.error('Trend API error:', error);
    return NextResponse.json({ error: 'Failed to fetch trend data', details: error?.message || String(error) }, { status: 500 });
  }
}
