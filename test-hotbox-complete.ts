import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { MessageService } from './src/modules/email-relay/services/message.service';
import { ImapPollerService } from './src/modules/email-relay/services/imap-poller.service';

async function testHotboxComplete() {
  console.log('🔥 Testing Hotbox & IMAP Polling Functionality...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const messageService = app.get(MessageService);
  const imapPoller = app.get(ImapPollerService);

  const workspaceId = '8592d2ed-1d31-46d7-9c65-99aecd0de8d4';

  try {
    // Test 1: Trigger IMAP Polling
    console.log('1️⃣ Triggering IMAP polling...');
    await imapPoller.pollInbox();
    console.log('✅ IMAP polling completed\n');

    // Test 2: Get Hotbox Needs Reply
    console.log('2️⃣ Fetching conversations needing reply...');
    const needsReply = await messageService.getConversationsNeedingReply(
      workspaceId,
      10,
      0
    );
    console.log(`   Found ${needsReply.total} conversations needing reply:`);
    needsReply.data.forEach((conv, idx) => {
      console.log(`   ${idx + 1}. Lead: ${conv.lead.name || conv.lead.email}`);
      console.log(`      Messages: ${conv.messageCount}`);
      console.log(`      Latest: ${conv.latestMessage.preview}`);
      console.log(`      Direction: ${conv.latestMessage.direction}`);
    });
    console.log();

    // Test 3: Get Hotbox Sent Only
    console.log('3️⃣ Fetching sent-only conversations...');
    const sentOnly = await messageService.getConversationsSentOnly(
      workspaceId,
      10,
      0
    );
    console.log(`   Found ${sentOnly.total} sent-only conversations:`);
    sentOnly.data.forEach((conv, idx) => {
      console.log(`   ${idx + 1}. Lead: ${conv.lead.name || conv.lead.email}`);
      console.log(`      Messages: ${conv.messageCount}`);
      console.log(`      Latest: ${conv.latestMessage.preview}`);
    });
    console.log();

    // Test 4: Check messages in database
    console.log('4️⃣ Checking total messages in database...');
    const allMessages = await messageService['prisma'].message.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    console.log(`   Total recent messages: ${allMessages.length}`);
    allMessages.forEach((msg, idx) => {
      console.log(`   ${idx + 1}. ${msg.direction} - From: ${msg.fromEmail} To: ${msg.toEmail}`);
      console.log(`      Subject: ${msg.subject || '(no subject)'}`);
      console.log(`      Preview: ${msg.textBody?.substring(0, 50) || '(no body)'}...`);
    });

    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await app.close();
  }
}

testHotboxComplete();
