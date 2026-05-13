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

    // Get job from local DB
    const job = await prisma.healingJob.findUnique({
      where: { id: jobId },
    });

    // Also try to get live status from backend
    let backendStatus = null;
    try {
      const res = await fetch(`${BACKEND_URL}/api/status/${jobId}`, {
        headers: { 'Authorization': `Bearer ${API_KEY}` },
      });
      if (res.ok) {
        backendStatus = await res.json();
      }
    } catch {
      // Backend may be unreachable
    }

    // Also try to get report
    let report = null;
    try {
      const res = await fetch(`${BACKEND_URL}/api/reports/${jobId}`, {
        headers: { 'Authorization': `Bearer ${API_KEY}` },
      });
      if (res.ok) {
        report = await res.json();
      }
    } catch {
      // No report available
    }

    let resultData = null;
    if (job?.result) {
      try {
        resultData = JSON.parse(job.result);
      } catch {
        resultData = { raw: job.result };
      }
    }

    return NextResponse.json({
      job: job ? { ...job, resultData } : null,
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
