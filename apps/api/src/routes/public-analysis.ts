import type { FastifyPluginAsync } from 'fastify';
import Groq from 'groq-sdk';
import { z } from 'zod';
import { 
  buildAnalysisSystemPrompt, 
  buildAnalysisUserPrompt, 
  getTreeSitterAnalysis,
  buildASTContext
} from '@codeopt/utils';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY ?? '',
});

const AnalysisSchema = z.object({
  code: z.string().min(1).max(50000),
  language: z.string().default('python'),
});

const REPORT_ISSUE_TOOL = {
  type: 'function' as const,
  function: {
    name: 'report_issue',
    description: 'Structured issue output for code analysis',
    parameters: {
      type: 'object',
      properties: {
        line: { type: 'number' },
        col: { type: 'number' },
        severity: { type: 'string', enum: ['error', 'warning', 'info'] },
        category: {
          type: 'string',
          enum: ['security', 'performance', 'complexity', 'style', 'best-practice', 'bug'],
        },
        rule: { type: 'string' },
        message: { type: 'string' },
        suggestion: { type: 'string' },
        codeSnippet: { type: 'string' },
        fixable: { type: 'boolean' },
      },
      required: ['line', 'severity', 'category', 'rule', 'message'],
    },
  },
};

export const publicAnalysisRoute: FastifyPluginAsync = async (app) => {
  app.post('/analyze-direct', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '1 hour',
      }
    }
  }, async (req, reply) => {
    const body = AnalysisSchema.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid input', details: body.error.format() });
    }

    const { code, language } = body.data;

    try {
      // 1. Run Structural AST Analysis
      const astMetrics = await getTreeSitterAnalysis(code, language);
      const astContext = astMetrics ? buildASTContext(astMetrics) : undefined;

      // 2. Call AI with Expert Prompts
      const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { 
            role: 'system', 
            content: buildAnalysisSystemPrompt(language) 
          },
          { 
            role: 'user', 
            content: buildAnalysisUserPrompt(language, code, astContext) 
          }
        ],
        tools: [REPORT_ISSUE_TOOL],
        tool_choice: 'auto',
      });

      const toolCalls = response.choices[0]?.message?.tool_calls || [];
      const issues = toolCalls
        .filter((tc) => tc.function.name === 'report_issue')
        .map((tc) => JSON.parse(tc.function.arguments));

      const lineCount = code.split('\n').length;
      const densityFactor = Math.max(1, lineCount / 100);
      const rawDeductions = (
        issues.filter((i: any) => i.severity === 'error').length * 12 +
        issues.filter((i: any) => i.severity === 'warning').length * 5 +
        issues.filter((i: any) => i.severity === 'info').length
      );

      const score = Math.max(0, Math.round(100 - (rawDeductions / densityFactor)));

      return reply.send({
        success: true,
        score,
        issues,
        cyclomaticComplexity: astMetrics?.cyclomaticComplexity || null,
        cognitiveComplexity: astMetrics?.cognitiveComplexity || null,
      });
    } catch (err) {
      console.error('[Public API] Analysis failed:', err);
      return reply.status(500).send({ error: 'AI analysis failed' });
    }
  });
};
