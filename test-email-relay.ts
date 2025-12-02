import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Email Relay Test ===\n');

  // 1. Check workflow configuration
  console.log('1. Checking workflow configuration...');
  const workflow = await prisma.workflow.findUnique({
    where: { id: 'db63deec-e144-4aa7-924d-26cf238625ae' },
    select: {
      id: true,
      name: true,
      configurationData: true,
      updatedAt: true,
    },
  });

  if (workflow) {
    console.log('✅ Workflow found:', workflow.name);
    console.log('📝 Configuration:');
    const config = workflow.configurationData as any;
    console.log('  - Welcome Subject:', config.welcomeSubject);
    console.log('  - Follow-up Subject:', config.followUpSubject);
    console.log('  - Thank You Subject:', config.thankYouSubject);
    console.log('  - Last Updated:', workflow.updatedAt);
  } else {
    console.log('❌ Workflow not found');
  }

  console.log('\n2. Checking messages table...');
  const messageCount = await prisma.message.count();
  console.log(`📊 Total messages: ${messageCount}`);

  const recentMessages = await prisma.message.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      direction: true,
      fromEmail: true,
      toEmail: true,
      subject: true,
      createdAt: true,
      lead: {
        select: {
          email: true,
          status: true,
        },
      },
    },
  });

  if (recentMessages.length > 0) {
    console.log('\n📨 Recent messages:');
    recentMessages.forEach((msg, i) => {
      console.log(`\n  ${i + 1}. ${msg.direction} message`);
      console.log(`     From: ${msg.fromEmail}`);
      console.log(`     To: ${msg.toEmail}`);
      console.log(`     Subject: ${msg.subject}`);
      console.log(`     Lead Status: ${msg.lead.status}`);
      console.log(`     Created: ${msg.createdAt}`);
    });
  } else {
    console.log('  No messages found yet');
  }

  console.log('\n3. Checking for INBOUND messages (replies)...');
  const inboundCount = await prisma.message.count({
    where: { direction: 'INBOUND' },
  });
  console.log(`📥 Inbound messages: ${inboundCount}`);

  if (inboundCount > 0) {
    const latestInbound = await prisma.message.findFirst({
      where: { direction: 'INBOUND' },
      orderBy: { receivedAt: 'desc' },
      select: {
        fromEmail: true,
        subject: true,
        receivedAt: true,
        lead: {
          select: {
            email: true,
            status: true,
          },
        },
      },
    });

    if (latestInbound) {
      console.log('\n📬 Latest inbound message:');
      console.log(`  From: ${latestInbound.fromEmail}`);
      console.log(`  Subject: ${latestInbound.subject}`);
      console.log(`  Received: ${latestInbound.receivedAt}`);
      console.log(`  Lead updated to: ${latestInbound.lead.status}`);
    }
  }

  console.log('\n4. Email polling configuration:');
  console.log(`  GMAIL_RELAY_EMAIL: ${process.env.GMAIL_RELAY_EMAIL || 'NOT SET'}`);
  console.log(`  GMAIL_RELAY_PASSWORD: ${process.env.GMAIL_RELAY_PASSWORD ? '***SET***' : 'NOT SET'}`);
  console.log(`  Polling interval: ${process.env.EMAIL_POLL_INTERVAL_MINUTES || 5} minutes`);

  console.log('\n✅ Test complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
