const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixCalendlyPlan() {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { slug: 'dmrtushars-workspace' },
    });

    if (!workspace) {
      console.log('❌ Workspace not found');
      return;
    }

    const credential = await prisma.oAuthCredential.findFirst({
      where: {
        workspaceId: workspace.id,
        providerType: 'CALENDLY',
        isActive: true,
      },
    });

    if (!credential) {
      console.log('❌ No Calendly credential found');
      return;
    }

    console.log('\n📋 Current Status:');
    console.log(`Provider Plan: ${credential.providerPlan}`);
    console.log(`Webhook Enabled: ${credential.webhookEnabled}`);
    console.log(`Polling Enabled: ${credential.pollingEnabled}`);
    console.log('');

    console.log('🔧 Fixing plan type to FREE for polling to work...');

    // Change plan to FREE so polling service will process it
    await prisma.oAuthCredential.update({
      where: { id: credential.id },
      data: {
        providerPlan: 'FREE',
        pollingEnabled: true,
        webhookEnabled: false,
      },
    });

    console.log('✅ Changed plan to FREE and enabled polling');
    console.log('');
    console.log('💡 This will allow the polling service to fetch your bookings');
    console.log('   even though you have a PRO account. Polling will work the same.');
    console.log('');
    console.log('🔄 Next Steps:');
    console.log('1. Run: npx ts-node poll-now.ts');
    console.log('2. Check: node verify-booking-detection.js');
    console.log('');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixCalendlyPlan();
