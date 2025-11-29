import { PrismaClient, WorkflowExecutionStatus } from '@prisma/client';
import { Queue } from 'bullmq';

const prisma = new PrismaClient();

// Create BullMQ queue connection
const workflowQueue = new Queue('workflow-execution', {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
});

async function retryExecutions() {
  try {
    // Find all failed and queued executions
    const executions = await prisma.workflowExecution.findMany({
      where: {
        status: {
          in: [WorkflowExecutionStatus.failed, WorkflowExecutionStatus.queued],
        },
      },
      include: {
        lead: true,
        workflow: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`Found ${executions.length} executions to retry\n`);

    for (const execution of executions) {
      console.log(`Processing execution: ${execution.id}`);
      console.log(`  Status: ${execution.status}`);
      console.log(`  Lead: ${execution.lead?.email}`);
      console.log(`  Workflow: ${execution.workflow?.name}`);

      // Reset execution to queued status
      await prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: WorkflowExecutionStatus.queued,
          errorMessage: null,
          errorDetails: undefined,
          startedAt: null,
          completedAt: null,
        },
      });

      // Delete old execution steps
      await prisma.executionStep.deleteMany({
        where: { executionId: execution.id },
      });

      console.log(`  ✅ Reset to queued status and cleared old steps`);

      // Enqueue for execution
      await workflowQueue.add(
        'execute-workflow',
        { executionId: execution.id },
        {
          jobId: `execution-${execution.id}`,
          removeOnComplete: true,
          removeOnFail: false,
        },
      );

      console.log(`  ✅ Enqueued for execution\n`);
    }

    console.log(`\n✅ Successfully queued ${executions.length} executions for retry`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await workflowQueue.close();
    await prisma.$disconnect();
  }
}

retryExecutions();
