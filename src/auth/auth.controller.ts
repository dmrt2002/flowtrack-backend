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
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
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
  ): Promise<{
    user: any;
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    message: string;
  }> {
    const ipAddress = this.getIpAddress(req);
    const userAgent = req.headers['user-agent'] || null;

    return this.authService.registerLocal(dto, ipAddress, userAgent);
  }

  /**
   * POST /auth/login
   * Login with email/password
   */
  @Public()
  @Post('login')
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  async login(@Request() req: any): Promise<{
    user: any;
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  }> {
    const ipAddress = this.getIpAddress(req);
    const userAgent = req.headers['user-agent'] || null;

    const tokens = await this.authService.generateTokensForUser(
      req.user.id,
      req.user.email,
      ipAddress,
      userAgent,
    );

    return {
      user: req.user,
      ...tokens,
    };
  }

  /**
   * POST /auth/refresh
   * Refresh access token using refresh token
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body(new ZodValidationPipe(refreshTokenSchema)) dto: RefreshTokenDto,
    @Request() req: any,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  }> {
    const ipAddress = this.getIpAddress(req);
    const userAgent = req.headers['user-agent'] || null;

    return this.authService.refreshTokens(
      dto.refreshToken,
      ipAddress,
      userAgent,
    );
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
   * Logout user (revoke refresh token)
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body(new ZodValidationPipe(refreshTokenSchema)) dto: RefreshTokenDto,
  ): Promise<{ message: string }> {
    return this.authService.logout(dto.refreshToken);
  }

  /**
   * POST /auth/logout-all
   * Logout from all devices
   */
  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logoutAll(@Request() req: any): Promise<{ message: string }> {
    return this.authService.logoutAll(req.user.id);
  }

  /**
   * GET /auth/me
   * Get current user info
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getMe(@Request() req: any): Promise<any> {
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
