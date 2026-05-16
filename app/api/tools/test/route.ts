export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface TestResult {
  success: boolean;
  message: string;
  details?: Record<string, any>;
}

/**
 * POST /api/tools/test — Test a tool connection
 * Accepts { toolType, config } and validates the credentials work.
 * Optionally pass { id } to persist the test result.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { toolType, config, id } = body;

    if (!toolType || !config) {
      return NextResponse.json(
        { success: false, error: 'toolType and config are required' },
        { status: 400 }
      );
    }

    let result: TestResult;

    switch (toolType) {
      case 'slack':
        result = await testSlack(config);
        break;
      case 'jira':
        result = await testJira(config);
        break;
      case 'teams':
        result = await testTeams(config);
        break;
      case 'github':
        result = await testGitHub(config);
        break;
      default:
        result = { success: false, message: `Unknown tool type: ${toolType}` };
    }

    // Persist test result if ID provided
    if (id && typeof id === 'number') {
      try {
        await prisma.toolConnection.update({
          where: { id },
          data: {
            lastTestedAt: new Date(),
            lastTestResult: result.success ? 'success' : 'failed',
            status: result.success ? 'connected' : 'error',
          },
        });
      } catch { /* record might not exist yet */ }
    }

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('[Tools Test]', error);
    return NextResponse.json(
      { success: false, error: 'Test failed unexpectedly' },
      { status: 500 }
    );
  }
}

async function testSlack(config: Record<string, any>): Promise<TestResult> {
  const { botToken } = config;
  if (!botToken) return { success: false, message: 'Bot Token is required' };

  try {
    const res = await fetch('https://slack.com/api/auth.test', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${botToken}`,
        'Content-Type': 'application/json',
      },
    });
    const data = await res.json();
    if (data.ok) {
      return {
        success: true,
        message: `Connected to workspace "${data.team}" as ${data.user}`,
        details: { team: data.team, user: data.user, teamId: data.team_id },
      };
    }
    return { success: false, message: `Slack error: ${data.error}` };
  } catch (err) {
    return { success: false, message: `Network error: ${String(err)}` };
  }
}

async function testJira(config: Record<string, any>): Promise<TestResult> {
  const { instanceUrl, email, apiToken } = config;
  if (!instanceUrl || !email || !apiToken) {
    return { success: false, message: 'Instance URL, email, and API token are required' };
  }

  try {
    const url = instanceUrl.replace(/\/$/, '');
    const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
    const res = await fetch(`${url}/rest/api/3/myself`, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: 'application/json',
      },
    });

    if (res.ok) {
      const data = await res.json();
      return {
        success: true,
        message: `Connected as ${data.displayName} (${data.emailAddress})`,
        details: { displayName: data.displayName, email: data.emailAddress, accountId: data.accountId },
      };
    }
    return { success: false, message: `Jira returned ${res.status}: ${res.statusText}` };
  } catch (err) {
    return { success: false, message: `Network error: ${String(err)}` };
  }
}

async function testTeams(config: Record<string, any>): Promise<TestResult> {
  const { webhookUrl } = config;
  if (!webhookUrl) return { success: false, message: 'Webhook URL is required' };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        '@type': 'MessageCard',
        '@context': 'http://schema.org/extensions',
        summary: 'LevelUp AI QA — Connection Test',
        themeColor: '10B981',
        sections: [
          {
            activityTitle: '✅ LevelUp AI QA Connected',
            activitySubtitle: 'Your Microsoft Teams integration is working.',
            facts: [{ name: 'Status', value: 'Connection verified' }],
          },
        ],
      }),
    });

    if (res.ok) {
      return { success: true, message: 'Test message sent to Teams channel' };
    }
    return { success: false, message: `Teams returned ${res.status}: ${await res.text()}` };
  } catch (err) {
    return { success: false, message: `Network error: ${String(err)}` };
  }
}

async function testGitHub(config: Record<string, any>): Promise<TestResult> {
  const { token } = config;
  if (!token) return { success: false, message: 'Personal Access Token is required' };

  try {
    const res = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (res.ok) {
      const data = await res.json();
      return {
        success: true,
        message: `Authenticated as ${data.login}`,
        details: { login: data.login, name: data.name, avatarUrl: data.avatar_url },
      };
    }
    return { success: false, message: `GitHub returned ${res.status}: ${res.statusText}` };
  } catch (err) {
    return { success: false, message: `Network error: ${String(err)}` };
  }
}
