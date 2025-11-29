import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateCheckoutSessionDto } from './dto';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly stripeSecretKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY') || '';
  }

  /**
   * Get all available subscription plans
   */
  async getAvailablePlans() {
    const plans = await this.prisma.subscriptionPlan.findMany({
      where: {
        isActive: true,
        isVisible: true,
      },
      orderBy: {
        displayOrder: 'asc',
      },
    });

    return plans;
  }

  /**
   * Get workspace's current subscription
   */
  async getWorkspaceSubscription(userId: string, workspaceId: string) {
    // Verify user has access to workspace
    await this.checkWorkspaceAccess(userId, workspaceId);

    const subscription = await this.prisma.subscription.findFirst({
      where: { workspaceId },
      include: {
        subscriptionPlan: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!subscription) {
      return null;
    }

    return {
      id: subscription.id,
      plan: subscription.subscriptionPlan,
      status: subscription.status,
      billingCycle: subscription.billingCycle,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      trialEndDate: subscription.trialEndDate,
    };
  }

  /**
   * Get workspace usage quotas
   */
  async getWorkspaceUsage(userId: string, workspaceId: string) {
    // Verify user has access to workspace
    await this.checkWorkspaceAccess(userId, workspaceId);

    // Get current subscription to know quota limits
    const subscription = await this.prisma.subscription.findFirst({
      where: { workspaceId },
      include: {
        subscriptionPlan: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!subscription) {
      throw new NotFoundException('No active subscription found for workspace');
    }

    const quotas = subscription.subscriptionPlan.quotas as Record<string, number>;

    // Get actual usage
    const [
      workflowCount,
      memberCount,
      leadCount,
    ] = await Promise.all([
      this.prisma.workflow.count({ where: { workspaceId, status: 'active' } }),
      this.prisma.workspaceMember.count({ where: { workspaceId } }),
      this.prisma.lead.count({
        where: {
          workspaceId,
          createdAt: {
            gte: subscription.currentPeriodStart,
            lte: subscription.currentPeriodEnd,
          },
        },
      }),
    ]);

    return {
      workflows: {
        used: workflowCount,
        limit: quotas.maxWorkflows || 0,
        percentage: quotas.maxWorkflows ? (workflowCount / quotas.maxWorkflows) * 100 : 0,
      },
      teamMembers: {
        used: memberCount,
        limit: quotas.maxTeamMembers || 0,
        percentage: quotas.maxTeamMembers ? (memberCount / quotas.maxTeamMembers) * 100 : 0,
      },
      monthlyLeads: {
        used: leadCount,
        limit: quotas.maxLeadsPerMonth || 0,
        percentage: quotas.maxLeadsPerMonth ? (leadCount / quotas.maxLeadsPerMonth) * 100 : 0,
      },
    };
  }

  /**
   * Create Stripe checkout session for subscription
   * NOTE: Actual Stripe integration would require the Stripe SDK
   * This is a placeholder that returns the structure needed
   */
  async createCheckoutSession(
    userId: string,
    workspaceId: string,
    dto: CreateCheckoutSessionDto,
  ) {
    // Verify user is admin or owner
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!membership || (membership.role !== 'admin' && membership.role !== 'owner')) {
      throw new ForbiddenException('Only admins and owners can manage billing');
    }

    // Verify plan exists
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: dto.planId },
    });

    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    // In a real implementation, you would:
    // 1. Create or retrieve Stripe customer
    // 2. Create Stripe checkout session
    // 3. Return session URL

    // For now, return a mock response
    this.logger.log(
      `Would create Stripe checkout for workspace ${workspaceId}, plan ${plan.name}, cycle ${dto.billingCycle}`,
    );

    return {
      sessionId: 'mock_session_id',
      url: 'https://checkout.stripe.com/mock',
      message: 'Stripe integration pending - this is a placeholder response',
    };
  }

  /**
   * Create Stripe customer portal session
   * Allows users to manage their subscription, payment methods, billing history
   */
  async createCustomerPortalSession(userId: string, workspaceId: string) {
    // Verify user is admin or owner
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!membership || (membership.role !== 'admin' && membership.role !== 'owner')) {
      throw new ForbiddenException('Only admins and owners can access billing portal');
    }

    // Get subscription with Stripe customer ID
    const subscription = await this.prisma.subscription.findFirst({
      where: { workspaceId },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!subscription || !subscription.stripeCustomerId) {
      throw new BadRequestException('No Stripe customer found for this workspace');
    }

    // In a real implementation, you would create a Stripe portal session
    this.logger.log(
      `Would create Stripe portal session for customer ${subscription.stripeCustomerId}`,
    );

    return {
      url: 'https://billing.stripe.com/mock',
      message: 'Stripe integration pending - this is a placeholder response',
    };
  }

  /**
   * Cancel subscription at end of period
   */
  async cancelSubscription(userId: string, workspaceId: string) {
    // Verify user is owner
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace || workspace.ownerUserId !== userId) {
      throw new ForbiddenException('Only workspace owners can cancel subscriptions');
    }

    const subscription = await this.prisma.subscription.findFirst({
      where: { workspaceId, status: 'active' },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }

    // Update subscription to cancel at period end
    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: true,
      },
    });

    // In a real implementation, also cancel in Stripe

    this.logger.log(`Subscription ${subscription.id} will cancel at period end`);

    return {
      success: true,
      message: 'Subscription will be cancelled at the end of the current billing period',
      currentPeriodEnd: subscription.currentPeriodEnd,
    };
  }

  /**
   * Reactivate a cancelled subscription
   */
  async reactivateSubscription(userId: string, workspaceId: string) {
    // Verify user is owner
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace || workspace.ownerUserId !== userId) {
      throw new ForbiddenException('Only workspace owners can reactivate subscriptions');
    }

    const subscription = await this.prisma.subscription.findFirst({
      where: {
        workspaceId,
        cancelAtPeriodEnd: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!subscription) {
      throw new NotFoundException('No cancelled subscription found to reactivate');
    }

    // Reactivate subscription
    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: false,
      },
    });

    // In a real implementation, also reactivate in Stripe

    this.logger.log(`Subscription ${subscription.id} reactivated`);

    return {
      success: true,
      message: 'Subscription reactivated successfully',
    };
  }

  /**
   * Helper: Check if user has access to workspace
   */
  private async checkWorkspaceAccess(userId: string, workspaceId: string) {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this workspace');
    }
  }
}
