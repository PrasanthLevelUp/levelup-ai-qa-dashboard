export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const status = searchParams.get('status') || undefined;

    const where = status ? { status } : {};

    const jobs = await prisma.healingJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Parse the result JSON string for each job
    const parsed = jobs.map((job) => {
      let resultData = null;
      if (job.result) {
        try {
          resultData = JSON.parse(job.result);
        } catch {
          resultData = { raw: job.result };
        }
      }
      return {
        ...job,
        resultData,
      };
    });

    return NextResponse.json({ jobs: parsed, total: parsed.length });
  } catch (error) {
    console.error('[Jobs API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs', details: String(error) },
      { status: 500 }
    );
  }
}
