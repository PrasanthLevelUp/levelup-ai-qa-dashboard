export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:8080';
const API_KEY = process.env.BACKEND_API_KEY || '';

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;

    // Get job from database directly
    const dbJob = await prisma.healingJob.findUnique({
      where: { id: jobId },
    });

    let job = null;
    if (dbJob) {
      let resultData = null;
      if (dbJob.result) {
        try {
          resultData = JSON.parse(dbJob.result);
        } catch {
          resultData = null;
        }
      }
      job = {
        id: dbJob.id,
        repositoryId: dbJob.repositoryId,
        repositoryUrl: dbJob.repositoryUrl,
        branch: dbJob.branch,
        commitSha: dbJob.commitSha,
        status: dbJob.status,
        progress: dbJob.progress,
        createdAt: dbJob.createdAt?.toISOString() ?? null,
        startedAt: dbJob.startedAt?.toISOString() ?? null,
        completedAt: dbJob.completedAt?.toISOString() ?? null,
        result: dbJob.result,
        resultData,
        error: dbJob.error,
      };
    }

    // Get live status from backend (for running jobs)
    let backendStatus = null;
    const headers = { 'Authorization': `Bearer ${API_KEY}` };
    try {
      const res = await fetch(`${BACKEND_URL}/api/status/${jobId}`, { headers });
      if (res.ok) {
        backendStatus = await res.json();
      }
    } catch {
      // Backend may be unreachable
    }

    // Get report from backend
    let report = null;
    try {
      const res = await fetch(`${BACKEND_URL}/api/reports/${jobId}`, { headers });
      if (res.ok) {
        report = await res.json();
      }
    } catch {
      // No report available
    }

    return NextResponse.json({
      job,
      backendStatus,
      report,
    });
  } catch (error) {
    console.error('[Job Detail] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job details', details: String(error) },
      { status: 500 }
    );
  }
}
