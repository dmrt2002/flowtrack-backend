import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { EmailPollQueueService } from './src/modules/email-relay/services/email-poll-queue.service';
import { ImapPollerService } from './src/modules/email-relay/services/imap-poller.service';

async function bootstrap() {
  console.log('🚀 Starting Gmail Relay Test...\n');

  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    // Get services
    const emailPollQueue = app.get(EmailPollQueueService);
    const imapPoller = app.get(ImapPollerService);

    console.log('1️⃣ Triggering manual IMAP polling (checking inbox NOW)...\n');

    // Poll inbox immediately
    await imapPoller.pollInbox();

    console.log('\n✅ Polling complete!');
    console.log('\n2️⃣ Check the logs above to see if any messages were found.');
    console.log('   - If "No new messages found" → Inbox is empty or all messages are read');
    console.log('   - If messages were processed → Check database for new INBOUND messages\n');

    // Get queue stats
    const stats = await emailPollQueue.getQueueStats();
    console.log('📊 Queue Statistics:');
    console.log('   - Waiting:', stats.waiting);
    console.log('   - Active:', stats.active);
    console.log('   - Completed:', stats.completed);
    console.log('   - Failed:', stats.failed);
    console.log('   - Delayed:', stats.delayed);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
  } finally {
    await app.close();
  }
}

bootstrap();
