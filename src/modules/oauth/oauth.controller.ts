import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { OAuthService } from './oauth.service';
import { UnifiedAuthGuard } from '../../auth/guards/unified-auth.guard';
import { User } from '../../auth/decorators/user.decorator';

@Controller('oauth')
export class OAuthController {
  constructor(private readonly oauthService: OAuthService) {}

  /**
   * Initiate Gmail OAuth flow
   * GET /api/v1/oauth/gmail/initiate
   */
  @Get('gmail/initiate')
  @UseGuards(UnifiedAuthGuard)
  initiateGmailOAuth(@User() user: any) {
    const authUrl = this.oauthService.getGmailAuthUrl();

    return {
      success: true,
      message: 'Gmail OAuth URL generated',
      data: {
        authUrl,
      },
    };
  }

  /**
   * Handle Gmail OAuth callback
   * GET /api/v1/oauth/gmail/callback?code=xxx&state=xxx
   */
  @Get('gmail/callback')
  @UseGuards(UnifiedAuthGuard)
  async handleGmailCallback(
    @Query('code') code: string,
    @User() user: any,
    @Res() res: Response,
  ) {
    try {
      if (!code) {
        return res.status(HttpStatus.BAD_REQUEST).send(`
          <html>
            <body>
              <script>
                window.opener.postMessage({
                  type: 'GMAIL_OAUTH_ERROR',
                  error: 'No authorization code provided'
                }, window.location.origin);
                window.close();
              </script>
            </body>
          </html>
        `);
      }

      // Exchange code for tokens
      const { accessToken, refreshToken, expiresAt, email } =
        await this.oauthService.exchangeCodeForTokens(code);

      // Validate email exists
      if (!email) {
        return res.status(HttpStatus.BAD_REQUEST).send(`
          <html>
            <body>
              <script>
                window.opener.postMessage({
                  type: 'GMAIL_OAUTH_ERROR',
                  error: 'Failed to retrieve email from Google account'
                }, window.location.origin);
                window.close();
              </script>
            </body>
          </html>
        `);
      }

      // Save credentials to database (service will fetch workspace)
      await this.oauthService.saveGmailCredentials(
        user.id,
        email,
        accessToken,
        refreshToken,
        expiresAt,
      );

      // Send success message to parent window and close popup
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
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(`
        <html>
          <body>
            <h2>Failed to Connect Gmail</h2>
            <p>Please try again.</p>
            <script>
              window.opener.postMessage({
                type: 'GMAIL_OAUTH_ERROR',
                error: 'Failed to authenticate with Gmail'
              }, window.location.origin);
              setTimeout(() => window.close(), 2000);
            </script>
          </body>
        </html>
      `);
    }
  }
}
