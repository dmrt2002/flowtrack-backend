import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../../prisma/prisma.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { EnrichmentModule } from '../enrichment/enrichment.module';

// Services
import { FormValidationService } from './services/form-validation.service';
import { FormSubmissionService } from './services/form-submission.service';
import { WorkflowTriggerService } from './services/workflow-trigger.service';

// Controllers
import { PublicFormController } from './controllers/public-form.controller';
import { FormEmbedController } from './controllers/form-embed.controller';

@Module({
  imports: [
    PrismaModule,
    WorkflowsModule, // Import WorkflowsModule to use WorkflowQueueService
    EnrichmentModule, // Import EnrichmentModule to use EnrichmentQueueService
    JwtModule.register({}), // Required for UnifiedAuthGuard in FormEmbedController
  ],
  controllers: [PublicFormController, FormEmbedController],
  providers: [
    FormValidationService,
    FormSubmissionService,
    WorkflowTriggerService,
  ],
  exports: [
    FormValidationService,
    FormSubmissionService,
    WorkflowTriggerService,
  ],
})
export class FormsModule {}
