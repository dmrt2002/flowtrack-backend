const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkEmailTemplate() {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { slug: 'dmrtushars-workspace' },
    });

    if (!workspace) {
      console.log('Workspace not found');
      return;
    }

    const workflow = await prisma.workflow.findFirst({
      where: { workspaceId: workspace.id },
    });

    if (!workflow) {
      console.log('Workflow not found');
      return;
    }

    const config = workflow.configurationData;

    console.log('\n=== Email Template ===');
    console.log(config.emailTemplate);
    console.log('\n=== Follow-up Template ===');
    console.log(config.followUpTemplate);

    // Check if templates contain booking URL placeholder
    const hasBookingUrl =
      config.emailTemplate?.includes('{bookingUrl}') ||
      config.emailTemplate?.includes('{calendlyLink}');

    console.log('\n=== Template Analysis ===');
    console.log(`Contains {bookingUrl}: ${config.emailTemplate?.includes('{bookingUrl}') || false}`);
    console.log(`Contains {calendlyLink}: ${config.emailTemplate?.includes('{calendlyLink}') || false}`);
    console.log(`Has booking URL placeholder: ${hasBookingUrl}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkEmailTemplate();
