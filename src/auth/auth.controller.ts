import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Query,
  Res,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UnifiedAuthGuard } from './guards/unified-auth.guard';
import { Public } from './decorators/public.decorator';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  refreshTokenSchema,
  resendVerificationSchema,
  type RegisterDto,
  type LoginDto,
  type ForgotPasswordDto,
  type ResetPasswordDto,
  type VerifyEmailDto,
  type RefreshTokenDto,
  type ResendVerificationDto,
} from './dto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  /**
   * POST /auth/register
   * Register a new user with email/password
   */
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body(new ZodValidationPipe(registerSchema)) dto: RegisterDto,
    @Request() req: any,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{
    message: string;
    email: string;
  }> {
    const ipAddress = this.getIpAddress(req);
    const userAgent = req.headers['user-agent'] || null;

    const result = await this.authService.registerLocal(dto, ipAddress, userAgent);

    this.logger.log(`✅ User registered: ${result.user.email} - Verification email sent`);

    // DON'T set auth cookies on registration - require email verification first
    // User will be logged in automatically when they verify their email

    return {
      message: 'Registration successful! Please check your email to verify your account.',
      email: result.user.email,
    };
  }

  /**
   * POST /auth/login
   * Login with email/password
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) dto: LoginDto,
    @Request() req: any,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{
    user: any;
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  }> {
    const ipAddress = this.getIpAddress(req);
    const userAgent = req.headers['user-agent'] || null;

    // Validate credentials
    const user = await this.authService.validateLocalUser(
      dto.email,
      dto.password,
      ipAddress,
      userAgent,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const tokens = await this.authService.generateTokensForUser(
      user.id,
      user.email,
      ipAddress,
      userAgent,
    );

    // Set httpOnly cookie for 6 hours
    this.logger.log(`🍪 Setting accessToken cookie for user: ${user.email}`);
    response.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 6 * 60 * 60 * 1000, // 6 hours
      path: '/',
    });
    this.logger.debug(`🍪 Cookie set successfully with maxAge: 6 hours`);

    // Set onboarding_complete cookie based on user status
    if (user.hasCompletedOnboarding) {
      this.logger.log(
        `🍪 Setting onboarding_complete=true for user: ${user.email}`,
      );
      response.cookie('onboarding_complete', 'true', {
        httpOnly: false, // Must be accessible to frontend middleware
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: '/',
      });
    }

    return {
      user,
      ...tokens,
    };
  }


  /**
   * POST /auth/forgot-password
   * Request password reset email
   */
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body(new ZodValidationPipe(forgotPasswordSchema))
    dto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.forgotPassword(dto.email);
  }

  /**
   * POST /auth/reset-password
   * Reset password using token from email
   */
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body(new ZodValidationPipe(resetPasswordSchema)) dto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  /**
   * GET /auth/verify-email?token=xxx
   * Verify email address and automatically log the user in
   */
  @Public()
  @Get('verify-email')
  async verifyEmail(
    @Query(new ZodValidationPipe(verifyEmailSchema)) query: VerifyEmailDto,
    @Request() req: any,
    @Res({ passthrough: true }) response: Response,
  ) {
    const ipAddress = this.getIpAddress(req);
    const userAgent = req.headers['user-agent'] || null;

    this.logger.log(`📧 Email verification attempt with token: ${query.token.substring(0, 10)}...`);

    // Verify email and get tokens
    const result = await this.authService.verifyEmail(
      query.token,
      ipAddress,
      userAgent,
    );

    // Set access token cookie
    this.logger.log(`🍪 Setting accessToken cookie for user: ${result.user.email}`);
    response.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 6 * 60 * 60 * 1000, // 6 hours
      path: '/',
    });

    // Set onboarding_complete cookie based on user status
    if (result.user.hasCompletedOnboarding) {
      this.logger.log(
        `🍪 Setting onboarding_complete=true for user: ${result.user.email}`,
      );
      response.cookie('onboarding_complete', 'true', {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: '/',
      });
    }

    // Redirect to appropriate page
    const frontendUrl = this.configService.get('FRONTEND_URL');
    const redirectUrl = result.user.hasCompletedOnboarding
      ? `${frontendUrl}/dashboard-home`
      : `${frontendUrl}/onboarding/form-builder`;

    this.logger.log(`🔄 Email verified, redirecting to: ${redirectUrl}`);
    return response.redirect(redirectUrl);
  }

  /**
   * POST /auth/resend-verification
   * Resend email verification email
   */
  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(
    @Body(new ZodValidationPipe(resendVerificationSchema))
    dto: ResendVerificationDto,
  ): Promise<{ message: string }> {
    return this.authService.resendVerification(dto.email);
  }

  /**
   * POST /auth/logout
   * Logout user (clear session cookie)
   */
  @Post('logout')
  @UseGuards(UnifiedAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @Request() req: any,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ message: string }> {
    // Clear httpOnly cookie
    this.logger.log(`🍪 Clearing accessToken cookie for user: ${req.user?.email}`);
    response.clearCookie('accessToken', { path: '/' });

    return { message: 'Logged out successfully' };
  }

  /**
   * POST /auth/logout-all
   * Logout from all devices
   */
  @Post('logout-all')
  @UseGuards(UnifiedAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logoutAll(
    @Request() req: any,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ message: string }> {
    // Clear httpOnly cookie
    this.logger.log(`🍪 Clearing accessToken cookie for user: ${req.user?.email}`);
    response.clearCookie('accessToken', { path: '/' });

    return { message: 'Logged out from all devices successfully' };
  }

  /**
   * GET /auth/google/redirect
   * Initiates Google OAuth flow
   */
  @Public()
  @Get('google/redirect')
  @UseGuards(AuthGuard('google'))
  async googleRedirect() {
    // This route is handled by the Google OAuth strategy
    // User will be redirected to Google consent screen
  }

  /**
   * GET /auth/google/callback
   * Handles Google OAuth callback
   */
  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(
    @Request() req: any,
    @Res({ passthrough: true }) response: Response,
  ) {
    const ipAddress = this.getIpAddress(req);
    const userAgent = req.headers['user-agent'] || null;

    this.logger.log(`📥 Google OAuth callback for: ${req.user?.email}`);

    // req.user contains the Google profile from the strategy
    const result = await this.authService.googleAuth(req.user, ipAddress, userAgent);

    // Set access token cookie (httpOnly for security)
    this.logger.log(`🍪 Setting accessToken cookie for user: ${result.user.email}`);
    response.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 6 * 60 * 60 * 1000, // 6 hours
      path: '/',
    });

    // Set onboarding_complete cookie based on user status
    if (result.user.hasCompletedOnboarding) {
      this.logger.log(
        `🍪 Setting onboarding_complete=true for user: ${result.user.email}`,
      );
      response.cookie('onboarding_complete', 'true', {
        httpOnly: false, // Must be accessible to frontend middleware
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: '/',
      });
    }

    // Redirect to frontend
    const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3001';
    const redirectUrl = result.user.hasCompletedOnboarding
      ? `${frontendUrl}/dashboard-home`
      : `${frontendUrl}/onboarding/form-builder`;

    this.logger.log(`🔄 Redirecting to: ${redirectUrl}`);
    return response.redirect(redirectUrl);
  }

  /**
   * GET /auth/me
   * Get current user info
   */
  @Get('me')
  @UseGuards(UnifiedAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getMe(
    @Request() req: any,
    @Res({ passthrough: true }) response: Response,
  ): Promise<any> {
    const cookieToken = req.cookies?.accessToken;
    this.logger.log(`📥 /auth/me called - Cookie present: ${!!cookieToken}`);

    if (!req.user) {
      this.logger.error('❌ /auth/me - No user attached to request');
      throw new UnauthorizedException('User not authenticated');
    }

    // Set onboarding_complete cookie based on database state
    if (req.user.hasCompletedOnboarding) {
      this.logger.log(
        `🍪 Setting onboarding_complete=true for user: ${req.user.email}`,
      );
      response.cookie('onboarding_complete', 'true', {
        httpOnly: false, // Must be accessible to frontend middleware
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: '/',
      });
    } else {
      // Clear cookie if onboarding not complete
      this.logger.log(
        `🗑️ Clearing onboarding_complete cookie for user: ${req.user.email}`,
      );
      response.clearCookie('onboarding_complete', { path: '/' });
    }

    this.logger.log(`✅ /auth/me success for user: ${req.user.email}`);
    return req.user;
  }

  /**
   * Extract IP address from request
   */
  private getIpAddress(req: any): string {
    return (
      req.headers['x-forwarded-for']?.split(',')[0].trim() ||
      req.headers['x-real-ip'] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      'unknown'
    );
  }
}
