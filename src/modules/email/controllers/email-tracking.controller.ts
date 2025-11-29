import { Controller, Get, Param, Res, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../../../auth/decorators/public.decorator';
import { EmailTrackingService } from '../services/email-tracking.service';

@Controller('email/track')
export class EmailTrackingController {
  constructor(private emailTrackingService: EmailTrackingService) {}

  /**
   * GET /api/v1/email/track/:token
   * Returns a 1x1 transparent PNG and records the email open event
   * This endpoint is publicly accessible (no auth guard)
   */
  @Public()
  @Get(':token')
  async trackEmailOpen(
    @Param('token') token: string,
    @Res() res: Response,
  ): Promise<void> {
    // Verify and decode the tracking token
    const payload = await this.emailTrackingService.verifyTrackingToken(token);

    // Record the email open event (if token is valid)
    if (payload) {
      // Fire and forget - don't wait for DB update
      this.emailTrackingService.recordEmailOpen(payload).catch(() => {
        // Silently fail - tracking pixel should always return successfully
      });
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
}
