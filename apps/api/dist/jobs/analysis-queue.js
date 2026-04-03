import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
let analysisQueue = null;
function getAnalysisQueue() {
    if (analysisQueue) {
        return analysisQueue;
    }
    const redisUrl = process.env.UPSTASH_REDIS_URL;
    if (!redisUrl) {
        throw new Error('UPSTASH_REDIS_URL is required for BullMQ.');
    }
    const connection = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
    });
    analysisQueue = new Queue('analysis', { connection });
    return analysisQueue;
}
export async function enqueueAnalysis(payload) {
    const queue = getAnalysisQueue();
    await queue.add('analyze', payload, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 50,
    });
}
//# sourceMappingURL=analysis-queue.js.map