import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { createHash, randomBytes } from 'crypto';

export interface JwtPayload {
  userId: string;
  email: string;
}

export interface RefreshTokenData {
  id: string;
  token: string;
  expiresAt: Date;
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  /**
   * Generate JWT access token (15 minutes)
   */
  generateAccessToken(userId: string, email: string): string {
    const payload: JwtPayload = { userId, email };
    return this.jwtService.sign(payload);
  }

  /**
   * Generate refresh token and store in database
   */
  async generateRefreshToken(
    userId: string,
    ipAddress: string | null,
    userAgent: string | null,
  ): Promise<RefreshTokenData> {
    // Generate cryptographically random token
    const rawToken = randomBytes(32).toString('hex');

    // Hash token for storage (SHA-256)
    const hashedToken = createHash('sha256').update(rawToken).digest('hex');

    // Calculate expiry (7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Store in database
    const refreshToken = await this.prisma.refreshToken.create({
      data: {
        userId,
        token: hashedToken,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    return {
      id: refreshToken.id,
      token: rawToken, // Return raw token to client
      expiresAt: refreshToken.expiresAt,
    };
  }

  /**
   * Verify and retrieve refresh token
   */
  async verifyRefreshToken(rawToken: string): Promise<{ userId: string }> {
    // Hash incoming token
    const hashedToken = createHash('sha256').update(rawToken).digest('hex');

    // Find token in database
    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: { token: hashedToken },
      include: { user: true },
    });

    if (!refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (refreshToken.isRevoked) {
      this.logger.warn(
        `Revoked refresh token used: ${refreshToken.id} by user: ${refreshToken.userId}`,
      );
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (new Date() > refreshToken.expiresAt) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    return { userId: refreshToken.userId };
  }

  /**
   * Rotate refresh token (revoke old, create new)
   * Used on each token refresh for security
   */
  async rotateRefreshToken(
    oldRawToken: string,
    ipAddress: string | null,
    userAgent: string | null,
  ): Promise<RefreshTokenData> {
    // Verify old token
    const { userId } = await this.verifyRefreshToken(oldRawToken);

    // Revoke old token
    const hashedOldToken = createHash('sha256')
      .update(oldRawToken)
      .digest('hex');
    await this.prisma.refreshToken.update({
      where: { token: hashedOldToken },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });

    // Generate new token
    return this.generateRefreshToken(userId, ipAddress, userAgent);
  }

  /**
   * Revoke a specific refresh token
   */
  async revokeRefreshToken(rawToken: string): Promise<void> {
    const hashedToken = createHash('sha256').update(rawToken).digest('hex');

    await this.prisma.refreshToken.updateMany({
      where: { token: hashedToken },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });
  }

  /**
   * Revoke all refresh tokens for a user (logout all devices)
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });

    this.logger.log(`Revoked all refresh tokens for user: ${userId}`);
  }

  /**
   * Generate password reset token
   */
  async generatePasswordResetToken(userId: string): Promise<string> {
    const token = randomBytes(32).toString('hex');

    // Set expiry to 1 hour
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await this.prisma.passwordResetToken.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });

    return token;
  }

  /**
   * Verify password reset token
   */
  async verifyPasswordResetToken(token: string): Promise<{ userId: string }> {
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken) {
      throw new UnauthorizedException('Invalid password reset token');
    }

    if (resetToken.isUsed) {
      throw new UnauthorizedException(
        'Password reset token has already been used',
      );
    }

    if (new Date() > resetToken.expiresAt) {
      throw new UnauthorizedException('Password reset token has expired');
    }

    return { userId: resetToken.userId };
  }

  /**
   * Mark password reset token as used
   */
  async markPasswordResetTokenAsUsed(token: string): Promise<void> {
    await this.prisma.passwordResetToken.update({
      where: { token },
      data: {
        isUsed: true,
        usedAt: new Date(),
      },
    });
  }

  /**
   * Generate email verification token
   */
  generateEmailVerificationToken(): string {
    return randomBytes(32).toString('hex');
  }
}
