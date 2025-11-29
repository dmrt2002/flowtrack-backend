import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { UnifiedAuthGuard } from '../../auth/guards/unified-auth.guard';
import { User } from '../../auth/decorators/user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { WorkflowConfigurationService } from './services/workflow-configuration.service';
import type { WorkflowConfigurationDto } from './dto';
import { workflowConfigurationSchema } from './dto';

@Controller('workflows')
@UseGuards(UnifiedAuthGuard)
export class WorkflowsController {
  constructor(
    private workflowConfigurationService: WorkflowConfigurationService,
  ) {}

  /**
   * GET /api/v1/workflows/:workflowId/configuration
   * Get workflow configuration (email templates and delays)
   */
  @Get(':workflowId/configuration')
  async getWorkflowConfiguration(
    @User() user: any,
    @Param('workflowId') workflowId: string,
  ) {
    return this.workflowConfigurationService.getWorkflowConfiguration(
      user.id,
      workflowId,
    );
  }

  /**
   * PUT /api/v1/workflows/configuration
   * Update workflow configuration (email templates and delays)
   */
  @Put('configuration')
  async updateWorkflowConfiguration(
    @User() user: any,
    @Body(new ZodValidationPipe(workflowConfigurationSchema))
    dto: WorkflowConfigurationDto,
  ) {
    return this.workflowConfigurationService.updateWorkflowConfiguration(
      user.id,
      dto,
    );
  }
}
