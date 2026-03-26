import type { FastifyPluginAsync } from 'fastify';
import Anthropic from '@anthropic-ai/sdk';
import { Redis } from '@upstash/redis';
import { db } from '@codeopt/db';
import { buildSystemPrompt } from '../bot/prompt.js';
import { BOT_TOOLS, executeTool } from '../bot/tools.js';
import { verifyToken } from '@clerk/backend';
import { and, eq } from 'drizzle-orm';
import { teamMembers, users } from '@codeopt/db/schema';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? '',
});

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL ?? '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
});

export const botRoute: FastifyPluginAsync = async (app) => {
  app.post('/chat', async (req, reply) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    let clerkUserId: string;
    try {
      const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY ?? '' });
      clerkUserId = payload.sub;
    } catch {
      return reply.status(401).send({ error: 'Invalid token' });
    }

    const { message, conversationId, context } = req.body as {
      message: string;
      conversationId: string;
      context: Record<string, unknown>;
    };

    if (!message?.trim()) {
      return reply.status(400).send({ error: 'Message required' });
    }

    const [user] = await db
      .select({ id: users.id, name: users.name, plan: users.plan })
      .from(users)
      .where(eq(users.clerkId, clerkUserId))
      .limit(1);

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    const workspaceId = context.workspaceId as string | undefined;
    if (workspaceId) {
      const [membership] = await db
        .select({ id: teamMembers.id })
        .from(teamMembers)
        .where(
          and(
            eq(teamMembers.workspaceId, workspaceId),
            eq(teamMembers.userId, user.id),
            eq(teamMembers.status, 'active'),
          ),
        )
        .limit(1);

      if (!membership) {
        return reply.status(403).send({ error: 'Workspace access denied' });
      }
    }

    const historyKey = `conv:${conversationId}`;
    const rawHistory = await redis.lrange(historyKey, -40, -1);
    const history = rawHistory.map((r) => JSON.parse(r as string));
    const systemPrompt = buildSystemPrompt({ user, context });

    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('X-Accel-Buffering', 'no');

    let fullReply = '';
    try {
      const stream = anthropic.messages.stream({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [...history, { role: 'user', content: message }] as never,
        tools: BOT_TOOLS as any,
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          const token = event.delta.text;
          fullReply += token;
          reply.raw.write(`data: ${JSON.stringify({ type: 'token', token })}\n\n`);
        }

        if (event.type === 'content_block_start' && event.content_block.type === 'tool_use') {
          reply.raw.write(
            `data: ${JSON.stringify({ type: 'tool_start', name: event.content_block.name })}\n\n`,
          );
        }

        if (event.type === 'message_delta' && event.delta.stop_reason === 'tool_use') {
          const currentMessage = stream.currentMessage;
          if (!currentMessage) {
            continue;
          }

          const toolUses = currentMessage.content.filter((b) => b.type === 'tool_use');
          const toolResults = await Promise.all(
            toolUses.map(async (toolUse: any) => {
              const result = await executeTool(toolUse.name, toolUse.input, {
                userId: user.id,
                workspaceId: workspaceId ?? '',
                db,
              });

              reply.raw.write(
                `data: ${JSON.stringify({ type: 'tool_result', name: toolUse.name, result })}\n\n`,
              );

              return {
                type: 'tool_result' as const,
                tool_use_id: toolUse.id,
                content: JSON.stringify(result),
              };
            }),
          );

          const continuation = anthropic.messages.stream({
            model: 'claude-sonnet-4-6',
            max_tokens: 1024,
            system: systemPrompt,
            messages: [
              ...history,
              { role: 'user', content: message },
              { role: 'assistant', content: currentMessage.content as never },
              { role: 'user', content: toolResults as never },
            ] as never,
          });

          for await (const e2 of continuation) {
            if (e2.type === 'content_block_delta' && e2.delta.type === 'text_delta') {
              fullReply += e2.delta.text;
              reply.raw.write(`data: ${JSON.stringify({ type: 'token', token: e2.delta.text })}\n\n`);
            }
          }
        }
      }

      await redis.rpush(
        historyKey,
        JSON.stringify({ role: 'user', content: message }),
        JSON.stringify({ role: 'assistant', content: fullReply }),
      );
      await redis.expire(historyKey, 60 * 60 * 24 * 7);

      reply.raw.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      reply.raw.end();
    } catch {
      reply.raw.write(`data: ${JSON.stringify({ type: 'error', message: 'AI service error' })}\n\n`);
      reply.raw.end();
    }
  });
};
