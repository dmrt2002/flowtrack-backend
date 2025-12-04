import { Controller, Get, Param, Res, Req, HttpStatus, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { Request, Response } from 'express';
import { Public } from '../../../auth/decorators/public.decorator';
import { EmailTrackingService } from '../services/email-tracking.service';
import type { EmailTrackingAnalysisJob } from '../processors/email-tracking-analysis.processor';

@Controller('email/track')
export class EmailTrackingController {
  private readonly logger = new Logger(EmailTrackingController.name);

  constructor(
    private emailTrackingService: EmailTrackingService,
    @InjectQueue('email-tracking-analysis')
    private trackingQueue: Queue<EmailTrackingAnalysisJob>,
  ) {}

  /**
   * GET /api/v1/email/track/:token
   * Returns a 1x1 transparent PNG and enqueues email tracking analysis
   * This endpoint is publicly accessible (no auth guard)
   */
  @Public()
  @Get(':token')
  async trackEmailOpen(
    @Param('token') token: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    // Verify and decode the tracking token
    const payload = await this.emailTrackingService.verifyTrackingToken(token);

    // Extract client IP address (handling proxies)
    const clientIp = this.extractClientIp(req);

    // Extract user agent
    const userAgent = req.headers['user-agent'] || null;

    // Enqueue tracking analysis job (if token is valid)
    if (payload) {
      try {
        await this.trackingQueue.add('analyze-tracking-event', {
          clientIp,
          userAgent,
          sentAt: payload.sentAt,
          leadId: payload.leadId,
          workflowExecutionId: payload.workflowExecutionId,
          emailType: payload.emailType,
        });

        this.logger.debug(
          `Tracking job enqueued: leadId=${payload.leadId}, clientIp=${clientIp}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to enqueue tracking job: ${error.message}`,
          error.stack,
        );
        // Don't throw - tracking pixel should always return successfully
      }
    }

    // Always return the tracking pixel (even if token is invalid)
    // This prevents email clients from detecting tracking
    const pixel = this.emailTrackingService.getTrackingPixel();

    res
      .status(HttpStatus.OK)
      .type('image/png')
      .set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
      .set('Expires', '0')
      .set('Pragma', 'no-cache')
      .send(pixel);
  }

  /**
   * Extract client IP address from request, handling X-Forwarded-For header
   * @param req - Express request object
   * @returns Client IP address
   */
  private extractClientIp(req: Request): string {
    // Check X-Forwarded-For header (set by load balancers/proxies)
    const xForwardedFor = req.headers['x-forwarded-for'];

    if (xForwardedFor) {
      // X-Forwarded-For can contain comma-separated list of IPs
      // The first IP is the original client IP
      const ips = Array.isArray(xForwardedFor)
        ? xForwardedFor[0]
        : xForwardedFor;

      const clientIp = ips.split(',')[0].trim();

      this.logger.debug(
        `Client IP extracted from X-Forwarded-For: ${clientIp}`,
      );

      return clientIp;
    }

    // Fallback to connection IP (direct connection, no proxy)
    const connectionIp = req.ip || req.socket.remoteAddress || 'unknown';

    this.logger.debug(`Client IP from connection: ${connectionIp}`);

    return connectionIp;
  }
}
