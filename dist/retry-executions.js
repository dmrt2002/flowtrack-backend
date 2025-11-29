"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bullmq_1 = require("bullmq");
const prisma = new client_1.PrismaClient();
const workflowQueue = new bullmq_1.Queue('workflow-execution', {
    connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
    },
});
async function retryExecutions() {
    try {
        const executions = await prisma.workflowExecution.findMany({
            where: {
                status: {
                    in: [client_1.WorkflowExecutionStatus.failed, client_1.WorkflowExecutionStatus.queued],
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
            await prisma.workflowExecution.update({
                where: { id: execution.id },
                data: {
                    status: client_1.WorkflowExecutionStatus.queued,
                    errorMessage: null,
                    errorDetails: undefined,
                    startedAt: null,
                    completedAt: null,
                },
            });
            await prisma.executionStep.deleteMany({
                where: { executionId: execution.id },
            });
            console.log(`  ✅ Reset to queued status and cleared old steps`);
            await workflowQueue.add('execute-workflow', { executionId: execution.id }, {
                jobId: `execution-${execution.id}`,
                removeOnComplete: true,
                removeOnFail: false,
            });
            console.log(`  ✅ Enqueued for execution\n`);
        }
        console.log(`\n✅ Successfully queued ${executions.length} executions for retry`);
    }
    catch (error) {
        console.error('Error:', error);
    }
    finally {
        await workflowQueue.close();
        await prisma.$disconnect();
    }
}
retryExecutions();
//# sourceMappingURL=retry-executions.js.map