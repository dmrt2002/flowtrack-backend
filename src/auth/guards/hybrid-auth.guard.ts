import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ClerkAuthGuard } from './clerk-auth.guard';

/**
 * Hybrid Auth Guard
 * Accepts BOTH Clerk authentication AND native JWT authentication
 * Use on endpoints that should work for both auth types
 */
@Injectable()
export class HybridAuthGuard extends AuthGuard('jwt') {
  private clerkGuard: ClerkAuthGuard;

  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
  ) {
    super();
    this.clerkGuard = new ClerkAuthGuard(reflector, configService);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('No authorization header found');
    }

    // Try Clerk authentication first (if token doesn't look like JWT)
    // Clerk tokens are typically longer and different format
    const token = authHeader.replace('Bearer ', '');
    const isLikelyJwt = token.split('.').length === 3; // JWT has 3 parts

    if (!isLikelyJwt) {
      try {
        const clerkResult = await this.clerkGuard.canActivate(context);
        if (clerkResult) {
          return true;
        }
      } catch (error) {
        // If Clerk auth fails, try JWT auth below
      }
    }

    // Try JWT authentication
    try {
      const result = await super.canActivate(context);
      return result as boolean;
    } catch (error) {
      throw new UnauthorizedException(
        'Invalid authentication token. Please login again.',
      );
    }
  }
}
