import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { UnifiedAuthGuard } from '../../../auth/guards/unified-auth.guard';
import { MessageService } from '../services/message.service';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { getHotboxConversationsSchema } from '../dto/hotbox.dto';
import type { GetHotboxConversationsDto } from '../dto/hotbox.dto';

@Controller('workspaces/:workspaceId/hotbox')
@UseGuards(UnifiedAuthGuard)
export class HotboxController {
  constructor(private messageService: MessageService) {}

  /**
   * Get conversations that need reply (have INBOUND messages)
   * Priority conversations where leads have responded
   */
  @Get('needs-reply')
  async getConversationsNeedingReply(
    @Param('workspaceId') workspaceId: string,
    @Query(new ZodValidationPipe(getHotboxConversationsSchema))
    query: GetHotboxConversationsDto,
  ) {
    return this.messageService.getConversationsNeedingReply(
      workspaceId,
      query.limit,
      query.offset,
    );
  }

  /**
   * Get conversations with only sent emails (no replies yet)
   * Shows emails awaiting response from leads
   */
  @Get('sent')
  async getConversationsSentOnly(
    @Param('workspaceId') workspaceId: string,
    @Query(new ZodValidationPipe(getHotboxConversationsSchema))
    query: GetHotboxConversationsDto,
  ) {
    return this.messageService.getConversationsSentOnly(
      workspaceId,
      query.limit,
      query.offset,
    );
  }
}
