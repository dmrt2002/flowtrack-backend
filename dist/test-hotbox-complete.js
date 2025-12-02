"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./src/app.module");
const message_service_1 = require("./src/modules/email-relay/services/message.service");
const imap_poller_service_1 = require("./src/modules/email-relay/services/imap-poller.service");
async function testHotboxComplete() {
    console.log('🔥 Testing Hotbox & IMAP Polling Functionality...\n');
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const messageService = app.get(message_service_1.MessageService);
    const imapPoller = app.get(imap_poller_service_1.ImapPollerService);
    const workspaceId = '8592d2ed-1d31-46d7-9c65-99aecd0de8d4';
    try {
        console.log('1️⃣ Triggering IMAP polling...');
        await imapPoller.pollInbox();
        console.log('✅ IMAP polling completed\n');
        console.log('2️⃣ Fetching conversations needing reply...');
        const needsReply = await messageService.getConversationsNeedingReply(workspaceId, 10, 0);
        console.log(`   Found ${needsReply.total} conversations needing reply:`);
        needsReply.data.forEach((conv, idx) => {
            console.log(`   ${idx + 1}. Lead: ${conv.lead.name || conv.lead.email}`);
            console.log(`      Messages: ${conv.messageCount}`);
            console.log(`      Latest: ${conv.latestMessage.preview}`);
            console.log(`      Direction: ${conv.latestMessage.direction}`);
        });
        console.log();
        console.log('3️⃣ Fetching sent-only conversations...');
        const sentOnly = await messageService.getConversationsSentOnly(workspaceId, 10, 0);
        console.log(`   Found ${sentOnly.total} sent-only conversations:`);
        sentOnly.data.forEach((conv, idx) => {
            console.log(`   ${idx + 1}. Lead: ${conv.lead.name || conv.lead.email}`);
            console.log(`      Messages: ${conv.messageCount}`);
            console.log(`      Latest: ${conv.latestMessage.preview}`);
        });
        console.log();
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
    }
    catch (error) {
        console.error('❌ Test failed:', error);
    }
    finally {
        await app.close();
    }
}
testHotboxComplete();
//# sourceMappingURL=test-hotbox-complete.js.map