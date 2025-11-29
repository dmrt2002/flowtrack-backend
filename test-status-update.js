const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const leadId = '6db9762c-65dd-496d-a570-1513a80e14d5';
  
  console.log('Before update:');
  const before = await prisma.lead.findUnique({ where: { id: leadId }, select: { status: true } });
  console.log('Status:', before.status);
  
  console.log('\nUpdating to EMAIL_SENT...');
  const updated = await prisma.lead.update({
    where: { id: leadId },
    data: { status: 'EMAIL_SENT', lastActivityAt: new Date() }
  });
  console.log('Updated status:', updated.status);
  
  console.log('\nFetching again...');
  const after = await prisma.lead.findUnique({ where: { id: leadId }, select: { status: true } });
  console.log('Status:', after.status);
  
  await prisma.$disconnect();
}

test().catch(console.error);
