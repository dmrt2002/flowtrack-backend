import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { UnifiedAuthGuard } from '../../../auth/guards/unified-auth.guard';
import { WebhookVerifierService } from '../services/webhook-verifier.service';
import { PollingService } from '../services/polling.service';
import { PollingQueueService } from '../services/polling-queue.service';
import { AttributionMatcherService } from '../services/attribution-matcher.service';
import { PrismaService } from '../../../prisma/prisma.service';

@Controller('booking/health')
@UseGuards(UnifiedAuthGuard)
export class BookingHealthController {
  constructor(
    private webhookVerifier: WebhookVerifierService,
    private pollingService: PollingService,
    private pollingQueue: PollingQueueService,
    private attributionMatcher: AttributionMatcherService,
    private prisma: PrismaService,
  ) {}

  /**
   * Get overall booking system health
   */
  @Get()
  async getHealth() {
    const [dlqPending, queueStats, recentPollingJobs] = await Promise.all([
      this.webhookVerifier.getPendingDLQItems(5),
      this.pollingQueue.getQueueStats(),
      this.prisma.bookingPollingJob.findMany({
        where: {
          status: 'RUNNING',
        },
        take: 10,
      }),
    ]);

    return {
      status: 'healthy',
      deadLetterQueue: {
        pendingCount: dlqPending.length,
        items: dlqPending,
      },
      pollingQueue: queueStats,
      runningPollingJobs: recentPollingJobs.length,
    };
  }

  /**
   * Get dead letter queue items
   */
  @Get('dlq')
  async getDeadLetterQueue() {
    const pending = await this.webhookVerifier.getPendingDLQItems(50);

    return {
      success: true,
      data: {
        pending,
        total: pending.length,
      },
    };
  }

  /**
   * Retry a dead letter queue item
   */
  @Post('dlq/:id/retry')
  async retryDLQItem(@Param('id') id: string) {
    const item = await this.prisma.webhookDeadLetterQueue.findUnique({
      where: { id },
    });

    if (!item) {
      return {
        success: false,
        message: 'DLQ item not found',
      };
    }

    // Increment retry count and set status to PENDING
    await this.prisma.webhookDeadLetterQueue.update({
      where: { id },
      data: {
        status: 'PENDING',
        retryCount: item.retryCount + 1,
      },
    });

    return {
      success: true,
      message: 'DLQ item queued for retry',
    };
  }

  /**
   * Mark DLQ item as resolved
   */
  @Post('dlq/:id/resolve')
  async resolveDLQItem(@Param('id') id: string) {
    const item = await this.prisma.webhookDeadLetterQueue.findUnique({
      where: { id },
    });

    if (!item) {
      return {
        success: false,
        message: 'DLQ item not found',
      };
    }

    await this.webhookVerifier.updateDLQItem(id, 'RESOLVED', item.retryCount);

    return {
      success: true,
      message: 'DLQ item marked as resolved',
    };
  }

  /**
   * Get polling statistics for a workspace
   */
  @Get('polling/:workspaceId')
  async getPollingStats(@Param('workspaceId') workspaceId: string) {
    const stats = await this.pollingService.getPollingStats(workspaceId);

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Get polling queue statistics
   */
  @Get('polling-queue/stats')
  async getPollingQueueStats() {
    const stats = await this.pollingQueue.getQueueStats();

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Get recent polling queue jobs
   */
  @Get('polling-queue/jobs')
  async getPollingQueueJobs() {
    const jobs = await this.pollingQueue.getRecentJobs(20);

    return {
      success: true,
      data: jobs,
    };
  }

  /**
   * Trigger manual polling (for testing/admin)
   */
  @Post('polling/trigger')
  async triggerManualPolling() {
    await this.pollingQueue.triggerManualPolling();

    return {
      success: true,
      message: 'Manual polling job triggered',
    };
  }

  /**
   * Get booking statistics for a workspace
   */
  @Get('stats/:workspaceId')
  async getBookingStats(@Param('workspaceId') workspaceId: string) {
    const stats = await this.attributionMatcher.getBookingStats(workspaceId);

    // Get recent bookings
    const recentBookings = await this.prisma.booking.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        lead: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    return {
      success: true,
      data: {
        stats,
        recentBookings,
      },
    };
  }

  /**
   * Get webhook health for all credentials in a workspace
   */
  @Get('webhooks/:workspaceId')
  async getWebhookHealth(@Param('workspaceId') workspaceId: string) {
    const credentials = await this.prisma.oAuthCredential.findMany({
      where: {
        workspaceId,
        providerType: 'CALENDLY',
      },
      select: {
        id: true,
        providerType: true,
        providerEmail: true,
        webhookEnabled: true,
        webhookFailedAttempts: true,
        webhookLastVerifiedAt: true,
        pollingEnabled: true,
        pollingLastRunAt: true,
        isActive: true,
      },
    });

    return {
      success: true,
      data: credentials,
    };
  }

  /**
   * Clean up old idempotency keys
   */
  @Post('cleanup/idempotency')
  async cleanupIdempotencyKeys() {
    const count = await this.webhookVerifier.cleanupOldIdempotencyKeys();

    return {
      success: true,
      message: `Cleaned up ${count} old idempotency keys`,
      count,
    };
  }

  /**
   * Clean up old polling jobs
   */
  @Post('cleanup/polling-jobs')
  async cleanupPollingJobs() {
    const count = await this.pollingService.cleanupOldPollingJobs();

    return {
      success: true,
      message: `Cleaned up ${count} old polling jobs`,
      count,
    };
  }

  /**
   * Clean up old queue jobs
   */
  @Post('cleanup/queue-jobs')
  async cleanupQueueJobs() {
    await this.pollingQueue.cleanupOldJobs();

    return {
      success: true,
      message: 'Queue jobs cleaned up',
    };
  }
}
