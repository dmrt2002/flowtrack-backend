const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();

async function testCalendlyUrl() {
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

    console.log('\n📋 Fetching Calendly user info...\n');
    console.log(`Access Token (first 50 chars): ${credential.accessToken.substring(0, 50)}...`);

    try {
      const userResponse = await axios.get(
        'https://api.calendly.com/users/me',
        {
          headers: {
            Authorization: `Bearer ${credential.accessToken}`,
          },
        },
      );

      console.log('\n✅ Calendly API Response:\n');
      console.log(JSON.stringify(userResponse.data, null, 2));

      const schedulingUrl =
        userResponse.data.resource.scheduling_url ||
        userResponse.data.resource.link;

      console.log('\n📅 Scheduling URL:', schedulingUrl);

      // Update metadata
      await prisma.oAuthCredential.update({
        where: { id: credential.id },
        data: {
          metadata: {
            ...(credential.metadata || {}),
            schedulingUrl,
          },
        },
      });

      console.log('\n✅ Updated credential metadata with scheduling URL');

    } catch (error) {
      console.error('\n❌ Error fetching from Calendly:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCalendlyUrl();
