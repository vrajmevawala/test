import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import { appRouter } from './trpc/router.js';
import { createContext } from './trpc/context.js';
import { botRoute } from './routes/bot.js';
import { webhookRoute } from './routes/webhook.js';
import { healthRoute } from './routes/health.js';
import { publicAnalysisRoute } from './routes/public-analysis.js';
export async function buildServer() {
    const app = Fastify({
        logger: {
            level: process.env.LOG_LEVEL ?? 'info',
            transport: process.env.NODE_ENV === 'development'
                ? { target: 'pino-pretty' }
                : undefined,
        },
        trustProxy: true,
    });
    await app.register(helmet, { contentSecurityPolicy: false });
    await app.register(cors, {
        origin: [
            process.env.WEB_URL ?? 'http://localhost:3000',
            'https://codeopt.dev',
            /^chrome-extension:\/\//, // Allow browser extension
        ],
        credentials: true,
    });
    await app.register(rateLimit, {
        global: true,
        max: 200,
        timeWindow: '1 minute',
        keyGenerator: (req) => (req.headers['x-user-id'] ?? req.ip),
        errorResponseBuilder: () => ({
            statusCode: 429,
            error: 'Too Many Requests',
            message: 'Rate limit exceeded. Slow down.',
        }),
    });
    await app.register(fastifyTRPCPlugin, {
        prefix: '/trpc',
        trpcOptions: {
            router: appRouter,
            createContext,
        },
    });
    await app.register(botRoute, { prefix: '/api/bot' });
    await app.register(webhookRoute, { prefix: '/api/webhooks' });
    await app.register(healthRoute, { prefix: '/api' });
    await app.register(publicAnalysisRoute, { prefix: '/api' });
    return app;
}
//# sourceMappingURL=server.js.map