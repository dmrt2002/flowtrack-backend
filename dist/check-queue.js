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
async function checkQueue() {
    try {
        const waiting = await queue.getWaiting();
        const active = await queue.getActive();
        const delayed = await queue.getDelayed();
        const failed = await queue.getFailed();
        const completed = await queue.getCompleted();
        console.log('\n📊 Queue Status:\n');
        console.log(`Waiting: ${waiting.length}`);
        console.log(`Active: ${active.length}`);
        console.log(`Delayed: ${delayed.length}`);
        console.log(`Failed: ${failed.length}`);
        console.log(`Completed: ${completed.length}`);
        if (waiting.length > 0) {
            console.log('\n⏳ Waiting Jobs:');
            for (const job of waiting) {
                console.log(`  - ${job.name} (ID: ${job.id})`);
                console.log(`    Data: ${JSON.stringify(job.data)}`);
            }
        }
        if (active.length > 0) {
            console.log('\n🔄 Active Jobs:');
            for (const job of active) {
                console.log(`  - ${job.name} (ID: ${job.id})`);
                console.log(`    Data: ${JSON.stringify(job.data)}`);
            }
        }
        if (delayed.length > 0) {
            console.log('\n⏰ Delayed Jobs:');
            for (const job of delayed) {
                const delayUntil = new Date(job.timestamp + (job.opts.delay || 0));
                console.log(`  - ${job.name} (ID: ${job.id})`);
                console.log(`    Data: ${JSON.stringify(job.data)}`);
                console.log(`    Will run at: ${delayUntil.toISOString()}`);
            }
        }
        if (failed.length > 0) {
            console.log('\n❌ Failed Jobs (last 5):');
            for (const job of failed.slice(0, 5)) {
                console.log(`  - ${job.name} (ID: ${job.id})`);
                console.log(`    Data: ${JSON.stringify(job.data)}`);
                console.log(`    Error: ${job.failedReason}`);
            }
        }
    }
    catch (error) {
        console.error('Error:', error);
    }
    finally {
        await queue.close();
    }
}
checkQueue();
//# sourceMappingURL=check-queue.js.map