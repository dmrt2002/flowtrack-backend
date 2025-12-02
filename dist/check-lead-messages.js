"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const leadEmail = 'dmrtushar@gmail.com';
    console.log(`🔍 Checking messages for lead: ${leadEmail}\n`);
    const lead = await prisma.lead.findFirst({
        where: { email: leadEmail },
    });
    if (!lead) {
        console.log('❌ Lead not found');
        return;
    }
    console.log('✅ Lead found:');
    console.log('   ID:', lead.id);
    console.log('   Name:', lead.name);
    console.log('   Email:', lead.email);
    console.log('   Status:', lead.status);
    console.log('');
    const messages = await prisma.message.findMany({
        where: { leadId: lead.id },
        orderBy: { sentAt: 'desc' },
    });
    console.log(`📧 Messages: ${messages.length}\n`);
    if (messages.length === 0) {
        console.log('⚠️  No relay messages found for this lead');
        console.log('   The email was likely sent BEFORE the Gmail Relay integration');
        console.log('   or the workflow execution is still paused/running\n');
    }
    else {
        messages.forEach((msg, idx) => {
            console.log(`Message ${idx + 1}:`);
            console.log('  Direction:', msg.direction);
            console.log('  From:', msg.fromEmail);
            console.log('  To:', msg.toEmail);
            console.log('  Subject:', msg.subject);
            console.log('  Message ID:', msg.messageId);
            console.log('  Sent At:', msg.sentAt);
            console.log('  Preview:', msg.textBody.substring(0, 100));
            console.log('');
        });
    }
    await prisma.$disconnect();
}
main();
//# sourceMappingURL=check-lead-messages.js.map