import {
  Injectable,
  Logger,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { EmailService } from './services/email.service';
import { RateLimitService } from './services/rate-limit.service';
import type { RegisterDto } from './dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private passwordService: PasswordService,
    private tokenService: TokenService,
    private emailService: EmailService,
    private rateLimitService: RateLimitService,
  ) {}

  /**
   * Register a new user with email/password (Native Auth)
   */
  async registerLocal(
    dto: RegisterDto,
    ipAddress: string,
    userAgent: string | null,
  ): Promise<{
    user: any;
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    message: string;
  }> {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const passwordHash = await this.passwordService.hashPassword(dto.password);

    // Generate email verification token
    const verificationToken =
      this.tokenService.generateEmailVerificationToken();
    const verificationExpiry = new Date();
    verificationExpiry.setHours(verificationExpiry.getHours() + 24); // 24 hours

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName || null,
        lastName: dto.lastName || null,
        authProvider: 'local',
        emailVerificationToken: verificationToken,
        emailVerificationExpiry: verificationExpiry,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        authProvider: true,
        createdAt: true,
      },
    });

    // Send verification email
    try {
      await this.emailService.sendVerificationEmail(
        user.email,
        verificationToken,
      );
    } catch (error) {
      this.logger.error(`Failed to send verification email: ${error.message}`);
    }

    // Generate JWT tokens for auto-login
    const tokens = await this.generateTokensForUser(
      user.id,
      user.email,
      ipAddress,
      userAgent,
    );

    this.logger.log(`New local user registered: ${user.id} (${user.email})`);

    return {
      user,
      ...tokens,
      message:
        'Registration successful. Please check your email to verify your account.',
    };
  }

  /**
   * Validate user credentials for local login
   * Called by LocalStrategy
   */
  async validateLocalUser(
    email: string,
    password: string,
    ipAddress: string,
    userAgent: string | null,
  ): Promise<any> {
    // Check rate limiting
    await this.rateLimitService.validateLoginAttempt(email, ipAddress);

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || user.authProvider !== 'local' || !user.passwordHash) {
      await this.rateLimitService.recordFailedLogin(
        email,
        ipAddress,
        userAgent,
        'invalid_credentials',
      );
      return null;
    }

    // Verify password
    const isPasswordValid = await this.passwordService.verifyPassword(
      user.passwordHash,
      password,
    );

    if (!isPasswordValid) {
      await this.rateLimitService.recordFailedLogin(
        email,
        ipAddress,
        userAgent,
        'invalid_password',
      );
      return null;
    }

    // Check email verification
    if (!user.emailVerifiedAt) {
      await this.rateLimitService.recordFailedLogin(
        email,
        ipAddress,
        userAgent,
        'email_not_verified',
      );
      throw new UnauthorizedException(
        'Email not verified. Please verify your email before logging in.',
      );
    }

    // Record successful login
    await this.rateLimitService.recordSuccessfulLogin(
      email,
      ipAddress,
      userAgent,
    );

    this.logger.log(`Successful login: ${user.id} (${email})`);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      authProvider: user.authProvider,
      hasCompletedOnboarding: user.hasCompletedOnboarding,
    };
  }

  /**
   * Generate tokens after successful login
   */
  async generateTokensForUser(
    userId: string,
    email: string,
    ipAddress: string,
    userAgent: string | null,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  }> {
    const accessToken = this.tokenService.generateAccessToken(userId, email);
    const refreshTokenData = await this.tokenService.generateRefreshToken(
      userId,
      ipAddress,
      userAgent,
    );

    return {
      accessToken,
      refreshToken: refreshTokenData.token,
      expiresAt: refreshTokenData.expiresAt,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshTokens(
    refreshToken: string,
    ipAddress: string,
    userAgent: string | null,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  }> {
    // Verify and rotate refresh token
    const newRefreshTokenData = await this.tokenService.rotateRefreshToken(
      refreshToken,
      ipAddress,
      userAgent,
    );

    // Get user for access token generation
    const { userId } = await this.tokenService.verifyRefreshToken(
      newRefreshTokenData.token,
    );
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const accessToken = this.tokenService.generateAccessToken(
      userId,
      user.email,
    );

    return {
      accessToken,
      refreshToken: newRefreshTokenData.token,
      expiresAt: newRefreshTokenData.expiresAt,
    };
  }

  /**
   * Request password reset
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    this.logger.log(`📧 Forgot password request received for: ${email}`);

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    // Don't reveal if user exists or not (security best practice)
    if (!user || user.authProvider !== 'local') {
      this.logger.warn(`⚠️ User not found or not local auth: ${email}`);
      return {
        message: 'If the email exists, a password reset link has been sent.',
      };
    }

    this.logger.log(`✅ User found: ${user.id}`);

    // Generate reset token
    const resetToken = await this.tokenService.generatePasswordResetToken(
      user.id,
    );

    this.logger.log(`🔑 Reset token generated for user: ${user.id}`);

    // Send reset email
    try {
      await this.emailService.sendPasswordResetEmail(email, resetToken);
      this.logger.log(`✉️ Reset email sent successfully to: ${email}`);
    } catch (error) {
      this.logger.error(
        `❌ Failed to send password reset email: ${error.message}`,
      );
      this.logger.error(error.stack);
    }

    this.logger.log(`✅ Password reset process completed for: ${email}`);

    return {
      message: 'If the email exists, a password reset link has been sent.',
    };
  }

  /**
   * Reset password using token
   */
  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    // Verify token
    const { userId } = await this.tokenService.verifyPasswordResetToken(token);

    // Hash new password
    const passwordHash = await this.passwordService.hashPassword(newPassword);

    // Update user password
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
      },
    });

    // Mark token as used
    await this.tokenService.markPasswordResetTokenAsUsed(token);

    // Revoke all refresh tokens (force re-login on all devices)
    await this.tokenService.revokeAllUserTokens(userId);

    this.logger.log(`Password reset successful for user: ${userId}`);

    return {
      message: 'Password reset successful. Please login with your new password.',
    };
  }

  /**
   * Verify email address
   */
  async verifyEmail(
    token: string,
    ipAddress: string,
    userAgent: string | null,
  ): Promise<{
    message: string;
    user: any;
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  }> {
    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpiry: {
          gte: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestException(
        'Invalid or expired verification token',
      );
    }

    if (user.emailVerifiedAt) {
      // Already verified - generate tokens and log them in anyway
      this.logger.log(`Email already verified for user: ${user.id}, logging in...`);
      const tokens = await this.generateTokensForUser(
        user.id,
        user.email,
        ipAddress,
        userAgent,
      );

      return {
        message: 'Email already verified',
        user,
        ...tokens,
      };
    }

    // Mark email as verified
    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifiedAt: new Date(),
        emailVerificationToken: null,
        emailVerificationExpiry: null,
      },
    });

    // Send welcome email
    try {
      await this.emailService.sendWelcomeEmail(
        user.email,
        user.firstName || null,
      );
    } catch (error) {
      this.logger.error(`Failed to send welcome email: ${error.message}`);
    }

    this.logger.log(`Email verified for user: ${user.id} (${user.email})`);

    // Generate tokens to automatically log the user in
    const tokens = await this.generateTokensForUser(
      updatedUser.id,
      updatedUser.email,
      ipAddress,
      userAgent,
    );

    return {
      message: 'Email verified successfully. You are now logged in.',
      user: updatedUser,
      ...tokens,
    };
  }

  /**
   * Resend verification email
   */
  async resendVerification(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || user.authProvider !== 'local') {
      return {
        message: 'If the email exists, a verification link has been sent.',
      };
    }

    if (user.emailVerifiedAt) {
      throw new BadRequestException('Email already verified');
    }

    // Generate new verification token
    const verificationToken =
      this.tokenService.generateEmailVerificationToken();
    const verificationExpiry = new Date();
    verificationExpiry.setHours(verificationExpiry.getHours() + 24);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: verificationToken,
        emailVerificationExpiry: verificationExpiry,
      },
    });

    // Send verification email
    try {
      await this.emailService.sendVerificationEmail(email, verificationToken);
    } catch (error) {
      this.logger.error(`Failed to send verification email: ${error.message}`);
    }

    this.logger.log(`Verification email resent to: ${email}`);

    return {
      message: 'If the email exists, a verification link has been sent.',
    };
  }

  /**
   * Google OAuth Authentication
   * Find or create user from Google profile
   */
  async googleAuth(
    googleProfile: {
      googleId: string;
      email: string;
      firstName?: string;
      lastName?: string;
      picture?: string;
    },
    ipAddress: string,
    userAgent: string | null,
  ) {
    this.logger.log(`🔐 Google OAuth login attempt for: ${googleProfile.email}`);

    // Find existing user by googleId or email
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [{ googleId: googleProfile.googleId }, { email: googleProfile.email }],
      },
    });

    if (!user) {
      // Create new user
      this.logger.log(`Creating new user from Google OAuth: ${googleProfile.email}`);
      user = await this.prisma.user.create({
        data: {
          googleId: googleProfile.googleId,
          email: googleProfile.email,
          firstName: googleProfile.firstName,
          lastName: googleProfile.lastName,
          avatarUrl: googleProfile.picture,
          authProvider: 'google',
          emailVerifiedAt: new Date(), // Google users are pre-verified
        },
      });
    } else if (!user.googleId) {
      // Link Google account to existing email/password account
      this.logger.log(`Linking Google account to existing user: ${user.email}`);
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: googleProfile.googleId,
          avatarUrl: googleProfile.picture || user.avatarUrl,
        },
      });
    }

    // Generate JWT tokens
    const tokens = await this.generateTokensForUser(
      user.id,
      user.email,
      ipAddress,
      userAgent,
    );

    this.logger.log(`✅ Google OAuth successful for user: ${user.email}`);

    return {
      user,
      ...tokens,
    };
  }

  /**
   * Logout user (revoke refresh token)
   */
  async logout(refreshToken: string): Promise<{ message: string }> {
    await this.tokenService.revokeRefreshToken(refreshToken);
    return { message: 'Logged out successfully' };
  }

  /**
   * Logout from all devices (revoke all refresh tokens)
   */
  async logoutAll(userId: string): Promise<{ message: string }> {
    await this.tokenService.revokeAllUserTokens(userId);
    return { message: 'Logged out from all devices successfully' };
  }
}
