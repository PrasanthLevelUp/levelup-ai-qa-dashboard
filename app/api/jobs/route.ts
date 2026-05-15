export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const status = searchParams.get('status') || '';

    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }

    const dbJobs = await prisma.healingJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Transform DB rows to match the frontend Job interface
    const jobs = dbJobs.map((j) => {
      let resultData = null;
      if (j.result) {
        try {
          resultData = JSON.parse(j.result);
        } catch {
          resultData = null;
        }
      }

      return {
        id: j.id,
        repositoryId: j.repositoryId,
        repositoryUrl: j.repositoryUrl,
        branch: j.branch,
        commitSha: j.commitSha,
        status: j.status,
        progress: j.progress,
        createdAt: j.createdAt?.toISOString() ?? null,
        startedAt: j.startedAt?.toISOString() ?? null,
        completedAt: j.completedAt?.toISOString() ?? null,
        result: j.result,
        resultData,
        error: j.error,
      };
    });

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error('[Jobs API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs', details: String(error) },
      { status: 500 }
    );
  }
}
