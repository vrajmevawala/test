import { analysisWorker } from './analysis-worker.js';

analysisWorker.on('ready', () => {
  console.log('Analysis worker ready');
});

analysisWorker.on('failed', (job, err) => {
  console.error('Analysis worker failed', {
    jobId: job?.id,
    error: String(err),
  });
});

process.on('SIGINT', async () => {
  await analysisWorker.close();
  process.exit(0);
});
