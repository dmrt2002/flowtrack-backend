const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkLeads() {
  try {
    const leads = await prisma.lead.findMany({
      where: {
        email: {
          in: ['tushar@gmail.com', 'pushkar@gmail.com']
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`\nFound ${leads.length} leads:\n`);

    for (const lead of leads) {
      console.log('='.repeat(80));
      console.log(`Email: ${lead.email}`);
      console.log(`Name: ${lead.name || 'N/A'}`);
      console.log(`Company: ${lead.companyName || 'N/A'}`);
      console.log(`Status: ${lead.status}`);
      console.log(`Created: ${lead.createdAt.toISOString()}`);
      console.log(`Last Email Sent: ${lead.lastEmailSentAt?.toISOString() || 'Never'}`);
      console.log(`Last Activity: ${lead.lastActivityAt?.toISOString() || 'Never'}`);
      console.log('');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLeads();
