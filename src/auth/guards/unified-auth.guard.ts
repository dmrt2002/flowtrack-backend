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
import { PrismaService } from '../../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { JwtPayload } from '../services/token.service';

/**
 * Unified Auth Guard
 * Handles cookie-based JWT authentication
 * This is the ONLY guard used across the entire application
 */
@Injectable()
export class UnifiedAuthGuard implements CanActivate {
  private readonly logger = new Logger(UnifiedAuthGuard.name);

  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

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

    // Check cookie-based JWT authentication
    const cookieToken = request.cookies?.accessToken;
    if (!cookieToken) {
      this.logger.debug('🍪 No accessToken cookie found');
      throw new UnauthorizedException('Authentication required. Please login.');
    }

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
          hasCompletedOnboarding: true,
          onboardingCompletedAt: true,
          workspaceMemberships: {
            select: {
              workspace: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
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

      // Attach user to request with transformed workspace data
      const { workspaceMemberships, ...userData } = user;
      const workspaces = workspaceMemberships.map((m: any) => m.workspace);

      // Get public form URL from active workflow for the first workspace
      let publicFormUrl: string | null = null;
      if (workspaces.length > 0) {
        const firstWorkspace = workspaces[0];
        const activeWorkflow = await this.prisma.workflow.findFirst({
          where: {
            workspaceId: firstWorkspace.id,
            status: 'active',
            deletedAt: null,
          },
          select: {
            workspace: {
              select: {
                slug: true,
              },
            },
          },
        });

        if (activeWorkflow) {
          const frontendUrl = this.configService.get<string>('FRONTEND_URL');
          publicFormUrl = `${frontendUrl}/p/${activeWorkflow.workspace.slug}`;
        }
      }

      request.user = {
        ...userData,
        workspaces,
        publicFormUrl,
      };
      this.logger.debug(`✅ Authentication successful for: ${user.email}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ JWT validation failed: ${error.message}`);
      throw new UnauthorizedException('Authentication required. Please login.');
    }
  }
}
