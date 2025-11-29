const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkWorkflows() {
  try {
    // Get the workspace
    const workspace = await prisma.workspace.findUnique({
      where: { slug: 'dmrtushars-workspace' },
    });

    if (!workspace) {
      console.log('❌ Workspace not found');
      return;
    }

    console.log(`✅ Workspace found: ${workspace.name} (${workspace.id})`);
    console.log('');

    // Get the workflow
    const workflow = await prisma.workflow.findFirst({
      where: { workspaceId: workspace.id },
      include: {
        nodes: {
          where: { deletedAt: null },
          orderBy: { executionOrder: 'asc' },
        },
      },
    });

    if (!workflow) {
      console.log('❌ No workflow found');
      return;
    }

    console.log(`✅ Workflow found: ${workflow.name} (${workflow.id})`);
    console.log('');

    // Check configuration
    const config = workflow.configurationData;
    console.log('📋 Configuration Data:');
    if (!config) {
      console.log('❌ No configuration data');
    } else {
      console.log(`✅ Email Template: ${config.emailTemplate ? 'Present' : 'Missing'}`);
      console.log(`✅ Follow-up Template: ${config.followUpTemplate ? 'Present' : 'Missing'}`);
      console.log(`✅ Follow-up Delay: ${config.followUpDelayDays || 'Not set'} days`);
    }
    console.log('');

    // Check workflow nodes
    console.log(`📊 Workflow Nodes (${workflow.nodes.length} total):`);
    workflow.nodes.forEach((node, index) => {
      console.log(`  ${index + 1}. ${node.nodeType} (order: ${node.executionOrder})`);
    });
    console.log('');

    // Check recent executions
    const executions = await prisma.workflowExecution.findMany({
      where: { workflowId: workflow.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        lead: true,
        executionSteps: {
          orderBy: { stepNumber: 'asc' },
        },
      },
    });

    console.log(`📈 Recent Executions (${executions.length} shown):`);
    executions.forEach((exec, index) => {
      console.log(`  ${index + 1}. Status: ${exec.status} | Lead: ${exec.lead?.email || 'N/A'} | Created: ${exec.createdAt.toISOString()}`);
      if (exec.errorMessage) {
        console.log(`     ❌ Error: ${exec.errorMessage}`);
      }
      if (exec.executionSteps.length > 0) {
        console.log(`     Steps: ${exec.executionSteps.map(s => `${s.status}`).join(' → ')}`);
      }
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkWorkflows();
