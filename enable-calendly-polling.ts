import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function enableCalendlyPolling() {
  console.log('🔄 Enabling polling for all Calendly accounts...\n');

  try {
    // Get all Calendly credentials
    const credentials = await prisma.oAuthCredential.findMany({
      where: {
        providerType: 'CALENDLY',
        isActive: true,
      },
      select: {
        id: true,
        providerEmail: true,
        pollingEnabled: true,
        providerPlan: true,
      },
    });

    console.log(`Found ${credentials.length} Calendly credential(s):\n`);
    credentials.forEach((cred, idx) => {
      console.log(`${idx + 1}. ${cred.providerEmail}`);
      console.log(`   - Plan: ${cred.providerPlan || 'Not set'}`);
      console.log(`   - Polling Currently: ${cred.pollingEnabled ? 'ENABLED ✅' : 'DISABLED ❌'}`);
      console.log('');
    });

    // Enable polling for all
    const result = await prisma.oAuthCredential.updateMany({
      where: {
        providerType: 'CALENDLY',
        isActive: true,
      },
      data: {
        pollingEnabled: true,
      },
    });

    console.log(`✅ Successfully enabled polling for ${result.count} Calendly account(s)\n`);

    // Verify the update
    const updated = await prisma.oAuthCredential.findMany({
      where: {
        providerType: 'CALENDLY',
        isActive: true,
      },
      select: {
        id: true,
        providerEmail: true,
        pollingEnabled: true,
        providerPlan: true,
      },
    });

    console.log('📊 Updated status:\n');
    updated.forEach((cred, idx) => {
      console.log(`${idx + 1}. ${cred.providerEmail}`);
      console.log(`   - Plan: ${cred.providerPlan || 'Not set'}`);
      console.log(`   - Polling: ${cred.pollingEnabled ? 'ENABLED ✅' : 'DISABLED ❌'}`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ Error enabling polling:', error);
  } finally {
    await prisma.$disconnect();
  }
}

enableCalendlyPolling();
