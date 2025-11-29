"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bullmq_1 = require("bullmq");
const queue = new bullmq_1.Queue('workflow-execution', {
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
            await job.retry();
            console.log(`✅ Job retried successfully\n`);
        }
    }
    catch (error) {
        console.error('Error:', error);
    }
    finally {
        await queue.close();
    }
}
retryFailedJob();
//# sourceMappingURL=retry-failed-job.js.map