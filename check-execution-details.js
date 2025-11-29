const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkExecutionDetails() {
  try {
    const executions = await prisma.workflowExecution.findMany({
      where: {
        id: {
          in: ['8b60d3ec-6a49-4573-9a88-540270c9f5ea', 'b44afd4d-e9a1-4c3a-8d42-11d11913038b']
        }
      },
      include: {
        lead: true,
        executionSteps: {
          orderBy: { stepNumber: 'asc' },
          include: {
            workflowNode: true,
          },
        },
        executionLogs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    for (const exec of executions) {
      console.log('\n' + '='.repeat(80));
      console.log(`Execution ID: ${exec.id}`);
      console.log(`Lead: ${exec.lead?.email}`);
      console.log(`Status: ${exec.status}`);
      console.log(`Created: ${exec.createdAt.toISOString()}`);
      console.log(`Started: ${exec.startedAt?.toISOString() || 'N/A'}`);
      console.log(`Completed: ${exec.completedAt?.toISOString() || 'N/A'}`);

      if (exec.errorMessage) {
        console.log(`\n❌ Error: ${exec.errorMessage}`);
      }

      console.log(`\n📊 Execution Steps (${exec.executionSteps.length} total):`);
      exec.executionSteps.forEach((step) => {
        const icon = step.status === 'completed' ? '✅' :
                     step.status === 'failed' ? '❌' :
                     step.status === 'running' ? '⏳' : '⏸️';
        console.log(`  ${icon} Step ${step.stepNumber}: ${step.workflowNode.nodeType} - ${step.status}`);
        if (step.errorMessage) {
          console.log(`     Error: ${step.errorMessage}`);
        }
        if (step.durationMs) {
          console.log(`     Duration: ${step.durationMs}ms`);
        }
      });

      if (exec.executionLogs.length > 0) {
        console.log(`\n📝 Recent Logs (${exec.executionLogs.length} shown):`);
        exec.executionLogs.forEach((log) => {
          console.log(`  [${log.logLevel}] ${log.message}`);
          if (log.details) {
            console.log(`     Details: ${JSON.stringify(log.details).substring(0, 100)}...`);
          }
        });
      }
    }

    console.log('\n' + '='.repeat(80) + '\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkExecutionDetails();
