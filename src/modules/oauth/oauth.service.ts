import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { google } from 'googleapis';
import axios from 'axios';

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);
  private oauth2Client: any;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    // Initialize Google OAuth2 client
    this.oauth2Client = new google.auth.OAuth2(
      this.config.get('GOOGLE_CLIENT_ID'),
      this.config.get('GOOGLE_CLIENT_SECRET'),
      this.config.get('GOOGLE_REDIRECT_URI'),
    );
  }

  /**
   * Generate Google OAuth URL for Gmail access
   */
  getGmailAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/calendar', // Calendar access for Google Meet
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // Force consent to get refresh token
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);

      // Get user email from Google
      const oauth2 = google.oauth2({
        auth: this.oauth2Client,
        version: 'v2',
      });

      const { data } = await oauth2.userinfo.get();

      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : null,
        email: data.email,
      };
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      throw new UnauthorizedException('Failed to authenticate with Google');
    }
  }

  /**
   * Save OAuth credentials to database
   */
  async saveGmailCredentials(
    userId: string,
    email: string,
    accessToken: string,
    refreshToken: string | null | undefined,
    expiresAt: Date | null,
  ) {
    // Get user's workspace
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        ownedWorkspaces: true,
        workspaceMemberships: {
          include: {
            workspace: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const workspace =
      user.ownedWorkspaces[0] ||
      user.workspaceMemberships[0]?.workspace ||
      null;

    if (!workspace) {
      throw new Error('No workspace found for user');
    }

    // Check if credential already exists for this workspace
    const existingCredential = await this.prisma.oAuthCredential.findFirst({
      where: {
        workspaceId: workspace.id,
        providerType: 'GOOGLE_EMAIL',
      },
    });

    if (existingCredential) {
      // Update existing credential
      return this.prisma.oAuthCredential.update({
        where: { id: existingCredential.id },
        data: {
          providerEmail: email,
          accessToken,
          refreshToken: refreshToken || null,
          expiresAt,
          isActive: true,
        },
      });
    } else {
      // Create new credential
      return this.prisma.oAuthCredential.create({
        data: {
          userId,
          workspaceId: workspace.id,
          providerType: 'GOOGLE_EMAIL',
          providerEmail: email,
          accessToken,
          refreshToken: refreshToken || null,
          expiresAt,
          isActive: true,
        },
      });
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string) {
    try {
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();

      return {
        accessToken: credentials.access_token,
        expiresAt: credentials.expiry_date
          ? new Date(credentials.expiry_date)
          : null,
      };
    } catch (error) {
      console.error('Error refreshing access token:', error);
      throw new UnauthorizedException('Failed to refresh access token');
    }
  }

  /**
   * Get active Gmail credentials for a workspace
   * Returns null if Gmail not connected (optional integration)
   */
  async getGmailCredentials(workspaceId: string) {
    const credential = await this.prisma.oAuthCredential.findFirst({
      where: {
        workspaceId,
        providerType: 'GOOGLE_EMAIL',
        isActive: true,
      },
    });

    if (!credential) {
      return null; // Gmail is optional, return null instead of throwing
    }

    // Check if token is expired
    if (credential.expiresAt && credential.expiresAt < new Date()) {
      // Token expired, refresh it
      if (!credential.refreshToken) {
        throw new UnauthorizedException(
          'Gmail token expired and no refresh token available',
        );
      }

      const { accessToken, expiresAt } = await this.refreshAccessToken(
        credential.refreshToken,
      );

      // Update credential in database
      await this.prisma.oAuthCredential.update({
        where: { id: credential.id },
        data: {
          accessToken,
          expiresAt,
        },
      });

      return {
        ...credential,
        accessToken,
        expiresAt,
      };
    }

    return credential;
  }

  /**
   * Get email provider configuration for a workspace
   * Returns Gmail credentials if connected, otherwise returns system email config
   */
  async getEmailProvider(workspaceId: string) {
    const gmailCredentials = await this.getGmailCredentials(workspaceId);

    if (gmailCredentials) {
      return {
        type: 'GMAIL' as const,
        credentials: gmailCredentials,
      };
    }

    // Fallback to system email configuration
    return {
      type: 'SYSTEM' as const,
      config: {
        host: this.config.get('SMTP_HOST'),
        port: parseInt(this.config.get('SMTP_PORT') || '587'),
        secure: this.config.get('SMTP_PORT') === '465',
        auth: {
          user: this.config.get('SMTP_USER'),
          pass: this.config.get('SMTP_PASS'),
        },
        from: {
          email: this.config.get('SMTP_FROM_EMAIL') || 'noreply@flowtrack.app',
          name: this.config.get('SMTP_FROM_NAME') || 'FlowTrack',
        },
      },
    };
  }

  /**
   * Save Calendly link for workspace
   */
  async saveCalendlyLink(userId: string, workspaceId: string, calendlyLink: string) {
    // Check if Calendly credential already exists
    const existingCredential = await this.prisma.oAuthCredential.findFirst({
      where: {
        workspaceId,
        providerType: 'CALENDLY',
      },
    });

    if (existingCredential) {
      // Update existing credential - store link in accessToken field
      return this.prisma.oAuthCredential.update({
        where: { id: existingCredential.id },
        data: {
          accessToken: calendlyLink,
          isActive: true,
        },
      });
    } else {
      // Create new credential
      return this.prisma.oAuthCredential.create({
        data: {
          userId,
          workspaceId,
          providerType: 'CALENDLY',
          accessToken: calendlyLink, // Store link in accessToken field
          isActive: true,
        },
      });
    }
  }

  /**
   * Get Calendly link for workspace
   */
  async getCalendlyLink(workspaceId: string): Promise<string | null> {
    const credential = await this.prisma.oAuthCredential.findFirst({
      where: {
        workspaceId,
        providerType: 'CALENDLY',
        isActive: true,
      },
    });

    if (!credential) {
      return null;
    }

    // Check if scheduling URL is cached in metadata
    const metadata = credential.metadata as any;
    if (metadata?.schedulingUrl) {
      return metadata.schedulingUrl;
    }

    // Not cached - fetch it now with auto-refreshed token
    this.logger.log(
      `Scheduling URL not cached for workspace ${workspaceId}. Fetching from Calendly API...`,
    );

    try {
      let accessToken = credential.accessToken;

      // Check if token is expired
      const isExpired = credential.expiresAt
        ? credential.expiresAt < new Date()
        : false;

      // If expired, refresh it
      if (isExpired && credential.refreshToken) {
        this.logger.log(
          `Access token expired. Refreshing token for credential ${credential.id}...`,
        );

        const clientId = this.config.get<string>('CALENDLY_CLIENT_ID');
        const clientSecret = this.config.get<string>('CALENDLY_CLIENT_SECRET');

        if (!clientId || !clientSecret) {
          throw new Error('Calendly OAuth credentials not configured');
        }

        const refreshResponse = await axios.post(
          'https://auth.calendly.com/oauth/token',
          {
            grant_type: 'refresh_token',
            refresh_token: credential.refreshToken,
          },
          {
            auth: {
              username: clientId,
              password: clientSecret,
            },
            headers: {
              'Content-Type': 'application/json',
            },
          },
        );

        const { access_token, refresh_token, expires_in } =
          refreshResponse.data;

        // Update credential with new tokens
        await this.prisma.oAuthCredential.update({
          where: { id: credential.id },
          data: {
            accessToken: access_token,
            refreshToken: refresh_token || credential.refreshToken,
            expiresAt: new Date(Date.now() + expires_in * 1000),
          },
        });

        accessToken = access_token;
        this.logger.log(`Successfully refreshed token for credential ${credential.id}`);
      }

      // Fetch user info from Calendly
      const userResponse = await axios.get(
        'https://api.calendly.com/users/me',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const schedulingUrl =
        userResponse.data.resource.scheduling_url ||
        userResponse.data.resource.link;

      if (schedulingUrl) {
        // Cache it in metadata for future use
        await this.prisma.oAuthCredential.update({
          where: { id: credential.id },
          data: {
            metadata: {
              ...metadata,
              schedulingUrl,
            } as any,
          },
        });

        this.logger.log(
          `Successfully fetched and cached scheduling URL for workspace ${workspaceId}: ${schedulingUrl}`,
        );
        return schedulingUrl;
      }

      this.logger.warn(
        `No scheduling URL found in Calendly API response for workspace ${workspaceId}`,
      );
      return null;
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch Calendly scheduling URL for workspace ${workspaceId}: ${error.response?.data?.message || error.message}`,
      );
      return null;
    }
  }

  /**
   * Get calendar OAuth credentials for a workspace
   * Reuses Gmail credentials since they're from the same Google account
   */
  async getCalendarCredentials(workspaceId: string) {
    return this.getGmailCredentials(workspaceId);
  }
}
