import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../prisma/prisma.service';
import { EmailTrackingClassification } from '@prisma/client';
import type { EmailTrackingPayload } from '../dto/email-tracking.dto';

@Injectable()
export class EmailTrackingService {
  private readonly logger = new Logger(EmailTrackingService.name);

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  /**
   * Generate a signed tracking token for email open tracking
   */
  generateTrackingToken(payload: EmailTrackingPayload): string {
    const secret = this.configService.get<string>('JWT_SECRET');

    // Create a JWT token with the tracking payload
    // Token expires in 90 days (reasonable time for email opens)
    const token = this.jwtService.sign(payload, {
      secret,
      expiresIn: '90d',
    });

    return token;
  }

  /**
   * Verify and decode a tracking token
   */
  async verifyTrackingToken(token: string): Promise<EmailTrackingPayload | null> {
    try {
      const secret = this.configService.get<string>('JWT_SECRET');

      const payload = this.jwtService.verify<EmailTrackingPayload>(token, {
        secret,
      });

      return payload;
    } catch (error) {
      this.logger.warn(`Invalid tracking token: ${error.message}`);
      return null;
    }
  }

  /**
   * Record email open event
   */
  async recordEmailOpen(payload: EmailTrackingPayload): Promise<void> {
    try {
      const { leadId, workflowExecutionId, emailType } = payload;

      // Update lead's lastEmailOpenedAt timestamp
      await this.prisma.lead.update({
        where: { id: leadId },
        data: {
          lastEmailOpenedAt: new Date(),
        },
      });

      // Update workflow execution metadata to track which emails were opened
      const execution = await this.prisma.workflowExecution.findUnique({
        where: { id: workflowExecutionId },
      });

      if (execution) {
        const outputData = (execution.outputData as any) || {};
        const emailOpens = outputData.emailOpens || {};

        // Record the email open event
        emailOpens[emailType] = {
          openedAt: new Date().toISOString(),
          openCount: (emailOpens[emailType]?.openCount || 0) + 1,
        };

        await this.prisma.workflowExecution.update({
          where: { id: workflowExecutionId },
          data: {
            outputData: {
              ...outputData,
              emailOpens,
            },
          },
        });
      }

      this.logger.log(
        `Email open tracked: leadId=${leadId}, emailType=${emailType}, executionId=${workflowExecutionId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to record email open: ${error.message}`, error.stack);
      // Don't throw - tracking pixel should always return successfully
    }
  }

  /**
   * Generate 1x1 transparent PNG as Buffer
   */
  getTrackingPixel(): Buffer {
    // 1x1 transparent PNG in base64
    const transparentPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64',
    );

    return transparentPng;
  }

  /**
   * Create a new email tracking event with MPP classification
   */
  async createTrackingEvent(data: {
    sentEmailId: string;
    workspaceId: string;
    sentAt: Date;
    openedAt: Date;
    timeDeltaSeconds: number;
    clientIp: string;
    resolvedHostname: string | null;
    userAgent: string | null;
    isAppleProxy: boolean;
    classification: EmailTrackingClassification;
    metadata?: any;
  }): Promise<void> {
    try {
      await this.prisma.emailTrackingEvent.create({
        data: {
          sentEmailId: data.sentEmailId,
          workspaceId: data.workspaceId,
          sentAt: data.sentAt,
          openedAt: data.openedAt,
          timeDeltaSeconds: data.timeDeltaSeconds,
          clientIp: data.clientIp,
          resolvedHostname: data.resolvedHostname,
          userAgent: data.userAgent,
          isAppleProxy: data.isAppleProxy,
          classification: data.classification,
          metadata: data.metadata || {},
        },
      });

      this.logger.log(
        `Tracking event created: sentEmailId=${data.sentEmailId}, classification=${data.classification}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create tracking event: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Update SentEmail counters based on classification
   */
  async updateSentEmailCounters(
    sentEmailId: string,
    classification: EmailTrackingClassification,
    openedAt: Date,
  ): Promise<void> {
    try {
      // Fetch current email to check if this is the first open
      const sentEmail = await this.prisma.sentEmail.findUnique({
        where: { id: sentEmailId },
        select: {
          openCount: true,
          firstOpenedAt: true,
          genuineOpenCount: true,
          botPrefetchCount: true,
          ambiguousOpenCount: true,
          directOpenCount: true,
        },
      });

      if (!sentEmail) {
        this.logger.warn(`SentEmail not found: ${sentEmailId}`);
        return;
      }

      // Determine which counter to increment
      const updateData: any = {
        openCount: { increment: 1 },
        lastOpenedAt: openedAt,
      };

      // Set firstOpenedAt if this is the first open
      if (!sentEmail.firstOpenedAt) {
        updateData.firstOpenedAt = openedAt;
      }

      // Increment the appropriate classification counter
      switch (classification) {
        case EmailTrackingClassification.GENUINE_OPEN:
          updateData.genuineOpenCount = { increment: 1 };
          break;
        case EmailTrackingClassification.BOT_PREFETCH:
          updateData.botPrefetchCount = { increment: 1 };
          break;
        case EmailTrackingClassification.AMBIGUOUS:
          updateData.ambiguousOpenCount = { increment: 1 };
          break;
        case EmailTrackingClassification.DIRECT_OPEN:
          updateData.directOpenCount = { increment: 1 };
          break;
      }

      await this.prisma.sentEmail.update({
        where: { id: sentEmailId },
        data: updateData,
      });

      this.logger.debug(
        `SentEmail counters updated: sentEmailId=${sentEmailId}, classification=${classification}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update SentEmail counters: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Find SentEmail by tracking payload
   */
  async findSentEmailByPayload(
    payload: EmailTrackingPayload,
  ): Promise<{ id: string; workspaceId: string; sentAt: Date } | null> {
    try {
      const sentEmail = await this.prisma.sentEmail.findFirst({
        where: {
          leadId: payload.leadId,
          workflowExecutionId: payload.workflowExecutionId,
          emailType: payload.emailType,
        },
        select: {
          id: true,
          workspaceId: true,
          sentAt: true,
        },
        orderBy: {
          sentAt: 'desc',
        },
      });

      return sentEmail;
    } catch (error) {
      this.logger.error(
        `Failed to find SentEmail: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }
}
