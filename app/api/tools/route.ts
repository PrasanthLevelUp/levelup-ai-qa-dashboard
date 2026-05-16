export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/tools — List all tool connections
 */
export async function GET() {
  try {
    const connections = await prisma.toolConnection.findMany({
      orderBy: { createdAt: 'asc' },
    });

    // Sanitize — never expose raw tokens to frontend
    const sanitized = connections.map((c) => ({
      ...c,
      config: sanitizeConfig(c.toolType, c.config as Record<string, any> | null),
    }));

    return NextResponse.json({ success: true, data: sanitized });
  } catch (error) {
    console.error('[Tools GET]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tools' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tools — Create or update a tool connection
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { toolType, displayName, config } = body;

    if (!toolType || !displayName) {
      return NextResponse.json(
        { success: false, error: 'toolType and displayName are required' },
        { status: 400 }
      );
    }

    const connection = await prisma.toolConnection.upsert({
      where: { toolType },
      create: {
        toolType,
        displayName,
        status: 'connected',
        config: config || {},
        connectedAt: new Date(),
      },
      update: {
        displayName,
        status: 'connected',
        config: config || {},
        connectedAt: new Date(),
        lastTestResult: null,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...connection,
        config: sanitizeConfig(connection.toolType, connection.config as Record<string, any> | null),
      },
    });
  } catch (error) {
    console.error('[Tools POST]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save tool connection' },
      { status: 500 }
    );
  }
}

/** Strip secret values — show only masked versions */
function sanitizeConfig(
  toolType: string,
  config: Record<string, any> | null
): Record<string, any> {
  if (!config) return {};
  const safe = { ...config };

  const sensitiveKeys: Record<string, string[]> = {
    slack: ['botToken'],
    jira: ['apiToken'],
    teams: ['webhookUrl'],
    github: ['token'],
    gitlab: ['token'],
  };

  const keys = sensitiveKeys[toolType] || [];
  for (const key of keys) {
    if (safe[key] && typeof safe[key] === 'string') {
      const val = safe[key] as string;
      safe[key] = val.length > 8 ? val.slice(0, 4) + '••••' + val.slice(-4) : '••••••••';
    }
  }
  return safe;
}
