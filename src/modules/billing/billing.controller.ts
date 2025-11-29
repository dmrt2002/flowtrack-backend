import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { UnifiedAuthGuard } from '../../auth/guards/unified-auth.guard';
import { BillingService } from './billing.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { User } from '../../auth/decorators/user.decorator';
import type { UserPayload } from '../../auth/decorators/user.decorator';
import type { CreateCheckoutSessionDto } from './dto';
import { createCheckoutSessionSchema } from './dto';

@Controller('billing')
@UseGuards(UnifiedAuthGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  /**
   * GET /billing/plans
   * Get all available subscription plans
   */
  @Get('plans')
  @HttpCode(HttpStatus.OK)
  async getAvailablePlans() {
    return this.billingService.getAvailablePlans();
  }

  /**
   * GET /billing/workspace/:workspaceId/subscription
   * Get workspace's current subscription details
   */
  @Get('workspace/:workspaceId/subscription')
  @HttpCode(HttpStatus.OK)
  async getWorkspaceSubscription(
    @User() user: UserPayload,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.billingService.getWorkspaceSubscription(user.id, workspaceId);
  }

  /**
   * GET /billing/workspace/:workspaceId/usage
   * Get workspace's current usage against quotas
   */
  @Get('workspace/:workspaceId/usage')
  @HttpCode(HttpStatus.OK)
  async getWorkspaceUsage(
    @User() user: UserPayload,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.billingService.getWorkspaceUsage(user.id, workspaceId);
  }

  /**
   * POST /billing/workspace/:workspaceId/checkout
   * Create Stripe checkout session for subscription purchase
   */
  @Post('workspace/:workspaceId/checkout')
  @HttpCode(HttpStatus.OK)
  async createCheckoutSession(
    @User() user: UserPayload,
    @Param('workspaceId') workspaceId: string,
    @Body(new ZodValidationPipe(createCheckoutSessionSchema))
    dto: CreateCheckoutSessionDto,
  ) {
    return this.billingService.createCheckoutSession(user.id, workspaceId, dto);
  }

  /**
   * POST /billing/workspace/:workspaceId/portal
   * Create Stripe customer portal session
   */
  @Post('workspace/:workspaceId/portal')
  @HttpCode(HttpStatus.OK)
  async createCustomerPortalSession(
    @User() user: UserPayload,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.billingService.createCustomerPortalSession(user.id, workspaceId);
  }

  /**
   * POST /billing/workspace/:workspaceId/cancel
   * Cancel subscription at end of billing period
   */
  @Post('workspace/:workspaceId/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelSubscription(
    @User() user: UserPayload,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.billingService.cancelSubscription(user.id, workspaceId);
  }

  /**
   * POST /billing/workspace/:workspaceId/reactivate
   * Reactivate a cancelled subscription
   */
  @Post('workspace/:workspaceId/reactivate')
  @HttpCode(HttpStatus.OK)
  async reactivateSubscription(
    @User() user: UserPayload,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.billingService.reactivateSubscription(user.id, workspaceId);
  }
}
