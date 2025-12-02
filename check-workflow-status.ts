import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkWorkflowStatus() {
  const workspaceId = '8592d2ed-1d31-46d7-9c65-99aecd0de8d4';
  
  console.log('Checking Workflow Status...\n');
  
  const workflows = await prisma.workflow.findMany({
    where: {
      workspaceId,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      status: true,
      workspace: {
        select: {
          slug: true,
        },
      },
    },
  });
  
  console.log('Found ' + workflows.length + ' workflows:\n');
  
  let counter = 1;
  for (const w of workflows) {
    console.log(counter + '. ' + w.name);
    console.log('   ID: ' + w.id);
    console.log('   Status: ' + w.status);
    console.log('   Workspace Slug: ' + w.workspace.slug);
    console.log('   Public URL: ' + process.env.FRONTEND_URL + '/p/' + w.workspace.slug);
    console.log();
    counter++;
  }
  
  const activeWorkflow = workflows.find(w => w.status === 'active');
  
  if (activeWorkflow) {
    console.log('Active workflow found!');
    console.log('Public Form URL: ' + process.env.FRONTEND_URL + '/p/' + activeWorkflow.workspace.slug);
  } else {
    console.log('No active workflow found!');
    if (workflows.length > 0) {
      console.log('Workflow exists but status is: ' + workflows[0].status);
      console.log('Need to set status to active');
    } else {
      console.log('No workflows exist for this workspace');
    }
  }
  
  await prisma.$disconnect();
}

checkWorkflowStatus();
