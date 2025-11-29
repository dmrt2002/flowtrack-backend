const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkStatus() {
  try {
    // Check workspace
    const workspace = await prisma.workspace.findUnique({
      where: { slug: 'dmrtushars-workspace' },
    });

    if (!workspace) {
      console.log('❌ Workspace not found');
      return;
    }

    console.log(`✅ Workspace found: ${workspace.id}`);
    console.log('');

    // Check Calendly credentials
    const credentials = await prisma.oAuthCredential.findMany({
      where: {
        workspaceId: workspace.id,
        providerType: 'CALENDLY',
      },
    });

    console.log(`📋 Found ${credentials.length} Calendly credential(s):`);
    credentials.forEach((cred, index) => {
      console.log(`\n${index + 1}. Credential ID: ${cred.id}`);
      console.log(`   Active: ${cred.isActive}`);
      console.log(`   Plan: ${cred.providerPlan}`);
      console.log(`   Polling Enabled: ${cred.pollingEnabled}`);
      console.log(`   Webhook Enabled: ${cred.webhookEnabled}`);
      console.log(`   Token Expires: ${cred.expiresAt}`);
      console.log(`   Created: ${cred.createdAt}`);
    });

    console.log('');

    // Check polling jobs
    const pollingJobs = await prisma.bookingPollingJob.findMany({
      orderBy: {
        startedAt: 'desc',
      },
      take: 5,
    });

    console.log(`📊 Recent Polling Jobs (${pollingJobs.length} shown):`);
    pollingJobs.forEach((job, index) => {
      console.log(`\n${index + 1}. Job ID: ${job.id}`);
      console.log(`   Status: ${job.status}`);
      console.log(`   Started: ${job.startedAt}`);
      console.log(`   Completed: ${job.completedAt || 'N/A'}`);
      console.log(`   Events Fetched: ${job.eventsFetched || 0}`);
      console.log(`   Events Created: ${job.eventsCreated || 0}`);
      if (job.errorMessage) {
        console.log(`   Error: ${job.errorMessage}`);
      }
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkStatus();
