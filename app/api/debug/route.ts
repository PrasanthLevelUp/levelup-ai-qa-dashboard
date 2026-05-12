export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const checks: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    hasDbUrl: !!process.env.DATABASE_URL,
    dbUrlPrefix: process.env.DATABASE_URL?.substring(0, 20) + '...',
    hasBackendUrl: !!process.env.BACKEND_API_URL,
    nodeEnv: process.env.NODE_ENV,
  };

  try {
    const result = await prisma.$queryRaw`SELECT 1 as ok` as any[];
    checks.dbConnection = 'OK';
    checks.dbResult = result;
  } catch (error: any) {
    checks.dbConnection = 'FAILED';
    checks.dbError = error?.message || String(error);
    checks.dbErrorCode = error?.code;
  }

  try {
    const tables = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' ORDER BY table_name
    ` as any[];
    checks.tables = tables.map((t: any) => t.table_name);
  } catch (error: any) {
    checks.tablesError = error?.message || String(error);
  }

  try {
    const count = await prisma.testExecution.count();
    checks.testExecutionCount = count;
  } catch (error: any) {
    checks.testExecutionError = error?.message || String(error);
  }

  return NextResponse.json(checks);
}
