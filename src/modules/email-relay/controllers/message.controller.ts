import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ValidationPipe,
  UsePipes,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { UnifiedAuthGuard } from '../../../auth/guards/unified-auth.guard';
import { MessageService } from '../services/message.service';
import { RelayEmailService } from '../services/relay-email.service';
import { PrismaService } from '../../../prisma/prisma.service';
import type {
  SendRelayEmailDto,
} from '../dto/send-relay-email.dto';
import {
  sendRelayEmailSchema,
} from '../dto/send-relay-email.dto';
import type {
  GetMessagesQueryDto,
} from '../dto/get-messages.dto';
import {
  getMessagesQuerySchema,
} from '../dto/get-messages.dto';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';

@Controller('workspaces/:workspaceId')
@UseGuards(UnifiedAuthGuard)
export class MessageController {
  constructor(
    private messageService: MessageService,
    private relayEmailService: RelayEmailService,
    private prisma: PrismaService,
  ) {}

  /**
   * Get all messages for a workspace
   */
  @Get('messages')
  async getWorkspaceMessages(
    @Param('workspaceId') workspaceId: string,
    @Query(new ZodValidationPipe(getMessagesQuerySchema))
    query: GetMessagesQueryDto,
  ) {
    return this.messageService.getMessagesByWorkspace(
      workspaceId,
      query.direction,
      query.limit,
      query.offset,
    );
  }

  /**
   * Get all messages for a specific lead (conversation thread)
   */
  @Get('leads/:leadId/messages')
  async getLeadMessages(
    @Param('workspaceId') workspaceId: string,
    @Param('leadId') leadId: string,
    @Query(new ZodValidationPipe(getMessagesQuerySchema))
    query: GetMessagesQueryDto,
  ) {
    // Verify lead belongs to workspace
    const lead = await this.prisma.lead.findFirst({
      where: {
        id: leadId,
        workspaceId,
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found in this workspace');
    }

    return this.messageService.getMessagesByLead(
      leadId,
      workspaceId,
      query.direction,
      query.limit,
      query.offset,
    );
  }

  /**
   * Send email to a lead
   */
  @Post('leads/:leadId/messages/send')
  async sendEmailToLead(
    @Param('workspaceId') workspaceId: string,
    @Param('leadId') leadId: string,
    @Body(new ZodValidationPipe(sendRelayEmailSchema))
    dto: SendRelayEmailDto,
  ) {
    // Verify lead belongs to workspace
    const lead = await this.prisma.lead.findFirst({
      where: {
        id: leadId,
        workspaceId,
      },
      select: {
        email: true,
        name: true,
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found in this workspace');
    }

    try {
      const result = await this.relayEmailService.sendEmailToLead(
        workspaceId,
        leadId,
        lead.email,
        lead.name || undefined,
        dto.subject,
        dto.textBody,
        dto.htmlBody,
        dto.senderName,
      );

      return {
        success: true,
        messageId: result.messageId,
        message: 'Email sent successfully',
      };
    } catch (error) {
      throw new BadRequestException('Failed to send email: ' + error.message);
    }
  }
}
