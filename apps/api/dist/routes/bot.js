import Groq from 'groq-sdk';
import { Redis } from '@upstash/redis';
import { db } from '@codeopt/db';
import { buildSystemPrompt } from '../bot/prompt.js';
import { verifyToken } from '@clerk/backend';
import { and, eq } from 'drizzle-orm';
import { analyses, issues, teamMembers, users } from '@codeopt/db/schema';
import { PassThrough } from 'node:stream';
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY ?? '',
});
const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL ?? '',
    token: process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
});
export const botRoute = async (app) => {
    app.get('/history/:conversationId', async (req, reply) => {
        const { conversationId } = req.params;
        const historyKey = `conv:${conversationId}`;
        const rawHistory = await redis.lrange(historyKey, 0, -1);
        return rawHistory.map((r) => {
            if (typeof r === 'string') {
                try {
                    return JSON.parse(r);
                }
                catch {
                    return null;
                }
            }
            return r;
        }).filter(Boolean);
    });
    app.post('/chat', async (req, reply) => {
        const authHeader = req.headers.authorization;
        const token = authHeader?.replace('Bearer ', '');
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
        // Fetch context from DB if analysisId is present
        const analysisId = context.analysisId;
        if (analysisId) {
            const [analysisRecord] = await db
                .select()
                .from(analyses)
                .where(eq(analyses.id, analysisId))
                .limit(1);
            if (analysisRecord) {
                const analysisIssues = await db
                    .select()
                    .from(issues)
                    .where(eq(issues.analysisId, analysisId));
                context.code = analysisRecord.metadata?.sourceCode || '';
                context.issues = analysisIssues.map(i => ({
                    line: i.line,
                    severity: i.severity,
                    message: i.message,
                    category: i.category,
                }));
                context.score = analysisRecord.score;
            }
        }
        const historyKey = `conv:${conversationId}`;
        const rawHistory = await redis.lrange(historyKey, -40, -1);
        const history = rawHistory.map((r) => {
            if (typeof r === 'string') {
                try {
                    return JSON.parse(r);
                }
                catch {
                    return null;
                }
            }
            return r;
        }).filter(Boolean);
        const systemPrompt = buildSystemPrompt({ user, context });
        // Create a PassThrough stream for SSE
        const stream = new PassThrough();
        // Set headers and send the stream via Fastify's native reply.send
        // This allows Fastify's CORS middleware to attach headers correctly
        reply
            .type('text/event-stream')
            .header('Cache-Control', 'no-cache')
            .header('Connection', 'keep-alive')
            .header('X-Accel-Buffering', 'no')
            .send(stream);
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
                    stream.write(`data: ${JSON.stringify({ type: 'token', token })}\n\n`);
                }
            }
            // Store history in the background
            await redis.rpush(historyKey, { role: 'user', content: message }, { role: 'assistant', content: fullReply });
            await redis.expire(historyKey, 60 * 60 * 24 * 7);
            stream.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
            stream.end();
        }
        catch (e) {
            console.error("[Groq] Chat error:", e);
            const errorMessage = e instanceof Error ? e.message : String(e);
            stream.write(`data: ${JSON.stringify({ type: 'error', message: errorMessage })}\n\n`);
            stream.end();
        }
    });
};
//# sourceMappingURL=bot.js.map