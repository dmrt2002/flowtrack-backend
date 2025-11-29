const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function enablePolling() {
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

    // Enable polling for the credential
    await prisma.oAuthCredential.update({
      where: { id: credential.id },
      data: {
        pollingEnabled: true,
      },
    });

    console.log('✅ Polling enabled successfully!');
    console.log('');
    console.log('💡 Next Steps:');
    console.log('1. Polling will run every 15 minutes automatically');
    console.log('2. Or trigger manually via API: POST /api/booking/poll-now');
    console.log('3. Check logs for: "[PollingService] Polling Calendly..."');
    console.log('4. Run "node verify-booking-detection.js" to check status');
    console.log('');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

enablePolling();
