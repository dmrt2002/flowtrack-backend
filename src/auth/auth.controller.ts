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

  constructor(private authService: AuthService) {}

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
    user: any;
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    message: string;
  }> {
    const ipAddress = this.getIpAddress(req);
    const userAgent = req.headers['user-agent'] || null;

    const result = await this.authService.registerLocal(dto, ipAddress, userAgent);

    // Set httpOnly cookie for 6 hours
    this.logger.log(`🍪 Setting accessToken cookie for user: ${result.user.email}`);
    response.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 6 * 60 * 60 * 1000, // 6 hours
      path: '/',
    });
    this.logger.debug(`🍪 Cookie set successfully with maxAge: 6 hours`);

    return result;
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
   * Verify email address
   */
  @Public()
  @Get('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(
    @Query(new ZodValidationPipe(verifyEmailSchema)) query: VerifyEmailDto,
  ): Promise<{ message: string }> {
    return this.authService.verifyEmail(query.token);
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
   * GET /auth/me
   * Get current user info
   */
  @Get('me')
  @UseGuards(UnifiedAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getMe(@Request() req: any): Promise<any> {
    const cookieToken = req.cookies?.accessToken;
    this.logger.log(`📥 /auth/me called - Cookie present: ${!!cookieToken}`);

    if (!req.user) {
      this.logger.error('❌ /auth/me - No user attached to request');
      throw new UnauthorizedException('User not authenticated');
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
