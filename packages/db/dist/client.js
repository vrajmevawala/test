import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema/index.js';
if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to initialize database client.');
}
const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, {
    schema,
    logger: process.env.NODE_ENV === 'development',
});
//# sourceMappingURL=client.js.map