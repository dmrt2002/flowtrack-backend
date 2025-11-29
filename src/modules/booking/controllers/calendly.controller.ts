import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Body,
  Param,
  Headers,
  UseGuards,
  Req,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { CalendlyService } from '../services/calendly.service';
import { OAuthStateManagerService } from '../services/oauth-state-manager.service';
import { UnifiedAuthGuard } from '../../../auth/guards/unified-auth.guard';
import type { Response } from 'express';

@Controller('calendly')
export class CalendlyController {
  constructor(
    private calendlyService: CalendlyService,
    private oauthStateManager: OAuthStateManagerService,
  ) {}

  /**
   * Initiate Calendly OAuth flow
   *
   * WORKAROUND FOR CALENDLY STATE PARAMETER ISSUE:
   * Calendly's OAuth implementation does not reliably return the state parameter.
   * To work around this, we:
   * 1. Store (userId → workspaceId) mapping before redirecting to Calendly
   * 2. Pass userId in the state parameter instead of workspaceId
   * 3. Retrieve workspaceId in callback using userId from state
   */
  @Get('oauth/authorize')
  @UseGuards(UnifiedAuthGuard)
  authorize(
    @Query('workspaceId') workspaceId: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const userId = req.user?.id;  // Changed from userId to id

    console.log(
      'Calendly OAuth authorize - userId:',
      userId,
      'user object:',
      req.user,
      'workspaceId:',
      workspaceId,
    );

    if (!userId) {
      console.error('Calendly OAuth authorize: Missing userId from auth');
      return res.redirect(
        `${process.env.FRONTEND_URL}/onboarding/integrations?calendly=error&reason=missing_user`,
      );
    }

    if (!workspaceId) {
      console.error('Calendly OAuth authorize: Missing workspaceId parameter');
      return res.redirect(
        `${process.env.FRONTEND_URL}/onboarding/integrations?calendly=error&reason=missing_workspace_init`,
      );
    }

    // Store workspaceId for this user's OAuth flow
    this.oauthStateManager.storeState(userId, workspaceId);

    // Generate auth URL with userId in state (not workspaceId)
    const authUrl = this.calendlyService.getAuthorizationUrl(userId);
    console.log('Calendly OAuth authorize - redirecting to:', authUrl);
    return res.redirect(authUrl);
  }

  /**
   * Handle Calendly OAuth callback
   *
   * WORKAROUND FOR CALENDLY STATE PARAMETER ISSUE:
   * Retrieve workspaceId from our state manager using userId from state parameter.
   * This works even if Calendly doesn't return the state parameter.
   */
  @Get('oauth/callback')
  async callback(
    @Query('code') code: string,
    @Query('state') userId: string,
    @Res() res: Response,
  ) {
    try {
      console.log('Calendly OAuth callback - code:', code, 'state (userId):', userId);

      // Validate code parameter
      if (!code) {
        console.error('Calendly OAuth callback: Missing code parameter');
        return res.redirect(
          `${process.env.FRONTEND_URL}/onboarding/integrations?calendly=error&reason=missing_code`,
        );
      }

      // Retrieve workspaceId from state manager
      let workspaceId: string | null = null;

      if (userId) {
        // Attempt to retrieve using state parameter
        workspaceId = this.oauthStateManager.retrieveState(userId);
        console.log(
          'Calendly OAuth callback - Retrieved workspaceId from state manager:',
          workspaceId,
        );
      } else {
        console.warn(
          'Calendly OAuth callback: No state parameter returned by Calendly',
        );
      }

      // If we still don't have workspaceId, return error
      if (!workspaceId) {
        console.error(
          'Calendly OAuth callback: Unable to retrieve workspaceId. State expired or missing.',
        );
        return res.redirect(
          `${process.env.FRONTEND_URL}/onboarding/integrations?calendly=error&reason=state_expired`,
        );
      }

      // Exchange code for tokens
      const { accessToken, refreshToken, expiresAt, organization, owner } =
        await this.calendlyService.exchangeCodeForTokens(code, workspaceId);

      // Detect plan type
      const planType = await this.calendlyService.detectPlanType(
        accessToken,
        organization,
      );

      // Save credentials
      await this.calendlyService.saveCredentials(
        userId,
        workspaceId,
        accessToken,
        refreshToken,
        expiresAt,
        organization,
        owner,
        planType,
      );

      // Redirect to success page
      return res.redirect(
        `${process.env.FRONTEND_URL}/onboarding/integrations?calendly=success&plan=${planType}`,
      );
    } catch (error: any) {
      console.error('Calendly OAuth callback error:', error);
      return res.redirect(
        `${process.env.FRONTEND_URL}/onboarding/integrations?calendly=error`,
      );
    }
  }

  /**
   * Receive Calendly webhooks
   */
  @Post('webhooks/:credentialId')
  async webhook(
    @Param('credentialId') credentialId: string,
    @Headers('calendly-webhook-signature') signature: string,
    @Body() payload: any,
  ) {
    return this.calendlyService.processWebhookEvent(
      credentialId,
      signature,
      payload,
    );
  }

  /**
   * Manually trigger polling for FREE users (for testing)
   */
  @Post('poll/:credentialId')
  @UseGuards(UnifiedAuthGuard)
  async poll(@Param('credentialId') credentialId: string) {
    return this.calendlyService.pollEvents(credentialId);
  }

  /**
   * Get Calendly connection status for a workspace
   */
  @Get('connection/:workspaceId')
  @UseGuards(UnifiedAuthGuard)
  async getConnectionStatus(@Param('workspaceId') workspaceId: string) {
    const credential = await this.calendlyService['prisma'].oAuthCredential.findFirst({
      where: {
        workspaceId,
        providerType: 'CALENDLY',
        isActive: true,
      },
      select: {
        id: true,
        providerEmail: true,
        providerPlan: true,
        webhookEnabled: true,
        pollingEnabled: true,
      },
    });

    if (!credential) {
      return {
        success: true,
        data: {
          connected: false,
        },
      };
    }

    return {
      success: true,
      data: {
        connected: true,
        email: credential.providerEmail,
        plan: credential.providerPlan,
        webhookEnabled: credential.webhookEnabled,
        pollingEnabled: credential.pollingEnabled,
      },
    };
  }

  /**
   * Disconnect Calendly for a workspace
   */
  @Delete('connection/:workspaceId')
  @UseGuards(UnifiedAuthGuard)
  async disconnect(@Param('workspaceId') workspaceId: string) {
    await this.calendlyService['prisma'].oAuthCredential.updateMany({
      where: {
        workspaceId,
        providerType: 'CALENDLY',
      },
      data: {
        isActive: false,
      },
    });

    return {
      success: true,
      message: 'Calendly disconnected',
    };
  }
}
