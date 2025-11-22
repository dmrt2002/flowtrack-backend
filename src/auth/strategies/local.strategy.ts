import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

/**
 * Local Strategy for email/password authentication
 * Used by LocalAuthGuard
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true, // Pass request object to validate method
    });
  }

  /**
   * Validate user credentials
   * Called automatically by Passport
   */
  async validate(
    req: any,
    email: string,
    password: string,
  ): Promise<any> {
    const ipAddress = this.getIpAddress(req);
    const userAgent = req.headers['user-agent'] || null;

    const user = await this.authService.validateLocalUser(
      email,
      password,
      ipAddress,
      userAgent,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return user;
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
