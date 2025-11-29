import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type { WorkflowConfigurationDto } from '../dto';

@Injectable()
export class WorkflowConfigurationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get workflow configuration (email templates and delays)
   */
  async getWorkflowConfiguration(userId: string, workflowId: string) {
    // Get the workflow
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: workflowId },
      include: {
        workspace: {
          include: {
            members: true,
          },
        },
      },
    });

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    // Check if user has access to this workspace
    const hasAccess = workflow.workspace.members.some(
      (member: any) => member.userId === userId,
    );

    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this workflow');
    }

    // Extract configuration from configurationData JSON field
    const config = (workflow.configurationData as any) || {};

    return {
      success: true,
      data: {
        workflowId: workflow.id,
        welcomeSubject: config.welcomeSubject || null,
        welcomeBody: config.welcomeBody || null,
        thankYouSubject: config.thankYouSubject || null,
        thankYouBody: config.thankYouBody || null,
        followUpSubject: config.followUpSubject || null,
        followUpBody: config.followUpBody || null,
        followUpDelayDays: config.followUpDelayDays || null,
        deadlineDays: config.deadlineDays || null,
      },
    };
  }

  /**
   * Update workflow configuration (email templates and delays)
   */
  async updateWorkflowConfiguration(
    userId: string,
    dto: WorkflowConfigurationDto,
  ) {
    // Get the workflow
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: dto.workflowId },
      include: {
        workspace: {
          include: {
            members: true,
          },
        },
      },
    });

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    // Check if user has access to this workspace
    const hasAccess = workflow.workspace.members.some(
      (member: any) => member.userId === userId,
    );

    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this workflow');
    }

    // Merge new configuration with existing configurationData
    const existingConfig = (workflow.configurationData as any) || {};
    const updatedConfig = {
      ...existingConfig,
      ...(dto.welcomeSubject !== undefined && { welcomeSubject: dto.welcomeSubject }),
      ...(dto.welcomeBody !== undefined && { welcomeBody: dto.welcomeBody }),
      ...(dto.thankYouSubject !== undefined && { thankYouSubject: dto.thankYouSubject }),
      ...(dto.thankYouBody !== undefined && { thankYouBody: dto.thankYouBody }),
      ...(dto.followUpSubject !== undefined && { followUpSubject: dto.followUpSubject }),
      ...(dto.followUpBody !== undefined && { followUpBody: dto.followUpBody }),
      ...(dto.followUpDelayDays !== undefined && { followUpDelayDays: dto.followUpDelayDays }),
      ...(dto.deadlineDays !== undefined && { deadlineDays: dto.deadlineDays }),
    };

    // Update workflow with new configuration
    const updatedWorkflow = await this.prisma.workflow.update({
      where: { id: dto.workflowId },
      data: {
        configurationData: updatedConfig,
        updatedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Workflow configuration updated successfully',
      data: {
        workflowId: updatedWorkflow.id,
        welcomeSubject: updatedConfig.welcomeSubject || null,
        welcomeBody: updatedConfig.welcomeBody || null,
        thankYouSubject: updatedConfig.thankYouSubject || null,
        thankYouBody: updatedConfig.thankYouBody || null,
        followUpSubject: updatedConfig.followUpSubject || null,
        followUpBody: updatedConfig.followUpBody || null,
        followUpDelayDays: updatedConfig.followUpDelayDays || null,
        deadlineDays: updatedConfig.deadlineDays || null,
      },
    };
  }
}
