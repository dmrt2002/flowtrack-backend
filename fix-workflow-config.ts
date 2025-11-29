import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixWorkflowConfiguration() {
  // Find the workspace
  const workspace = await prisma.workspace.findUnique({
    where: { slug: 'dmrtushars-workspace' },
  });

  if (!workspace) {
    console.log('Workspace not found');
    return;
  }

  // Find the workflow
  const workflow = await prisma.workflow.findFirst({
    where: { workspaceId: workspace.id },
  });

  if (!workflow) {
    console.log('Workflow not found');
    return;
  }

  // Find onboarding session to get saved configuration
  const session = await prisma.onboardingSession.findFirst({
    where: { workspaceId: workspace.id },
  });

  let configData = session?.configurationData as any;

  // If no configuration data in session, create default template
  if (!configData || !configData.emailTemplate) {
    console.log('No configuration found in session, creating default...');
    configData = {
      emailTemplate: `Hi {firstName},

Thank you for reaching out! We're excited to learn more about {companyName}.

We'd love to schedule a quick call to discuss how we can help.

Please use this link to book a time that works for you: {bookingUrl}

Looking forward to speaking with you!

Best regards,
The Team`,
      followUpTemplate: `Hi {firstName},

I wanted to follow up on my previous email.

Are you still interested in discussing how we can help {companyName}?

If so, please book a time here: {bookingUrl}

Let me know if you have any questions!

Best,
The Team`,
      followUpDelayDays: 3,
      qualificationCriteria: null,
    };
  }

  // Update workflow with configuration
  await prisma.workflow.update({
    where: { id: workflow.id },
    data: {
      configurationData: configData,
    },
  });

  console.log('✅ Updated workflow configuration:');
  console.log('Workflow ID:', workflow.id);
  console.log('Email Template:', configData.emailTemplate?.substring(0, 100) + '...');
  console.log('Follow-up Template:', configData.followUpTemplate?.substring(0, 100) + '...');
  console.log('Follow-up Delay:', configData.followUpDelayDays, 'days');

  await prisma.$disconnect();
}

fixWorkflowConfiguration().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
