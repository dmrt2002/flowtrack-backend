import { Queue } from 'bullmq';

const queue = new Queue('workflow-execution', {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
});

async function retryFailedJob() {
  try {
    const failed = await queue.getFailed();

    console.log(`Found ${failed.length} failed jobs\n`);

    for (const job of failed) {
      console.log(`Retrying job: ${job.name} (ID: ${job.id})`);
      console.log(`Data: ${JSON.stringify(job.data)}`);
      console.log(`Original error: ${job.failedReason}\n`);

      // Retry the job
      await job.retry();

      console.log(`✅ Job retried successfully\n`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await queue.close();
  }
}

retryFailedJob();
