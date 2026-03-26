import type { FastifyPluginAsync } from 'fastify';
import { sql } from 'drizzle-orm';
import { db } from '@codeopt/db';

export const healthRoute: FastifyPluginAsync = async (app) => {
  app.get('/health', async (_req, reply) => {
    try {
      await db.execute(sql`select 1`);
      return reply.status(200).send({ status: 'ok', database: 'up' });
    } catch {
      return reply.status(503).send({ status: 'degraded', database: 'down' });
    }
  });
};
