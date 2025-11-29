import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CalendlyService } from './calendly.service';
import { TokenManagerService } from './token-manager.service';

@Injectable()
export class PollingService {
  private readonly logger = new Logger(PollingService.name);

  constructor(
    private prisma: PrismaService,
    private calendlyService: CalendlyService,
    private tokenManager: TokenManagerService,
  ) {}

  /**
   * Poll all FREE Calendly accounts
   */
  async pollAllCalendlyFreeAccounts(): Promise<void> {
    this.logger.log('Starting Calendly FREE account polling');

    // Get all active credentials with polling enabled
    const credentials = await this.prisma.oAuthCredential.findMany({
      where: {
        providerType: 'CALENDLY',
        isActive: true,
        pollingEnabled: true,
        providerPlan: 'FREE',
      },
    });

    this.logger.log(`Found ${credentials.length} Calendly FREE accounts to poll`);

    for (const credential of credentials) {
      try {
        // Check rate limit before polling
        const canPoll = await this.tokenManager.checkRateLimit(credential.id);

        if (!canPoll) {
          this.logger.warn(
            `Rate limit reached for credential ${credential.id}, skipping`,
          );
          continue;
        }

        // Create polling job record
        const pollingJob = await this.prisma.bookingPollingJob.create({
          data: {
            oauthCredentialId: credential.id,
            status: 'RUNNING',
          },
        });

        const startTime = Date.now();

        try {
          // Poll events
          const result = await this.calendlyService.pollEvents(credential.id);

          const durationMs = Date.now() - startTime;

          // Update polling job as completed
          await this.prisma.bookingPollingJob.update({
            where: { id: pollingJob.id },
            data: {
              status: 'COMPLETED',
              completedAt: new Date(),
              eventsFetched: result.eventsFetched,
              eventsCreated: result.eventsCreated,
              eventsUpdated: result.eventsUpdated,
              durationMs,
            },
          });

          this.logger.log(
            `Polling completed for credential ${credential.id}: ${result.eventsCreated} created, ${result.eventsUpdated} updated`,
          );
        } catch (error: any) {
          const durationMs = Date.now() - startTime;

          // Update polling job as failed
          await this.prisma.bookingPollingJob.update({
            where: { id: pollingJob.id },
            data: {
              status: 'FAILED',
              completedAt: new Date(),
              errorMessage: error.message,
              errorDetails: {
                stack: error.stack,
                response: error.response?.data,
              },
              durationMs,
            },
          });

          this.logger.error(
            `Polling failed for credential ${credential.id}:`,
            error,
          );
        }

        // Add delay between polls to avoid rate limiting
        await this.delay(2000);
      } catch (error) {
        this.logger.error(
          `Error processing credential ${credential.id} for polling:`,
          error,
        );
      }
    }

    this.logger.log('Calendly FREE account polling completed');
  }

  /**
   * Get polling statistics for a workspace
   */
  async getPollingStats(workspaceId: string) {
    const credentials = await this.prisma.oAuthCredential.findMany({
      where: {
        workspaceId,
        providerType: 'CALENDLY',
        pollingEnabled: true,
      },
      include: {
        pollingJobs: {
          orderBy: {
            startedAt: 'desc',
          },
          take: 10,
        },
      },
    });

    return credentials.map((credential) => ({
      credentialId: credential.id,
      providerEmail: credential.providerEmail,
      pollingLastRunAt: credential.pollingLastRunAt,
      recentJobs: credential.pollingJobs,
    }));
  }

  /**
   * Get polling job details
   */
  async getPollingJob(jobId: string) {
    return this.prisma.bookingPollingJob.findUnique({
      where: { id: jobId },
      include: {
        oauthCredential: {
          select: {
            providerType: true,
            providerEmail: true,
            workspaceId: true,
          },
        },
      },
    });
  }

  /**
   * Get recent polling jobs for a credential
   */
  async getRecentPollingJobs(credentialId: string, limit: number = 20) {
    return this.prisma.bookingPollingJob.findMany({
      where: {
        oauthCredentialId: credentialId,
      },
      orderBy: {
        startedAt: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Cleanup old polling jobs (older than 30 days)
   */
  async cleanupOldPollingJobs(): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const result = await this.prisma.bookingPollingJob.deleteMany({
      where: {
        startedAt: {
          lt: thirtyDaysAgo,
        },
      },
    });

    this.logger.log(`Cleaned up ${result.count} old polling jobs`);
    return result.count;
  }

  /**
   * Helper: Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
