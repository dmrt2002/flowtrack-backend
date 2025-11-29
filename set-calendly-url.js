const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setCalendlyUrl() {
  try {
    const url = process.argv[2];

    if (!url) {
      console.log('Usage: node set-calendly-url.js <calendly-url>');
      console.log('Example: node set-calendly-url.js https://calendly.com/yourname/meeting');
      return;
    }

    // Validate URL
    try {
      new URL(url);
    } catch (e) {
      console.log('❌ Invalid URL format');
      return;
    }

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

    console.log('\n📋 Updating Calendly scheduling URL...\n');
    console.log(`Credential ID: ${credential.id}`);
    console.log(`New URL: ${url}\n`);

    // Update metadata
    await prisma.oAuthCredential.update({
      where: { id: credential.id },
      data: {
        metadata: {
          ...(credential.metadata || {}),
          schedulingUrl: url,
        },
      },
    });

    console.log('✅ Successfully updated Calendly scheduling URL!\n');

    // Verify
    const updated = await prisma.oAuthCredential.findUnique({
      where: { id: credential.id },
    });

    console.log('📊 Updated Metadata:');
    console.log(JSON.stringify(updated.metadata, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setCalendlyUrl();
