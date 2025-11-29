const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function reactivate() {
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
      },
    });

    if (!credential) {
      console.log('❌ No Calendly credential found');
      return;
    }

    console.log('\n📋 Current Status:');
    console.log(`Active: ${credential.isActive}`);
    console.log(`Plan: ${credential.providerPlan}`);
    console.log(`Polling Enabled: ${credential.pollingEnabled}`);
    console.log('');

    // Reactivate the credential
    await prisma.oAuthCredential.update({
      where: { id: credential.id },
      data: {
        isActive: true,
      },
    });

    console.log('✅ Credential reactivated!');
    console.log('');
    console.log('⚠️  Note: The access token has expired. You will need to:');
    console.log('   1. Re-authenticate with Calendly through the OAuth flow, OR');
    console.log('   2. Wait for the automatic token refresh to succeed (requires network access to auth.calendly.com)');
    console.log('');
    console.log('💡 If you have a valid refresh token, the system will automatically');
    console.log('   refresh the access token on the next polling attempt.');
    console.log('');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

reactivate();
