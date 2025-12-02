import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const workflowId = 'db63deec-e144-4aa7-924d-26cf238625ae';

  console.log('=== Debug Subject Line Issue ===\n');

  // Get current configuration
  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId },
    select: {
      configurationData: true,
    },
  });

  const config = workflow?.configurationData as any;

  console.log('Current configuration in DB:');
  console.log('welcomeSubject:', JSON.stringify(config.welcomeSubject));
  console.log('welcomeSubject length:', config.welcomeSubject?.length);
  console.log('welcomeSubject charCodes:', Array.from(config.welcomeSubject || '').map((c: string) => c.charCodeAt(0)));

  console.log('\n--- Testing update with correct subject ---\n');

  // Try updating with the correct subject
  const correctSubject = "Welcome! Here's your booking";

  const updatedConfig = {
    ...config,
    welcomeSubject: correctSubject,
  };

  await prisma.workflow.update({
    where: { id: workflowId },
    data: {
      configurationData: updatedConfig,
    },
  });

  console.log('✅ Updated with correct subject:', correctSubject);

  // Verify
  const verifyWorkflow = await prisma.workflow.findUnique({
    where: { id: workflowId },
    select: {
      configurationData: true,
    },
  });

  const verifyConfig = verifyWorkflow?.configurationData as any;
  console.log('\n📊 Verification:');
  console.log('welcomeSubject:', verifyConfig.welcomeSubject);
  console.log('Length:', verifyConfig.welcomeSubject?.length);
  console.log('Match:', verifyConfig.welcomeSubject === correctSubject ? '✅ MATCH' : '❌ MISMATCH');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
