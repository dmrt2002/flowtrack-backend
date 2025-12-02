"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./src/app.module");
const email_poll_queue_service_1 = require("./src/modules/email-relay/services/email-poll-queue.service");
const imap_poller_service_1 = require("./src/modules/email-relay/services/imap-poller.service");
async function bootstrap() {
    console.log('🚀 Starting Gmail Relay Test...\n');
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    try {
        const emailPollQueue = app.get(email_poll_queue_service_1.EmailPollQueueService);
        const imapPoller = app.get(imap_poller_service_1.ImapPollerService);
        console.log('1️⃣ Triggering manual IMAP polling (checking inbox NOW)...\n');
        await imapPoller.pollInbox();
        console.log('\n✅ Polling complete!');
        console.log('\n2️⃣ Check the logs above to see if any messages were found.');
        console.log('   - If "No new messages found" → Inbox is empty or all messages are read');
        console.log('   - If messages were processed → Check database for new INBOUND messages\n');
        const stats = await emailPollQueue.getQueueStats();
        console.log('📊 Queue Statistics:');
        console.log('   - Waiting:', stats.waiting);
        console.log('   - Active:', stats.active);
        console.log('   - Completed:', stats.completed);
        console.log('   - Failed:', stats.failed);
        console.log('   - Delayed:', stats.delayed);
    }
    catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.stack) {
            console.error('\nStack trace:', error.stack);
        }
    }
    finally {
        await app.close();
    }
}
bootstrap();
//# sourceMappingURL=test-relay-now.js.map