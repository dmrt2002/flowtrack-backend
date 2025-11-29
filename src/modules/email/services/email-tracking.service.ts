import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../prisma/prisma.service';
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
}
