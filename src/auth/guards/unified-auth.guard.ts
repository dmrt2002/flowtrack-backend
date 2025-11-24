/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createClerkClient } from '@clerk/clerk-sdk-node';
import { PrismaService } from '../../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { JwtPayload } from '../services/token.service';

/**
 * Unified Auth Guard
 * Handles BOTH cookie-based JWT authentication (native) AND Clerk authentication
 * This is the ONLY guard used across the entire application
 */
@Injectable()
export class UnifiedAuthGuard implements CanActivate {
  private readonly logger = new Logger(UnifiedAuthGuard.name);
  private clerkClient: ReturnType<typeof createClerkClient>;

  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {
    const secretKey = this.configService.get<string>('CLERK_SECRET_KEY');
    if (secretKey) {
      this.clerkClient = createClerkClient({ secretKey });
    } else {
      this.logger.warn('⚠️  CLERK_SECRET_KEY not configured - Clerk auth disabled');
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      this.logger.debug('✅ Public route - skipping authentication');
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // Step 1: Try cookie-based JWT authentication (NATIVE AUTH - PRIMARY)
    const cookieToken = request.cookies?.accessToken;
    if (cookieToken) {
      this.logger.debug('🍪 Found accessToken cookie, validating JWT...');

      try {
        const jwtSecret = this.configService.get<string>('JWT_SECRET');
        if (!jwtSecret) {
          throw new Error('JWT_SECRET not configured');
        }

        // Verify JWT
        const payload = this.jwtService.verify<JwtPayload>(cookieToken, {
          secret: jwtSecret,
        });

        this.logger.debug(`🔐 JWT valid for user: ${payload.userId}`);

        // Fetch user from database
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
          this.logger.error(`❌ User not found in DB: ${payload.userId}`);
          throw new UnauthorizedException('User not found');
        }

        // Check email verification for local auth users
        if (user.authProvider === 'local' && !user.emailVerifiedAt) {
          this.logger.warn(`⚠️  Email not verified for user: ${user.email}`);
          throw new UnauthorizedException(
            'Email not verified. Please verify your email address.',
          );
        }

        // Attach user to request
        request.user = user;
        this.logger.debug(`✅ Native auth successful for: ${user.email}`);
        return true;
      } catch (error) {
        this.logger.error(`❌ JWT validation failed: ${error.message}`);
        // Don't throw yet, try Clerk as fallback
      }
    } else {
      this.logger.debug('🍪 No accessToken cookie found');
    }

    // Step 2: Try Clerk authentication (FALLBACK)
    if (this.clerkClient) {
      this.logger.debug('🔍 Attempting Clerk authentication...');

      try {
        let token: string | null = null;

        // First: Check Authorization header (for API calls with explicit token)
        const authHeader = request.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7); // Remove 'Bearer '
          this.logger.debug('🔑 Found Clerk token in Authorization header');
        }

        // Fallback: Check __session cookie (Clerk's standard cookie)
        if (!token && request.cookies?.__session) {
          token = request.cookies.__session;
          this.logger.debug('🍪 Found Clerk token in __session cookie');
        }

        if (token) {
          this.logger.debug('🔐 Verifying Clerk token...');

          // Verify with Clerk
          const payload = await this.clerkClient.verifyToken(token);

          if (!payload.sub) {
            throw new UnauthorizedException('Invalid Clerk token payload');
          }

          this.logger.debug(`🔐 Clerk token valid for: ${payload.sub}`);

          // Get or create user in our database
          let user = await this.prisma.user.findUnique({
            where: { clerkUserId: payload.sub },
          });

          if (!user) {
            // Auto-create user from Clerk data
            const clerkUser = await this.clerkClient.users.getUser(payload.sub);
            const email =
              clerkUser.emailAddresses.find(
                (e: any) => e.id === clerkUser.primaryEmailAddressId,
              )?.emailAddress || clerkUser.emailAddresses[0]?.emailAddress;

            if (!email) {
              throw new UnauthorizedException('Clerk user has no email');
            }

            user = await this.prisma.user.create({
              data: {
                clerkUserId: payload.sub,
                email,
                firstName: clerkUser.firstName || null,
                lastName: clerkUser.lastName || null,
                avatarUrl: clerkUser.imageUrl || null,
                authProvider: 'clerk',
                emailVerifiedAt: new Date(),
              },
            });

            this.logger.log(`✅ Created new Clerk user: ${user.id} (${email})`);
          }

          // Attach user to request
          request.user = user;
          this.logger.debug(`✅ Clerk auth successful for: ${user.email}`);
          return true;
        }
      } catch (error) {
        this.logger.error(`❌ Clerk authentication failed: ${error.message}`);
      }
    }

    // Step 3: Both auth methods failed
    this.logger.error('❌ Authentication failed - no valid cookie or Clerk token');
    throw new UnauthorizedException('Authentication required. Please login.');
  }
}
