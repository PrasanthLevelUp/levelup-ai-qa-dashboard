import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TEST_NAMES = [
  'User can login to OrangeHRM',
  'User can navigate to dashboard',
  'Admin can create employee',
  'User can update profile',
  'User can search directory',
  'Admin can assign leave',
  'User can submit timesheet',
  'User can view payslip',
  'Admin can manage roles',
  'User can reset password',
];

const LOCATORS: { failed: string; healed: string; strategy: string }[] = [
  { failed: '#login-btn-broken', healed: "page.getByRole('button', { name: /login|sign in/i })", strategy: 'rule_based' },
  { failed: '.submit-form', healed: "page.getByRole('button', { name: /submit/i })", strategy: 'rule_based' },
  { failed: '#nav-dashboard', healed: "page.getByRole('link', { name: /dashboard/i })", strategy: 'rule_based' },
  { failed: 'input[name=\"username\"]', healed: "page.getByLabel('Username')", strategy: 'rule_based' },
  { failed: '.btn-primary.save', healed: "page.getByRole('button', { name: /save/i })", strategy: 'pattern_match' },
  { failed: '#employee-list-table', healed: "page.getByRole('table')", strategy: 'pattern_match' },
  { failed: 'div.search-box > input', healed: "page.getByPlaceholder('Search')", strategy: 'rule_based' },
  { failed: '#timesheet-submit', healed: "page.getByRole('button', { name: /submit timesheet/i })", strategy: 'ai' },
  { failed: '.dropdown-menu-item:nth-child(3)', healed: "page.getByRole('menuitem', { name: /profile/i })", strategy: 'rule_based' },
  { failed: 'a.forgot-password', healed: "page.getByRole('link', { name: /forgot password/i })", strategy: 'pattern_match' },
  { failed: '#modal-confirm-btn', healed: "page.getByRole('button', { name: /confirm/i })", strategy: 'rule_based' },
  { failed: '.payslip-download', healed: "page.getByRole('link', { name: /download/i })", strategy: 'ai' },
  { failed: 'table.roles-grid tr:first-child', healed: "page.getByRole('row').first()", strategy: 'pattern_match' },
  { failed: '#leave-balance-widget', healed: "page.getByText('Leave Balance')", strategy: 'rule_based' },
  { failed: '.notification-bell', healed: "page.getByRole('button', { name: /notifications/i })", strategy: 'rule_based' },
];

function randomDate(daysAgo: number): Date {
  const now = new Date('2026-05-12T10:00:00Z');
  const msAgo = Math.floor(Math.random() * daysAgo * 24 * 60 * 60 * 1000);
  return new Date(now.getTime() - msAgo);
}

async function main() {
  console.log('Seeding demo data...');

  for (let i = 0; i < 140; i++) {
    const testName = TEST_NAMES[i % TEST_NAMES.length] as string;
    const daysAgo = Math.floor(i / 5);
    const date = randomDate(Math.min(daysAgo + 1, 30));
    const locator = LOCATORS[i % LOCATORS.length] as (typeof LOCATORS)[0];

    const roll = Math.random();
    let status: string;
    let healingAttempted = false;
    let healingSucceeded = false;

    if (roll < 0.20) {
      status = 'passed';
    } else if (roll < 0.90) {
      status = 'healed';
      healingAttempted = true;
      healingSucceeded = true;
    } else if (roll < 0.95) {
      status = 'failed';
      healingAttempted = true;
      healingSucceeded = false;
    } else {
      status = 'timedOut';
      healingAttempted = false;
    }

    const exec = await prisma.testExecution.upsert({
      where: { id: i + 1 },
      update: {},
      create: {
        testName,
        status,
        healingAttempted,
        healingSucceeded,
        durationMs: Math.floor(2000 + Math.random() * 28000),
        createdAt: date,
      },
    });

    if (healingAttempted) {
      const confidence = status === 'healed'
        ? 0.85 + Math.random() * 0.15
        : 0.3 + Math.random() * 0.4;

      const strategy = locator.strategy;
      const tokensUsed = strategy === 'ai' ? Math.floor(200 + Math.random() * 800) : 0;

      await prisma.healingAction.upsert({
        where: { id: i + 1 },
        update: {},
        create: {
          testExecutionId: exec.id,
          testName,
          failedLocator: locator.failed,
          healedLocator: status === 'healed' ? locator.healed : null,
          healingStrategy: strategy ?? 'rule_based',
          aiTokensUsed: tokensUsed,
          success: status === 'healed',
          confidence: Math.round(confidence * 100) / 100,
          errorContext: `Error: locator('${locator.failed}') not found on page`,
          validationStatus: status === 'healed' ? 'approved' : 'rejected',
          validationReason: status === 'healed'
            ? 'Locator replaced with semantic selector. All 7 validation checks passed.'
            : 'Suggested locator did not match any element on page.',
          createdAt: date,
        },
      });
    }
  }

  // Seed token usage - daily entries for last 30 days (date is String in Railway DB)
  const now = new Date('2026-05-12T10:00:00Z');
  for (let d = 0; d < 30; d++) {
    const dateObj = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
    dateObj.setHours(0, 0, 0, 0);
    const dateStr = dateObj.toISOString().split('T')[0] as string;

    const aiTokens = Math.max(50, Math.floor(500 - d * 10 + Math.random() * 100));
    const costPerToken = 0.000003;

    await prisma.tokenUsage.upsert({
      where: { id: d + 1 },
      update: {},
      create: {
        date: dateStr,
        engine: 'ai',
        tokensUsed: aiTokens,
        costUsd: Math.round(aiTokens * costPerToken * 10000) / 10000,
        createdAt: dateObj,
      },
    });
  }

  // Seed learned patterns
  const patterns = [
    { testName: 'User can login to OrangeHRM', errorPattern: 'locator #login-btn-broken not found', failedLocator: '#login-btn-broken', healedLocator: "page.getByRole('button', { name: /login|sign in/i })", strategy: 'rule_based', confidence: 0.95, successCount: 12, usageCount: 8 },
    { testName: 'Admin can create employee', errorPattern: 'locator .submit-form not found', failedLocator: '.submit-form', healedLocator: "page.getByRole('button', { name: /submit/i })", strategy: 'rule_based', confidence: 0.92, successCount: 8, usageCount: 5 },
    { testName: 'User can search directory', errorPattern: 'locator div.search-box > input not found', failedLocator: 'div.search-box > input', healedLocator: "page.getByPlaceholder('Search')", strategy: 'pattern_match', confidence: 0.90, successCount: 6, usageCount: 4 },
    { testName: 'User can submit timesheet', errorPattern: 'locator #timesheet-submit not found', failedLocator: '#timesheet-submit', healedLocator: "page.getByRole('button', { name: /submit timesheet/i })", strategy: 'ai', confidence: 0.88, successCount: 3, usageCount: 2 },
  ];

  for (let i = 0; i < patterns.length; i++) {
    const p = patterns[i] as (typeof patterns)[0];
    await prisma.learnedPattern.upsert({
      where: { id: i + 1 },
      update: {},
      create: {
        testName: p.testName,
        errorPattern: p.errorPattern,
        failedLocator: p.failedLocator,
        healedLocator: p.healedLocator,
        solutionStrategy: p.strategy,
        confidence: p.confidence,
        successCount: p.successCount,
        failureCount: 0,
        usageCount: p.usageCount,
        avgTokensSaved: p.strategy === 'ai' ? 0 : 450,
      },
    });
  }

  console.log('Seeding complete!');
  console.log(await prisma.testExecution.count(), 'test executions');
  console.log(await prisma.healingAction.count(), 'healing actions');
  console.log(await prisma.learnedPattern.count(), 'learned patterns');
  console.log(await prisma.tokenUsage.count(), 'token usage entries');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
