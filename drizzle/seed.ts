import { config } from 'dotenv';
import { and, eq } from 'drizzle-orm';

config({ path: '.env.local' });
config({ path: 'apps/api/.env' });

async function loadDeps() {
  const { db } = await import('../packages/db/src/client.ts');
  const schema = await import('../packages/db/src/schema/index.ts');
  return { db, ...schema };
}

type SeedDeps = Awaited<ReturnType<typeof loadDeps>>;

async function seedUsers(deps: SeedDeps) {
  const { db, users } = deps;
  await db
    .insert(users)
    .values([
      {
        clerkId: 'clerk_dev_owner_001',
        email: 'owner@codeopt.dev',
        name: 'CodeOpt Owner',
        plan: 'team',
        creditsUsed: 180,
        creditsLimit: 10000,
      },
      {
        clerkId: 'clerk_dev_admin_001',
        email: 'admin@codeopt.dev',
        name: 'CodeOpt Admin',
        plan: 'team',
        creditsUsed: 95,
        creditsLimit: 10000,
      },
      {
        clerkId: 'clerk_dev_dev_001',
        email: 'dev@codeopt.dev',
        name: 'CodeOpt Developer',
        plan: 'team',
        creditsUsed: 64,
        creditsLimit: 10000,
      },
    ])
    .onConflictDoNothing();

  const owner = await db.query.users.findFirst({ where: (t, { eq: equals }) => equals(t.clerkId, 'clerk_dev_owner_001') });
  const admin = await db.query.users.findFirst({ where: (t, { eq: equals }) => equals(t.clerkId, 'clerk_dev_admin_001') });
  const developer = await db.query.users.findFirst({ where: (t, { eq: equals }) => equals(t.clerkId, 'clerk_dev_dev_001') });

  if (!owner || !admin || !developer) {
    throw new Error('Failed to seed or fetch base users.');
  }

  return { owner, admin, developer };
}

async function seedWorkspace(deps: SeedDeps, ownerId: string) {
  const { db, workspaces } = deps;
  await db
    .insert(workspaces)
    .values({
      name: 'CodeOpt Dev Workspace',
      slug: 'codeopt-dev-workspace',
      ownerId,
      defaultBranch: 'main',
      githubRepoUrl: 'https://github.com/example/codeopt-dev-workspace',
    })
    .onConflictDoNothing();

  const workspace = await db.query.workspaces.findFirst({ where: (t, { eq: equals }) => equals(t.slug, 'codeopt-dev-workspace') });
  if (!workspace) {
    throw new Error('Failed to seed or fetch workspace.');
  }

  return workspace;
}

async function seedTeam(deps: SeedDeps, workspaceId: string, ownerId: string, adminId: string, developerId: string) {
  const { db, teamMembers } = deps;
  await db
    .insert(teamMembers)
    .values([
      {
        workspaceId,
        userId: ownerId,
        role: 'owner',
        status: 'active',
        joinedAt: new Date(),
      },
      {
        workspaceId,
        userId: adminId,
        role: 'admin',
        status: 'active',
        joinedAt: new Date(),
      },
      {
        workspaceId,
        userId: developerId,
        role: 'developer',
        status: 'active',
        joinedAt: new Date(),
      },
    ])
    .onConflictDoNothing();
}

async function seedAnalyses(deps: SeedDeps, workspaceId: string, ownerId: string, developerId: string) {
  const { db, analyses } = deps;
  const seeds = [
    {
      workspaceId,
      createdById: ownerId,
      filename: 'src/services/auth.service.ts',
      language: 'typescript' as const,
      status: 'complete' as const,
      score: 89,
      linesOfCode: 214,
      cyclomaticComplexity: 12,
      cognitiveComplexity: 18,
      duplicationPct: 4,
      maintainabilityGrade: 'A',
      testCoveragePct: 87,
      tokensUsed: 4200,
      creditsCharged: 12,
      modelUsed: 'claude-sonnet-4-6',
      completedAt: new Date(),
      metadata: {
        sourceCode: "export async function validateAuth() { return true; }",
      },
    },
    {
      workspaceId,
      createdById: developerId,
      filename: 'src/routes/billing.ts',
      language: 'typescript' as const,
      status: 'complete' as const,
      score: 74,
      linesOfCode: 301,
      cyclomaticComplexity: 21,
      cognitiveComplexity: 33,
      duplicationPct: 11,
      maintainabilityGrade: 'B',
      testCoveragePct: 63,
      tokensUsed: 5100,
      creditsCharged: 14,
      modelUsed: 'claude-sonnet-4-6',
      completedAt: new Date(),
      metadata: {
        sourceCode: "export async function createCheckout() { throw new Error('todo'); }",
      },
    },
    {
      workspaceId,
      createdById: developerId,
      filename: 'src/lib/cache.ts',
      language: 'typescript' as const,
      status: 'processing' as const,
      creditsCharged: 8,
    },
  ];

  for (const entry of seeds) {
    const existing = await db.query.analyses.findFirst({
      where: (t, { and: andExpr, eq: equals }) =>
        andExpr(eq(t.workspaceId, workspaceId), equals(t.filename, entry.filename)),
    });

    if (!existing) {
      await db.insert(analyses).values(entry);
    }
  }

  const seededAnalyses = await db
    .select({ id: analyses.id, filename: analyses.filename, createdById: analyses.createdById })
    .from(analyses)
    .where(eq(analyses.workspaceId, workspaceId));

  return seededAnalyses;
}

async function seedIssuesAndFixes(deps: SeedDeps, analysisRows: Array<{ id: string; filename: string; createdById: string }>, developerId: string) {
  const { db, fixes, issues } = deps;
  const authAnalysis = analysisRows.find((a) => a.filename === 'src/services/auth.service.ts');
  const billingAnalysis = analysisRows.find((a) => a.filename === 'src/routes/billing.ts');

  if (!authAnalysis || !billingAnalysis) {
    throw new Error('Expected seeded analyses not found.');
  }

  const issueSeeds = [
      {
        analysisId: authAnalysis.id,
        line: 42,
        col: 10,
        severity: 'warning',
        category: 'best-practice',
        rule: 'auth/null-guard',
        message: 'Missing explicit null guard before token decode.',
        suggestion: 'Validate token shape before decode branch.',
        fixable: true,
      },
      {
        analysisId: billingAnalysis.id,
        line: 77,
        col: 4,
        severity: 'error',
        category: 'security',
        rule: 'billing/secret-leak',
        message: 'Potential sensitive value exposure in error payload.',
        suggestion: 'Return generic billing error and log detailed cause server-side.',
        fixable: true,
      },
      {
        analysisId: billingAnalysis.id,
        line: 121,
        col: 2,
        severity: 'info',
        category: 'style',
        rule: 'style/prefer-const',
        message: 'Variable can be const.',
        fixable: true,
      },
    ];

  for (const entry of issueSeeds) {
    const existing = await db.query.issues.findFirst({
      where: (t, { and: andExpr, eq: equals }) =>
        andExpr(equals(t.analysisId, entry.analysisId), equals(t.rule, entry.rule), equals(t.line, entry.line)),
    });

    if (!existing) {
      await db.insert(issues).values(entry);
    }
  }

  const billingSecurityIssue = await db.query.issues.findFirst({
    where: (t, { and: andExpr, eq: equals }) =>
      andExpr(eq(t.analysisId, billingAnalysis.id), eq(t.rule, 'billing/secret-leak')),
  });

  if (billingSecurityIssue) {
    await db
      .insert(fixes)
      .values({
        issueId: billingSecurityIssue.id,
        appliedById: developerId,
        status: 'applied',
        originalCode: 'return reply.status(400).send({ error: err.message, raw: err });',
        fixedCode: 'return reply.status(400).send({ error: "Billing operation failed" });',
        explanation: 'Removes sensitive details from client payload while preserving server logs.',
        confidenceScore: 92,
        userRating: 5,
        appliedAt: new Date(),
      })
      .onConflictDoNothing();

    await db
      .update(issues)
      .set({
        fixApplied: true,
        fixAppliedAt: new Date(),
        fixAppliedBy: developerId,
      })
      .where(eq(issues.id, billingSecurityIssue.id));
  }
}

async function seedSupportingData(deps: SeedDeps, workspaceId: string, ownerId: string) {
  const { db, subscriptions, apiKeys, conversations, credits, auditLogs } = deps;
  await db
    .insert(subscriptions)
    .values({
      userId: ownerId,
      stripeSubscriptionId: 'sub_dev_seed_001',
      stripePriceId: 'price_dev_team_seed',
      status: 'active',
      plan: 'team',
      seatsCount: 10,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })
    .onConflictDoNothing();

  await db
    .insert(apiKeys)
    .values({
      workspaceId,
      createdById: ownerId,
      name: 'Local Dev Key',
      keyHash: '$2b$12$localdevseedlocaldevseedlocaldevseedhash0000000000000',
      keyPrefix: 'co_dev_1',
      isActive: true,
    })
    .onConflictDoNothing();

  await db
    .insert(conversations)
    .values({
      userId: ownerId,
      workspaceId,
      title: 'Seeded conversation',
      messageCount: 4,
      lastMessageAt: new Date(),
    })
    .onConflictDoNothing();

  await db
    .insert(credits)
    .values({
      userId: ownerId,
      delta: -12,
      balanceAfter: 9988,
      reason: 'analysis.completed',
    })
    .onConflictDoNothing();

  await db
    .insert(auditLogs)
    .values([
      {
        actorId: ownerId,
        workspaceId,
        action: 'workspace.seeded',
        resourceType: 'workspace',
        ipAddress: '127.0.0.1',
        userAgent: 'drizzle-seed-script',
      },
      {
        actorId: ownerId,
        workspaceId,
        action: 'analysis.seeded',
        resourceType: 'analysis',
        ipAddress: '127.0.0.1',
        userAgent: 'drizzle-seed-script',
      },
    ])
    .onConflictDoNothing();
}

export async function seed() {
  const deps = await loadDeps();

  const { owner, admin, developer } = await seedUsers(deps);
  const workspace = await seedWorkspace(deps, owner.id);

  await seedTeam(deps, workspace.id, owner.id, admin.id, developer.id);
  const analysisRows = await seedAnalyses(deps, workspace.id, owner.id, developer.id);
  await seedIssuesAndFixes(deps, analysisRows, developer.id);
  await seedSupportingData(deps, workspace.id, owner.id);

  console.log('Seed complete:', {
    workspaceId: workspace.id,
    users: [owner.email, admin.email, developer.email],
  });
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
