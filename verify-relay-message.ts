import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const leadId = '79e4dd64-7157-4fd7-ad56-1badca42a095';

  console.log('🔍 Checking messages for Lead ID:', leadId);
  console.log('');

  const messages = await prisma.message.findMany({
    where: { leadId },
    orderBy: { sentAt: 'desc' },
    take: 5,
  });

  if (messages.length === 0) {
    console.log('❌ No messages found for this lead');
  } else {
    console.log(`✅ Found ${messages.length} message(s):\n`);

    messages.forEach((msg, idx) => {
      console.log(`Message ${idx + 1}:`);
      console.log('  Direction:', msg.direction);
      console.log('  From:', msg.fromEmail);
      console.log('  To:', msg.toEmail);
      console.log('  Subject:', msg.subject);
      console.log('  Message ID:', msg.messageId);
      console.log('  Sent At:', msg.sentAt);
      console.log('  Preview:', msg.textBody.substring(0, 100) + '...');
      console.log('');
    });
  }

  await prisma.$disconnect();
}

main();
