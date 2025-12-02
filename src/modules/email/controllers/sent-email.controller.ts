import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { UnifiedAuthGuard } from '../../../auth/guards/unified-auth.guard';
import { User } from '../../../auth/decorators/user.decorator';
import { SentEmailService, GetSentEmailsOptions } from '../services/sent-email.service';
import { PrismaService } from '../../../prisma/prisma.service';

@Controller('sent-emails')
@UseGuards(UnifiedAuthGuard)
export class SentEmailController {
  constructor(
    private sentEmailService: SentEmailService,
    private prisma: PrismaService,
  ) {}

  /**
   * GET /api/v1/sent-emails/workspaces/:workspaceId
   * Get all sent emails for a workspace (global inbox)
   */
  @Get('workspaces/:workspaceId')
  async getWorkspaceEmails(
    @User() user: any,
    @Param('workspaceId') workspaceId: string,
    @Query('workflowId') workflowId?: string,
    @Query('emailType') emailType?: 'welcome' | 'thank_you' | 'follow_up',
    @Query('deliveryStatus') deliveryStatus?: 'sent' | 'delivered' | 'bounced' | 'failed',
    @Query('openStatus') openStatus?: 'opened' | 'unopened' | 'all',
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('sortBy') sortBy?: 'sentAt' | 'openCount',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    // Verify user has access to workspace
    await this.verifyWorkspaceAccess(user.id, workspaceId);

    const options: GetSentEmailsOptions = {
      workspaceId,
      workflowId,
      emailType,
      deliveryStatus,
      openStatus: openStatus || 'all',
      search,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
      sortBy: sortBy || 'sentAt',
      sortOrder: sortOrder || 'desc',
    };

    const result = await this.sentEmailService.getSentEmailsByWorkspace(options);

    return {
      success: true,
      data: result,
    };
  }

  /**
   * GET /api/v1/sent-emails/workspaces/:workspaceId/leads/:leadId
   * Get all sent emails for a specific lead
   */
  @Get('workspaces/:workspaceId/leads/:leadId')
  async getLeadEmails(
    @User() user: any,
    @Param('workspaceId') workspaceId: string,
    @Param('leadId') leadId: string,
    @Query('emailType') emailType?: 'welcome' | 'thank_you' | 'follow_up',
    @Query('openStatus') openStatus?: 'opened' | 'unopened' | 'all',
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    // Verify user has access to workspace
    await this.verifyWorkspaceAccess(user.id, workspaceId);

    const options: GetSentEmailsOptions = {
      workspaceId,
      leadId,
      emailType,
      openStatus: openStatus || 'all',
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    };

    const result = await this.sentEmailService.getSentEmailsByLead(options);

    return {
      success: true,
      data: result,
    };
  }

  /**
   * GET /api/v1/sent-emails/:emailId/workspaces/:workspaceId
   * Get a single sent email by ID
   */
  @Get(':emailId/workspaces/:workspaceId')
  async getSentEmailById(
    @User() user: any,
    @Param('emailId') emailId: string,
    @Param('workspaceId') workspaceId: string,
  ) {
    // Verify user has access to workspace
    await this.verifyWorkspaceAccess(user.id, workspaceId);

    const sentEmail = await this.sentEmailService.getSentEmailById(emailId, workspaceId);

    return {
      success: true,
      data: sentEmail,
    };
  }

  /**
   * GET /api/v1/sent-emails/workspaces/:workspaceId/statistics
   * Get email statistics for a workspace
   */
  @Get('workspaces/:workspaceId/statistics')
  async getEmailStatistics(
    @User() user: any,
    @Param('workspaceId') workspaceId: string,
  ) {
    // Verify user has access to workspace
    await this.verifyWorkspaceAccess(user.id, workspaceId);

    const statistics = await this.sentEmailService.getEmailStatistics(workspaceId);

    return {
      success: true,
      data: statistics,
    };
  }

  /**
   * Helper: Verify user has access to workspace
   */
  private async verifyWorkspaceAccess(userId: string, workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          where: { userId },
        },
      },
    });

    if (!workspace || workspace.members.length === 0) {
      throw new Error('Workspace not found or access denied');
    }

    return workspace;
  }
}
