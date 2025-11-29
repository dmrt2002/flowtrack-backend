import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class WebhookVerifierService {
  private readonly logger = new Logger(WebhookVerifierService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Verify Calendly webhook signature
   * Calendly uses HMAC-SHA256 with signing key
   */
  async verifyCalendlyWebhook(
    payload: string,
    signature: string,
    credentialId: string,
  ): Promise<boolean> {
    try {
      const credential = await this.prisma.oAuthCredential.findUnique({
        where: { id: credentialId },
        select: { webhookSigningKey: true },
      });

      if (!credential || !credential.webhookSigningKey) {
        this.logger.warn(`No webhook signing key found for credential ${credentialId}`);
        return false;
      }

      // Calendly signature format: "v1,<timestamp>,<signature>"
      // We only verify the signature part (the last component)
      const signatureParts = signature.split(',');
      if (signatureParts.length < 3) {
        this.logger.warn('Invalid Calendly signature format');
        return false;
      }

      const providedSignature = signatureParts[2];
      const timestamp = signatureParts[1];

      // Construct the signed payload: timestamp.payload
      const signedPayload = `${timestamp}.${payload}`;

      // Compute expected signature
      const expectedSignature = crypto
        .createHmac('sha256', credential.webhookSigningKey)
        .update(signedPayload)
        .digest('hex');

      // Compare signatures using constant-time comparison
      const isValid = crypto.timingSafeEqual(
        Buffer.from(providedSignature),
        Buffer.from(expectedSignature),
      );

      if (!isValid) {
        this.logger.warn(`Calendly webhook signature verification failed for credential ${credentialId}`);
      }

      return isValid;
    } catch (error) {
      this.logger.error('Error verifying Calendly webhook:', error);
      return false;
    }
  }


  /**
   * Check if webhook event has already been processed (idempotency)
   */
  async isEventProcessed(eventId: string, provider: string): Promise<boolean> {
    const key = `${provider}:${eventId}`;

    const existing = await this.prisma.webhookIdempotencyKey.findUnique({
      where: { key },
    });

    return !!existing;
  }

  /**
   * Mark webhook event as processed
   */
  async markEventProcessed(
    eventId: string,
    provider: string,
    metadata?: any,
  ): Promise<void> {
    const key = `${provider}:${eventId}`;

    await this.prisma.webhookIdempotencyKey.create({
      data: {
        key,
        metadata,
      },
    });
  }

  /**
   * Add failed webhook to dead letter queue
   */
  async addToDeadLetterQueue(
    provider: 'CALENDLY',
    eventId: string,
    eventType: string,
    errorMessage: string,
    errorStack: string | null,
    payload: any,
  ): Promise<void> {
    await this.prisma.webhookDeadLetterQueue.create({
      data: {
        provider,
        eventId,
        eventType,
        errorMessage,
        errorStack,
        payload,
        status: 'PENDING',
        retryCount: 0,
      },
    });

    this.logger.warn(
      `Added webhook to DLQ: ${provider} ${eventType} ${eventId} - ${errorMessage}`,
    );
  }

  /**
   * Get pending dead letter queue items for retry
   */
  async getPendingDLQItems(limit: number = 10) {
    return this.prisma.webhookDeadLetterQueue.findMany({
      where: {
        status: 'PENDING',
        retryCount: { lt: 3 }, // Max 3 retries
      },
      orderBy: {
        failedAt: 'asc',
      },
      take: limit,
    });
  }

  /**
   * Update dead letter queue item after retry
   */
  async updateDLQItem(
    id: string,
    status: 'RESOLVED' | 'FAILED',
    retryCount: number,
  ): Promise<void> {
    await this.prisma.webhookDeadLetterQueue.update({
      where: { id },
      data: {
        status,
        retryCount,
        resolvedAt: status === 'RESOLVED' ? new Date() : undefined,
      },
    });
  }

  /**
   * Update webhook health metrics for a credential
   */
  async updateWebhookHealth(
    credentialId: string,
    success: boolean,
  ): Promise<void> {
    const credential = await this.prisma.oAuthCredential.findUnique({
      where: { id: credentialId },
      select: { webhookFailedAttempts: true },
    });

    if (!credential) {
      return;
    }

    if (success) {
      // Reset failed attempts on success
      await this.prisma.oAuthCredential.update({
        where: { id: credentialId },
        data: {
          webhookFailedAttempts: 0,
          webhookLastVerifiedAt: new Date(),
        },
      });
    } else {
      // Increment failed attempts
      const newFailedAttempts = credential.webhookFailedAttempts + 1;

      await this.prisma.oAuthCredential.update({
        where: { id: credentialId },
        data: {
          webhookFailedAttempts: newFailedAttempts,
          // Disable webhook if too many failures (threshold: 10)
          webhookEnabled: newFailedAttempts < 10,
        },
      });

      if (newFailedAttempts >= 10) {
        this.logger.error(
          `Webhook disabled for credential ${credentialId} due to too many failures`,
        );
      }
    }
  }

  /**
   * Clean up old idempotency keys (older than 7 days)
   */
  async cleanupOldIdempotencyKeys(): Promise<number> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const result = await this.prisma.webhookIdempotencyKey.deleteMany({
      where: {
        processedAt: {
          lt: sevenDaysAgo,
        },
      },
    });

    this.logger.log(`Cleaned up ${result.count} old idempotency keys`);
    return result.count;
  }
}
