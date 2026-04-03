import type { FastifyPluginAsync } from 'fastify';
import crypto from 'node:crypto';
import Groq from 'groq-sdk';
import { eq } from 'drizzle-orm';
import { db } from '@codeopt/db';
import { githubInstallations, auditLogs } from '@codeopt/db/schema';
import {
  buildAnalysisSystemPrompt,
  buildAnalysisUserPrompt,
  getTreeSitterAnalysis,
  buildASTContext,
} from '@codeopt/utils';
import {
  createInstallationOctokit,
  detectLanguage,
  shouldSkipFile,
} from '../lib/github.js';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? '' });

const SCORE_THRESHOLD = 50;
const MAX_FILES_PER_PR = 10;

const REPORT_ISSUE_TOOL = {
  type: 'function' as const,
  function: {
    name: 'report_issue',
    description: 'Report a SINGLE code issue. Call this ONCE per issue found. Be strict.',
    parameters: {
      type: 'object',
      properties: {
        line: { type: 'number', description: 'Exact line number (never 0)' },
        severity: { type: 'string', enum: ['error', 'warning', 'info'] },
        category: { type: 'string', enum: ['security', 'performance', 'complexity', 'style', 'best-practice', 'bug'] },
        rule: { type: 'string' },
        message: { type: 'string', description: 'Clear description of the problem' },
        suggestion: { type: 'string', description: 'Concrete fix with before/after complexity' },
        beforeComplexity: { type: 'string', description: 'e.g. O(n²)' },
        afterComplexity: { type: 'string', description: 'e.g. O(n)' },
      },
      required: ['line', 'severity', 'category', 'rule', 'message', 'suggestion'],
    },
  },
};

const SCORE_CODE_TOOL = {
  type: 'function' as const,
  function: {
    name: 'score_code',
    description: 'Score the code on 6 dimensions. Call EXACTLY ONCE. Be brutally honest. Total is out of 100.',
    parameters: {
      type: 'object',
      properties: {
        correctness: { type: 'number', description: '0-10: Does it produce correct output for all inputs including edge cases?' },
        performance: { type: 'number', description: '0-20: Is the algorithm optimal? O(n²) when O(n) exists = 2-5. Includes time complexity, cache locality, unnecessary recomputation.' },
        codeQuality: { type: 'number', description: '0-20: Naming, idioms, anti-patterns, type safety, readability, DRY principle.' },
        architecture: { type: 'number', description: '0-20: SRP, separation of concerns, modularity, testability, coupling. For React: component composition, hooks discipline, state management.' },
        optimization: { type: 'number', description: '0-20: Memory efficiency, pass-by-reference awareness, unnecessary copies, memoization, React re-render prevention.' },
        productionReadiness: { type: 'number', description: '0-10: Error handling, security, edge cases, logging, cleanup, graceful degradation.' },
        summary: { type: 'string', description: 'One-line verdict of the code quality' },
      },
      required: ['correctness', 'performance', 'codeQuality', 'architecture', 'optimization', 'productionReadiness', 'summary'],
    },
  },
};

// ---------- Webhook signature verification ----------

function verifyWebhookSignature(payload: string, signature: string | undefined): boolean {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

// ---------- Analyze a single file ----------

interface FileIssue {
  file: string;
  line: number;
  severity: string;
  category: string;
  message: string;
  suggestion?: string;
  beforeComplexity?: string;
  afterComplexity?: string;
}

interface ScoreBreakdown {
  correctness: number;
  performance: number;
  codeQuality: number;
  architecture: number;
  optimization: number;
  productionReadiness: number;
  summary: string;
  total: number;
}

async function analyzeFile(filename: string, content: string): Promise<{
  issues: FileIssue[];
  score: number;
  scoreBreakdown: ScoreBreakdown | null;
  cyclomaticComplexity: number | null;
  cognitiveComplexity: number | null;
}> {
  const language = detectLanguage(filename);

  // 1. AST Analysis
  const astMetrics = await getTreeSitterAnalysis(content, language);
  const astContext = astMetrics ? buildASTContext(astMetrics) : undefined;

  // 2. AI Analysis with BOTH tools
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: buildAnalysisSystemPrompt(language) },
      { role: 'user', content: buildAnalysisUserPrompt(language, content, astContext) },
    ],
    tools: [REPORT_ISSUE_TOOL, SCORE_CODE_TOOL],
    tool_choice: 'auto',
  });

  const toolCalls = response.choices[0]?.message?.tool_calls || [];

  // Extract issues
  const rawIssues = toolCalls
    .filter((tc) => tc.function.name === 'report_issue')
    .map((tc) => JSON.parse(tc.function.arguments));

  const issues: FileIssue[] = rawIssues.map((i: any) => ({
    file: filename,
    line: i.line || 1,
    severity: i.severity,
    category: i.category,
    message: i.message,
    suggestion: i.suggestion,
    beforeComplexity: i.beforeComplexity,
    afterComplexity: i.afterComplexity,
  }));

  // Extract score
  const scoreCall = toolCalls.find((tc) => tc.function.name === 'score_code');
  let scoreBreakdown: ScoreBreakdown | null = null;
  let score = 50; // Default if AI doesn't score

  if (scoreCall) {
    const s = JSON.parse(scoreCall.function.arguments);
    const rawTotal = (s.correctness || 0) + (s.performance || 0) + (s.codeQuality || 0) +
      (s.architecture || 0) + (s.optimization || 0) + (s.productionReadiness || 0);
    score = Math.max(0, Math.min(100, rawTotal)); // Already out of 100

    scoreBreakdown = {
      correctness: s.correctness || 0,
      performance: s.performance || 0,
      codeQuality: s.codeQuality || 0,
      architecture: s.architecture || 0,
      optimization: s.optimization || 0,
      productionReadiness: s.productionReadiness || 0,
      summary: s.summary || '',
      total: rawTotal,
    };
  }

  return {
    issues,
    score,
    scoreBreakdown,
    cyclomaticComplexity: astMetrics?.cyclomaticComplexity ?? null,
    cognitiveComplexity: astMetrics?.cognitiveComplexity ?? null,
  };
}

// ---------- Build the PR comment ----------

function buildPRComment(
  results: Array<{
    file: string;
    score: number;
    scoreBreakdown: ScoreBreakdown | null;
    issues: FileIssue[];
    cyclomaticComplexity: number | null;
    cognitiveComplexity: number | null
  }>,
  overallScore: number,
  passed: boolean,
  headSha: string,
): string {
  const statusIcon = passed ? '✅' : '❌';
  const allIssues = results.flatMap((r) => r.issues);
  const errors = allIssues.filter((i) => i.severity === 'error').length;
  const warnings = allIssues.filter((i) => i.severity === 'warning').length;
  const infos = allIssues.filter((i) => i.severity === 'info').length;

  let comment = `## 🔮 CodeSage Analysis — Score: ${overallScore}/100 ${statusIcon}\n\n`;

  comment += `| Metric | Value |\n|---|---|\n`;
  comment += `| Files Analyzed | ${results.length} |\n`;
  comment += `| Errors | ${errors} |\n`;
  comment += `| Warnings | ${warnings} |\n`;
  comment += `| Info | ${infos} |\n\n`;

  if (allIssues.length === 0 && results.every(r => r.score >= 90)) {
    comment += `> ✨ **No issues found!** Great code quality.\n`;
    return comment;
  }

  // Group issues by file
  for (const result of results) {
    comment += `### 📄 \`${result.file}\` — Score: ${result.score}/100\n`;

    // Add Score Breakdown Table
    if (result.scoreBreakdown) {
      const b = result.scoreBreakdown;
      comment += `\n**Code Quality Breakdown:**\n`;
      comment += `| Dimension | Score | Max |\n`;
      comment += `|---|---|---|\n`;
      comment += `| Correctness | ${b.correctness} | 10 |\n`;
      comment += `| Performance | ${b.performance} | 20 |\n`;
      comment += `| Code Quality | ${b.codeQuality} | 20 |\n`;
      comment += `| Architecture | ${b.architecture} | 20 |\n`;
      comment += `| Optimization | ${b.optimization} | 20 |\n`;
      comment += `| Production Readiness | ${b.productionReadiness} | 10 |\n`;
      comment += `| **Summary** | colspan=2 | *${b.summary}* |\n\n`;
    }

    if (result.cognitiveComplexity !== null) {
      comment += `> Cognitive Complexity: **${result.cognitiveComplexity}** · Cyclomatic: **${result.cyclomaticComplexity}**\n\n`;
    }

    if (result.issues.length === 0) {
      comment += `*No specific line-level issues reported.*\n\n`;
      continue;
    }

    for (const issue of result.issues) {
      const icon = issue.severity === 'error' ? '🔴' : issue.severity === 'warning' ? '🟡' : '🔵';
      comment += `${icon} **Ln ${issue.line}** [${issue.category}]: ${issue.message}\n`;
      if (issue.suggestion) {
        comment += `  > 💡 ${issue.suggestion}\n`;
        if (issue.beforeComplexity && issue.afterComplexity) {
          comment += `  > ⏱️ Complexity: \`${issue.beforeComplexity}\` → \`${issue.afterComplexity}\`\n`;
        }
      }
      comment += `\n`;
    }
  }

  comment += `---\n`;
  comment += `*Analyzed by [CodeSage](https://codesage.dev) · AI-Powered Code Review · Commit: ${headSha.slice(0, 7)}*\n`;

  return comment;
}

// ---------- Deduplication ----------

const processingPRs = new Set<string>();

function buildDedupeKey(owner: string, repo: string, prNumber: number, sha: string): string {
  return `${owner}/${repo}#${prNumber}@${sha}`;
}

// Auto-clean stale entries after 10 minutes
setInterval(() => {
  processingPRs.clear();
}, 10 * 60 * 1000);

// ---------- Handle PR event ----------

async function handlePullRequest(payload: any) {
  const { action, pull_request: pr, installation, repository } = payload;

  if (!['opened', 'synchronize'].includes(action)) return;
  if (!installation?.id || !pr || !repository) return;

  const installationId = installation.id;
  const owner = repository.owner.login;
  const repo = repository.name;
  const prNumber = pr.number;
  const headSha = pr.head.sha;
  const headOwner = pr.head?.repo?.owner?.login || owner;
  const headRepo = pr.head?.repo?.name || repo;

  // Deduplicate: skip if we're already processing this exact PR + SHA
  const dedupeKey = buildDedupeKey(owner, repo, prNumber, headSha);
  if (processingPRs.has(dedupeKey)) {
    console.log(`[GitHub] Skipping duplicate PR #${prNumber} on ${owner}/${repo} (sha: ${headSha})`);
    return;
  }
  processingPRs.add(dedupeKey);

  console.log(`[GitHub] Analyzing PR #${prNumber} on ${owner}/${repo}`);

  try {
    const octokit = await createInstallationOctokit(installationId);

    // 0. Find existing bot comment for upsert (prevents duplicate comments across instances)
    const { data: existingComments } = await octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number: prNumber,
      per_page: 100,
    });
    const existingBotComment = existingComments.find(
      (c: any) => c.user?.type === 'Bot' && c.body?.includes('CodeSage Analysis'),
    );
    // If bot already commented on this EXACT SHA, skip entirely
    if (existingBotComment?.body?.includes(headSha.slice(0, 7))) {
      console.log(`[GitHub] Bot already commented on PR #${prNumber} for sha ${headSha}, skipping`);
      return;
    }

    // 1. Create a pending check run
    const { data: checkRun } = await octokit.rest.checks.create({
      owner,
      repo,
      name: 'CodeSage Analysis',
      head_sha: headSha,
      status: 'in_progress',
      started_at: new Date().toISOString(),
    });

    // 2. Get PR changed files
    const { data: files } = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber,
      per_page: 100,
    });

    // 3. Filter to analyzable code files
    const codeFiles = files
      .filter((f: any) => f.status !== 'removed' && !shouldSkipFile(f.filename))
      .slice(0, MAX_FILES_PER_PR);

    if (codeFiles.length === 0) {
      // No code files — mark check as passed
      await octokit.rest.checks.update({
        owner,
        repo,
        check_run_id: checkRun.id,
        status: 'completed',
        conclusion: 'success',
        completed_at: new Date().toISOString(),
        output: {
          title: 'CodeSage — No code files to analyze',
          summary: 'All changed files were non-code files (configs, assets, etc.).',
        },
      });
      return;
    }

    // 4. Fetch file contents and analyze in parallel (batches of 5)
    const results: Array<{
      file: string;
      score: number;
      scoreBreakdown: ScoreBreakdown | null;
      issues: FileIssue[];
      cyclomaticComplexity: number | null;
      cognitiveComplexity: number | null;
    }> = [];

    const BATCH_SIZE = 5;
    for (let i = 0; i < codeFiles.length; i += BATCH_SIZE) {
      const batch = codeFiles.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.allSettled(
        batch.map(async (file: any) => {
          try {
            const { data: contentData } = await octokit.rest.repos.getContent({
              owner: headOwner,
              repo: headRepo,
              path: file.filename,
              ref: headSha,
            });

            // getContent returns base64 encoded for files
            const content = 'content' in contentData
              ? Buffer.from(contentData.content as string, 'base64').toString('utf-8')
              : '';

            if (!content || content.length > 50000) {
              return null; // Skip empty or very large files
            }

            const result = await analyzeFile(file.filename, content);
            return { file: file.filename, ...result };
          } catch (err) {
            console.error(`[GitHub] Failed to analyze ${file.filename}:`, err);
            return null;
          }
        }),
      );

      for (const r of batchResults) {
        if (r.status === 'fulfilled' && r.value) {
          results.push(r.value);
        }
      }
    }

    // 5. Calculate overall score
    const overallScore = results.length > 0
      ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length)
      : 100;

    const passed = overallScore >= SCORE_THRESHOLD;

    // 6. Post or update PR comment (upsert to prevent duplicates)
    const commentBody = buildPRComment(results, overallScore, passed, headSha);
    if (existingBotComment) {
      // Update existing comment instead of creating a new one
      await octokit.rest.issues.updateComment({
        owner,
        repo,
        comment_id: existingBotComment.id,
        body: commentBody,
      });
      console.log(`[GitHub] Updated existing comment on PR #${prNumber}`);
    } else {
      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body: commentBody,
      });
    }

    // 7. Update check run
    const totalIssues = results.flatMap((r) => r.issues).length;
    await octokit.rest.checks.update({
      owner,
      repo,
      check_run_id: checkRun.id,
      status: 'completed',
      conclusion: passed ? 'success' : 'failure',
      completed_at: new Date().toISOString(),
      output: {
        title: `CodeSage — Score: ${overallScore}/100 ${passed ? '✅' : '❌'}`,
        summary: `Analyzed ${results.length} files. Found ${totalIssues} issue(s). ${passed ? 'Quality check passed.' : `Score below threshold (${SCORE_THRESHOLD}).`}`,
      },
    });

    console.log(`[GitHub] PR #${prNumber} analysis complete. Score: ${overallScore}/100`);
  } catch (err) {
    console.error(`[GitHub] PR analysis failed for #${prNumber}:`, err);
  }
}

// ---------- Route ----------

export const githubWebhookRoute: FastifyPluginAsync = async (app) => {
  // Disable automatic JSON parsing for this route so we can verify the signature
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
    done(null, body);
  });

  app.post('/', async (req, reply) => {
    const rawBody = req.body as string;
    const signature = req.headers['x-hub-signature-256'] as string | undefined;
    const event = req.headers['x-github-event'] as string | undefined;

    // Verify webhook signature
    if (!verifyWebhookSignature(rawBody, signature)) {
      return reply.status(401).send({ error: 'Invalid webhook signature' });
    }

    const payload = JSON.parse(rawBody);

    switch (event) {
      case 'installation': {
        if (payload.action === 'created') {
          await db.insert(githubInstallations).values({
            installationId: payload.installation.id,
            accountLogin: payload.installation.account.login,
            accountType: payload.installation.account.type,
            repositorySelection: payload.installation.repository_selection,
          }).onConflictDoUpdate({
            target: githubInstallations.installationId,
            set: {
              accountLogin: payload.installation.account.login,
              repositorySelection: payload.installation.repository_selection,
              updatedAt: new Date(),
            },
          });
          console.log(`[GitHub] Installation created: ${payload.installation.account.login}`);
        } else if (payload.action === 'deleted') {
          await db.delete(githubInstallations)
            .where(eq(githubInstallations.installationId, payload.installation.id));
          console.log(`[GitHub] Installation deleted: ${payload.installation.account.login}`);
        }
        break;
      }

      case 'pull_request': {
        // Run PR analysis in background (don't block the webhook response)
        handlePullRequest(payload).catch((err) => {
          console.error('[GitHub] Background PR analysis error:', err);
        });
        break;
      }

      default:
        break;
    }

    return reply.status(200).send({ received: true });
  });
};
