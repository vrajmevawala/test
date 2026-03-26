import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export async function getHistory(conversationId: string) {
  try {
    const history = await redis.lrange(`conv:${conversationId}`, 0, 19);
    return history.map((h: string) => JSON.parse(h));
  } catch (e) {
    console.warn('Redis History Fetch Failed:', e);
    return [];
  }
}

export async function saveHistory(conversationId: string, userMsg: string, aiMsg: string) {
  try {
    const pipeline = redis.pipeline();
    pipeline.rpush(`conv:${conversationId}`, JSON.stringify({ role: 'user', content: userMsg }));
    pipeline.rpush(`conv:${conversationId}`, JSON.stringify({ role: 'assistant', content: aiMsg }));
    pipeline.expire(`conv:${conversationId}`, 60 * 60 * 24 * 7); // 7 days
    await pipeline.exec();
  } catch (e) {
    console.warn('Redis History Save Failed:', e);
  }
}
