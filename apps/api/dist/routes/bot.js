import Groq from 'groq-sdk';
import { Redis } from '@upstash/redis';
import { db } from '@codeopt/db';
import { buildSystemPrompt } from '../bot/prompt.js';
import { verifyToken } from '@clerk/backend';
import { and, eq } from 'drizzle-orm';
import { teamMembers, users } from '@codeopt/db/schema';
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY ?? '',
});
const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL ?? '',
    token: process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
});
export const botRoute = async (app) => {
    app.post('/chat', async (req, reply) => {
        // ... (logic for token and user remains the same)
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return reply.status(401).send({ error: 'Unauthorized' });
        }
        let clerkUserId;
        try {
            const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY ?? '' });
            clerkUserId = payload.sub;
        }
        catch {
            return reply.status(401).send({ error: 'Invalid token' });
        }
        const { message, conversationId, context } = req.body;
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
        const workspaceId = context.workspaceId;
        if (workspaceId) {
            const [membership] = await db
                .select({ id: teamMembers.id })
                .from(teamMembers)
                .where(and(eq(teamMembers.workspaceId, workspaceId), eq(teamMembers.userId, user.id), eq(teamMembers.status, 'active')))
                .limit(1);
            if (!membership) {
                return reply.status(403).send({ error: 'Workspace access denied' });
            }
        }
        const historyKey = `conv:${conversationId}`;
        const rawHistory = await redis.lrange(historyKey, -40, -1);
        const history = rawHistory.map((r) => JSON.parse(r));
        const systemPrompt = buildSystemPrompt({ user, context });
        reply.raw.setHeader('Content-Type', 'text/event-stream');
        reply.raw.setHeader('Cache-Control', 'no-cache');
        reply.raw.setHeader('Connection', 'keep-alive');
        reply.raw.setHeader('X-Accel-Buffering', 'no');
        let fullReply = '';
        try {
            const chatCompletion = await groq.chat.completions.create({
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...history,
                    { role: 'user', content: message }
                ],
                model: 'llama-3.3-70b-versatile',
                temperature: 0.7,
                max_tokens: 1024,
                stream: true,
            });
            for await (const chunk of chatCompletion) {
                const token = chunk.choices[0]?.delta?.content || '';
                if (token) {
                    fullReply += token;
                    reply.raw.write(`data: ${JSON.stringify({ type: 'token', token })}\n\n`);
                }
            }
            await redis.rpush(historyKey, JSON.stringify({ role: 'user', content: message }), JSON.stringify({ role: 'assistant', content: fullReply }));
            await redis.expire(historyKey, 60 * 60 * 24 * 7);
            reply.raw.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
            reply.raw.end();
        }
        catch (e) {
            console.error("[Groq] Chat error:", e);
            reply.raw.write(`data: ${JSON.stringify({ type: 'error', message: 'AI service error' })}\n\n`);
            reply.raw.end();
        }
    });
};
//# sourceMappingURL=bot.js.map