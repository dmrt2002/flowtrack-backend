const { PrismaClient } = require('@prisma/client');
const readline = require('readline');

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function updateCalendlyUrl() {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { slug: 'dmrtushars-workspace' },
    });

    if (!workspace) {
      console.log('Workspace not found');
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
      console.log('No Calendly credential found');
      return;
    }

    console.log('\n📋 Current Calendly Credential:');
    console.log(`ID: ${credential.id}`);
    console.log(`Provider Email: ${credential.providerEmail}`);
    console.log(`Current Metadata: ${JSON.stringify(credential.metadata, null, 2)}\n`);

    const url = await question(
      'Enter your Calendly scheduling URL (e.g., https://calendly.com/yourname/meeting): ',
    );

    if (!url || !url.trim()) {
      console.log('No URL provided. Exiting.');
      return;
    }

    const trimmedUrl = url.trim();

    // Validate URL
    try {
      new URL(trimmedUrl);
    } catch (e) {
      console.log('❌ Invalid URL format');
      return;
    }

    // Update metadata
    await prisma.oAuthCredential.update({
      where: { id: credential.id },
      data: {
        metadata: {
          ...(credential.metadata || {}),
          schedulingUrl: trimmedUrl,
        },
      },
    });

    console.log('\n✅ Successfully updated Calendly scheduling URL in metadata!');
    console.log(`URL: ${trimmedUrl}\n`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

updateCalendlyUrl();
