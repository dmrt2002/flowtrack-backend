import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import type { JwtPayload } from '../services/token.service';

/**
 * JWT Strategy for native authentication
 * Used by JwtAuthGuard
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }
    super({
      jwtFromRequest: (req: Request) => {
        // Extract JWT from cookie
        if (req.cookies && req.cookies.accessToken) {
          return req.cookies.accessToken;
        }
        return null;
      },
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: false,
    });
  }

  /**
   * Validate JWT payload and return user
   * Called automatically by Passport after JWT verification
   */
  async validate(payload: JwtPayload): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        authProvider: true,
        emailVerifiedAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Check if email is verified for local auth users
    if (user.authProvider === 'local' && !user.emailVerifiedAt) {
      throw new UnauthorizedException(
        'Email not verified. Please verify your email address.',
      );
    }

    return user;
  }
}
