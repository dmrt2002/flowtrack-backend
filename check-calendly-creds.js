const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkCalendlyCreds() {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { slug: 'dmrtushars-workspace' },
    });

    if (!workspace) {
      console.log('Workspace not found');
      return;
    }

    const calendlyCredentials = await prisma.oAuthCredential.findMany({
      where: {
        workspaceId: workspace.id,
        providerType: 'CALENDLY',
      },
    });

    console.log(`\nFound ${calendlyCredentials.length} Calendly credentials:\n`);

    for (const cred of calendlyCredentials) {
      console.log('='.repeat(80));
      console.log(`ID: ${cred.id}`);
      console.log(`Provider Email: ${cred.providerEmail || 'N/A'}`);
      console.log(`Provider User ID: ${cred.providerUserId || 'N/A'}`);
      console.log(`Provider Plan: ${cred.providerPlan || 'N/A'}`);
      console.log(`Active: ${cred.isActive}`);
      console.log(`Access Token (first 100 chars): ${cred.accessToken.substring(0, 100)}...`);
      console.log(`Refresh Token: ${cred.refreshToken ? 'Present' : 'None'}`);
      console.log(`Metadata: ${JSON.stringify(cred.metadata, null, 2)}`);
      console.log('');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCalendlyCreds();
