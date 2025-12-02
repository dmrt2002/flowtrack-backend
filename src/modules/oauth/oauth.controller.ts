import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
  HttpStatus,
  Param,
} from '@nestjs/common';
import type { Response } from 'express';
import { OAuthService } from './oauth.service';
import { UnifiedAuthGuard } from '../../auth/guards/unified-auth.guard';
import { User } from '../../auth/decorators/user.decorator';
import { ConfigService } from '@nestjs/config';

@Controller('oauth')
export class OAuthController {
  constructor(
    private readonly oauthService: OAuthService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Initiate Gmail OAuth flow
   * GET /api/v1/oauth/gmail/initiate?workspaceId=xxx (optional)
   * If workspaceId is provided, redirects to Google OAuth (for Settings page)
   * If not, returns JSON with authUrl (for onboarding popup flow)
   */
  @Get('gmail/initiate')
  @UseGuards(UnifiedAuthGuard)
  initiateGmailOAuth(
    @User() user: any,
    @Query('workspaceId') workspaceId: string,
    @Res() res: Response,
  ) {
    const authUrl = this.oauthService.getGmailAuthUrl(user.id);

    // Redirect-based flow (Settings page)
    if (workspaceId) {
      // Store workspaceId for later retrieval in callback
      this.oauthService.storeOAuthState(user.id, workspaceId);
      return res.redirect(authUrl);
    }

    // Popup-based flow (Onboarding)
    return res.json({
      success: true,
      message: 'Gmail OAuth URL generated',
      data: {
        authUrl,
      },
    });
  }

  /**
   * Handle Gmail OAuth callback
   * GET /api/v1/oauth/gmail/callback?code=xxx&state=xxx
   * Supports both redirect (Settings) and popup (Onboarding) flows
   */
  @Get('gmail/callback')
  @UseGuards(UnifiedAuthGuard)
  async handleGmailCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @User() user: any,
    @Res() res: Response,
  ) {
    try {
      if (!code) {
        return this.sendPopupError(
          res,
          'No authorization code provided',
        );
      }

      // Exchange code for tokens
      const { accessToken, refreshToken, expiresAt, email } =
        await this.oauthService.exchangeCodeForTokens(code);

      // Validate email exists
      if (!email) {
        return this.sendPopupError(
          res,
          'Failed to retrieve email from Google account',
        );
      }

      // Check if this is redirect flow (workspaceId stored in state manager)
      const workspaceId = this.oauthService.retrieveOAuthState(state || user.id);

      // Save credentials to database
      await this.oauthService.saveGmailCredentials(
        user.id,
        email,
        accessToken,
        refreshToken,
        expiresAt,
        workspaceId || undefined,
      );

      // Redirect flow (Settings page)
      if (workspaceId) {
        const frontendUrl = this.configService.get<string>('FRONTEND_URL');
        return res.redirect(
          `${frontendUrl}/settings?gmail=success&email=${encodeURIComponent(email)}`,
        );
      }

      // Popup flow (Onboarding)
      return res.status(HttpStatus.OK).send(`
        <html>
          <body>
            <h2>Gmail Connected Successfully!</h2>
            <p>You can close this window now.</p>
            <script>
              window.opener.postMessage({
                type: 'GMAIL_OAUTH_SUCCESS',
                email: '${email}'
              }, window.location.origin);
              setTimeout(() => window.close(), 1500);
            </script>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('Gmail OAuth callback error:', error);
      return this.sendPopupError(
        res,
        'Failed to authenticate with Gmail',
      );
    }
  }

  /**
   * Get Gmail connection status
   * GET /api/v1/oauth/gmail/connection/:workspaceId
   */
  @Get('gmail/connection/:workspaceId')
  @UseGuards(UnifiedAuthGuard)
  async getGmailConnectionStatus(
    @Param('workspaceId') workspaceId: string,
    @User() user: any,
  ) {
    const connection = await this.oauthService.getGmailConnectionStatus(
      workspaceId,
    );

    return {
      success: true,
      data: connection,
    };
  }

  /**
   * Helper method to send error response for popup flow
   */
  private sendPopupError(res: Response, errorMessage: string) {
    return res.status(HttpStatus.BAD_REQUEST).send(`
      <html>
        <body>
          <h2>Failed to Connect Gmail</h2>
          <p>${errorMessage}</p>
          <script>
            window.opener.postMessage({
              type: 'GMAIL_OAUTH_ERROR',
              error: '${errorMessage}'
            }, window.location.origin);
            setTimeout(() => window.close(), 2000);
          </script>
        </body>
      </html>
    `);
  }
}
