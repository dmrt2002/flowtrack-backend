import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { EmailService } from './services/email.service';
import { RateLimitService } from './services/rate-limit.service';
import type { RegisterDto } from './dto';
export declare class AuthService {
    private prisma;
    private configService;
    private passwordService;
    private tokenService;
    private emailService;
    private rateLimitService;
    private readonly logger;
    constructor(prisma: PrismaService, configService: ConfigService, passwordService: PasswordService, tokenService: TokenService, emailService: EmailService, rateLimitService: RateLimitService);
    registerLocal(dto: RegisterDto, ipAddress: string, userAgent: string | null): Promise<{
        user: any;
        accessToken: string;
        refreshToken: string;
        expiresAt: Date;
        message: string;
    }>;
    validateLocalUser(email: string, password: string, ipAddress: string, userAgent: string | null): Promise<any>;
    generateTokensForUser(userId: string, email: string, ipAddress: string, userAgent: string | null): Promise<{
        accessToken: string;
        refreshToken: string;
        expiresAt: Date;
    }>;
    refreshTokens(refreshToken: string, ipAddress: string, userAgent: string | null): Promise<{
        accessToken: string;
        refreshToken: string;
        expiresAt: Date;
    }>;
    forgotPassword(email: string): Promise<{
        message: string;
    }>;
    resetPassword(token: string, newPassword: string): Promise<{
        message: string;
    }>;
    verifyEmail(token: string, ipAddress: string, userAgent: string | null): Promise<{
        message: string;
        user: any;
        accessToken: string;
        refreshToken: string;
        expiresAt: Date;
    }>;
    resendVerification(email: string): Promise<{
        message: string;
    }>;
    googleAuth(googleProfile: {
        googleId: string;
        email: string;
        firstName?: string;
        lastName?: string;
        picture?: string;
    }, ipAddress: string, userAgent: string | null): Promise<{
        accessToken: string;
        refreshToken: string;
        expiresAt: Date;
        user: {
            id: string;
            email: string;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            isActive: boolean;
            firstName: string | null;
            lastName: string | null;
            clerkUserId: string | null;
            googleId: string | null;
            emailVerificationToken: string | null;
            avatarUrl: string | null;
            authProvider: import("@prisma/client").$Enums.AuthProvider;
            passwordHash: string | null;
            passwordChangedAt: Date | null;
            emailVerificationExpiry: Date | null;
            emailVerifiedAt: Date | null;
            hasCompletedOnboarding: boolean;
            onboardingCompletedAt: Date | null;
        };
    }>;
    logout(refreshToken: string): Promise<{
        message: string;
    }>;
    logoutAll(userId: string): Promise<{
        message: string;
    }>;
}
