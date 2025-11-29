import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import axios from 'axios';

interface TokenRefreshResult {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
}

@Injectable()
export class TokenManagerService {
  private readonly logger = new Logger(TokenManagerService.name);
  private readonly tokenCache = new Map<string, { token: string; expiresAt: Date }>();

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  /**
   * Get valid access token for a credential, refreshing if necessary
   */
  async getValidAccessToken(credentialId: string): Promise<string> {
    // Check cache first
    const cached = this.tokenCache.get(credentialId);
    if (cached && cached.expiresAt > new Date(Date.now() + 5 * 60 * 1000)) {
      // Token valid for at least 5 more minutes
      return cached.token;
    }

    // Fetch credential from database
    const credential = await this.prisma.oAuthCredential.findUnique({
      where: { id: credentialId },
    });

    if (!credential) {
      throw new UnauthorizedException('OAuth credential not found');
    }

    if (!credential.isActive) {
      throw new UnauthorizedException('OAuth credential is inactive');
    }

    // Check if token is expired or about to expire (5 min buffer)
    const needsRefresh = credential.expiresAt
      ? credential.expiresAt < new Date(Date.now() + 5 * 60 * 1000)
      : false;

    if (needsRefresh && credential.refreshToken) {
      this.logger.log(`Refreshing token for credential ${credentialId} (${credential.providerType})`);

      try {
        const refreshed = await this.refreshToken(credential);

        // Update database
        await this.prisma.oAuthCredential.update({
          where: { id: credentialId },
          data: {
            accessToken: refreshed.accessToken,
            refreshToken: refreshed.refreshToken || credential.refreshToken,
            expiresAt: refreshed.expiresAt,
          },
        });

        // Update cache
        this.tokenCache.set(credentialId, {
          token: refreshed.accessToken,
          expiresAt: refreshed.expiresAt,
        });

        return refreshed.accessToken;
      } catch (error) {
        this.logger.error(`Failed to refresh token for credential ${credentialId}:`, error);

        // Mark credential as inactive if refresh fails
        await this.prisma.oAuthCredential.update({
          where: { id: credentialId },
          data: { isActive: false },
        });

        throw new UnauthorizedException('Failed to refresh access token');
      }
    }

    // Token is still valid
    const token = credential.accessToken || '';
    this.tokenCache.set(credentialId, {
      token,
      expiresAt: credential.expiresAt || new Date(Date.now() + 60 * 60 * 1000),
    });

    return token;
  }

  /**
   * Refresh OAuth token based on provider type
   */
  private async refreshToken(credential: any): Promise<TokenRefreshResult> {
    switch (credential.providerType) {
      case 'CALENDLY':
        return this.refreshCalendlyToken(credential);
      default:
        throw new Error(`Unsupported provider type: ${credential.providerType}`);
    }
  }

  /**
   * Refresh Calendly OAuth token
   */
  private async refreshCalendlyToken(credential: any): Promise<TokenRefreshResult> {
    const clientId = this.config.get('CALENDLY_CLIENT_ID');
    const clientSecret = this.config.get('CALENDLY_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new Error('Calendly OAuth credentials not configured');
    }

    try {
      const response = await axios.post(
        'https://auth.calendly.com/oauth/token',
        {
          grant_type: 'refresh_token',
          refresh_token: credential.refreshToken,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          auth: {
            username: clientId,
            password: clientSecret,
          },
        },
      );

      const { access_token, refresh_token, expires_in } = response.data;

      return {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: new Date(Date.now() + expires_in * 1000),
      };
    } catch (error: any) {
      this.logger.error('Calendly token refresh failed:', error.response?.data || error.message);
      throw new UnauthorizedException('Failed to refresh Calendly token');
    }
  }


  /**
   * Update API rate limit information for credential
   */
  async updateRateLimit(
    credentialId: string,
    remaining: number,
    resetAt: Date,
  ): Promise<void> {
    await this.prisma.oAuthCredential.update({
      where: { id: credentialId },
      data: {
        apiRateLimitRemaining: remaining,
        apiRateLimitResetAt: resetAt,
      },
    });
  }

  /**
   * Check if API rate limit allows for requests
   */
  async checkRateLimit(credentialId: string): Promise<boolean> {
    const credential = await this.prisma.oAuthCredential.findUnique({
      where: { id: credentialId },
      select: {
        apiRateLimitRemaining: true,
        apiRateLimitResetAt: true,
      },
    });

    if (!credential) {
      return false;
    }

    // If no rate limit data, assume we can make requests
    if (
      credential.apiRateLimitRemaining === null ||
      credential.apiRateLimitResetAt === null
    ) {
      return true;
    }

    // If rate limit has reset, allow requests
    if (credential.apiRateLimitResetAt < new Date()) {
      return true;
    }

    // Check if we have remaining requests
    return credential.apiRateLimitRemaining > 0;
  }

  /**
   * Clear token from cache (useful for testing or force refresh)
   */
  clearCache(credentialId: string): void {
    this.tokenCache.delete(credentialId);
  }

  /**
   * Clear all cached tokens
   */
  clearAllCache(): void {
    this.tokenCache.clear();
  }
}
