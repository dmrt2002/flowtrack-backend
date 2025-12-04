import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DnsResolverService } from '../services/dns-resolver.service';
import { TrackingClassifierService } from '../services/tracking-classifier.service';
import { EmailTrackingService } from '../services/email-tracking.service';

/**
 * Job payload for email tracking analysis
 */
export interface EmailTrackingAnalysisJob {
  clientIp: string;
  userAgent: string | null;
  sentAt: number; // Unix timestamp in milliseconds
  leadId: string;
  workflowExecutionId: string;
  emailType: string;
}

/**
 * EmailTrackingAnalysisProcessor
 *
 * Background processor for analyzing email tracking events.
 * Performs DNS lookup, classification, and database updates asynchronously.
 */
@Processor('email-tracking-analysis', {
  concurrency: 5, // Process up to 5 jobs concurrently
})
export class EmailTrackingAnalysisProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailTrackingAnalysisProcessor.name);

  constructor(
    private readonly dnsResolver: DnsResolverService,
    private readonly classifier: TrackingClassifierService,
    private readonly emailTracking: EmailTrackingService,
  ) {
    super();
  }

  async process(job: Job<EmailTrackingAnalysisJob>): Promise<void> {
    const { clientIp, userAgent, sentAt, leadId, workflowExecutionId, emailType } =
      job.data;

    this.logger.debug(
      `Processing tracking analysis job: leadId=${leadId}, clientIp=${clientIp}`,
    );

    try {
      // Step 1: Find the SentEmail record
      const sentEmail = await this.emailTracking.findSentEmailByPayload({
        leadId,
        workflowExecutionId,
        emailType: emailType as 'welcome' | 'thank_you' | 'follow_up',
        sentAt,
      });

      if (!sentEmail) {
        this.logger.warn(
          `SentEmail not found for tracking event: leadId=${leadId}, executionId=${workflowExecutionId}`,
        );
        return;
      }

      // Step 2: Perform DNS reverse lookup (with caching)
      const { hostname, isAppleProxy } = await this.dnsResolver.reverseLookup(
        clientIp,
      );

      this.logger.debug(
        `DNS lookup result: ip=${clientIp}, hostname=${hostname}, isApple=${isAppleProxy}`,
      );

      // Step 3: Classify the tracking event
      const openedAt = Date.now();
      const sentAtTimestamp = new Date(sentEmail.sentAt).getTime();

      const { classification, timeDeltaSeconds } = this.classifier.classify(
        isAppleProxy,
        sentAtTimestamp,
        openedAt,
      );

      this.logger.log(
        `Email tracking classified: sentEmailId=${sentEmail.id}, classification=${classification}, timeDelta=${timeDeltaSeconds}s`,
      );

      // Step 4: Create tracking event record
      await this.emailTracking.createTrackingEvent({
        sentEmailId: sentEmail.id,
        workspaceId: sentEmail.workspaceId,
        sentAt: sentEmail.sentAt,
        openedAt: new Date(openedAt),
        timeDeltaSeconds,
        clientIp,
        resolvedHostname: hostname,
        userAgent,
        isAppleProxy,
        classification,
        metadata: {
          jobId: job.id,
          processedAt: new Date().toISOString(),
        },
      });

      // Step 5: Update SentEmail counters
      await this.emailTracking.updateSentEmailCounters(
        sentEmail.id,
        classification,
        new Date(openedAt),
      );

      // Step 6: Update legacy recordEmailOpen for workflow execution
      await this.emailTracking.recordEmailOpen({
        leadId,
        workflowExecutionId,
        emailType: emailType as 'welcome' | 'thank_you' | 'follow_up',
        sentAt,
      });

      this.logger.log(
        `Email tracking analysis completed: sentEmailId=${sentEmail.id}, classification=${classification}`,
      );
    } catch (error) {
      this.logger.error(
        `Email tracking analysis failed: ${error.message}`,
        error.stack,
      );
      throw error; // Throw to trigger Bull retry mechanism
    }
  }
}
