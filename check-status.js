const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const lead = await prisma.lead.findUnique({
    where: { id: '6db9762c-65dd-496d-a570-1513a80e14d5' },
    select: { status: true, updatedAt: true }
  });
  console.log(JSON.stringify(lead, null, 2));
  await prisma.$disconnect();
}

check().catch(console.error);
