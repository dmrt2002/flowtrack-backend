import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../../prisma/prisma.module';
import { EmailModule } from '../email/email.module';

// Controllers
import { WorkflowsController } from './workflows.controller';

// Services
import { WorkflowQueueService } from './services/workflow-queue.service';
import { WorkflowExecutorService } from './services/workflow-executor.service';
import { ConditionEvaluatorService } from './services/condition-evaluator.service';
import { WorkflowConfigurationService } from './services/workflow-configuration.service';

// Processors
import { WorkflowExecutionProcessor } from './processors/workflow-execution.processor';

@Module({
  imports: [
    PrismaModule,
    EmailModule,
    JwtModule.register({}),
    BullModule.registerQueue({
      name: 'workflow-execution',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    }),
  ],
  controllers: [WorkflowsController],
  providers: [
    WorkflowQueueService,
    WorkflowExecutorService,
    ConditionEvaluatorService,
    WorkflowConfigurationService,
    WorkflowExecutionProcessor,
  ],
  exports: [
    WorkflowQueueService, // Export for use in WorkflowTriggerService
  ],
})
export class WorkflowsModule {}
