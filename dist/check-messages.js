"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function checkMessages() {
    const workspaceId = '8592d2ed-1d31-46d7-9c65-99aecd0de8d4';
    console.log('📊 Checking Messages in Database...\n');
    const inboundCount = await prisma.message.count({
        where: { workspaceId, direction: 'INBOUND' },
    });
    const outboundCount = await prisma.message.count({
        where: { workspaceId, direction: 'OUTBOUND' },
    });
    console.log(`✉️  INBOUND messages: ${inboundCount}`);
    console.log(`📤 OUTBOUND messages: ${outboundCount}\n`);
    if (inboundCount > 0) {
        console.log('✅ SUCCESS! IMAP polling is working - found INBOUND messages');
        const recentInbound = await prisma.message.findMany({
            where: { workspaceId, direction: 'INBOUND' },
            orderBy: { createdAt: 'desc' },
            take: 3,
            include: { lead: true },
        });
        console.log('\nRecent INBOUND messages:');
        recentInbound.forEach((msg, idx) => {
            console.log(`${idx + 1}. From: ${msg.fromEmail}`);
            console.log(`   To: ${msg.toEmail}`);
            console.log(`   Lead: ${msg.lead.name || msg.lead.email}`);
            console.log(`   Subject: ${msg.subject || '(no subject)'}`);
            console.log(`   Preview: ${msg.textBody?.substring(0, 60)}...`);
            console.log();
        });
    }
    else {
        console.log('⚠️  No INBOUND messages found yet');
        console.log('   The reply you sent should appear here after IMAP polling');
    }
    await prisma.$disconnect();
}
checkMessages();
//# sourceMappingURL=check-messages.js.map