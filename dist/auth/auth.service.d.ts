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
    private clerkClient;
    constructor(prisma: PrismaService, configService: ConfigService, passwordService: PasswordService, tokenService: TokenService, emailService: EmailService, rateLimitService: RateLimitService);
    getOrCreateUser(authId: string): Promise<{
        id: string;
        createdAt: Date;
        email: string;
        firstName: string | null;
        lastName: string | null;
        clerkUserId: string | null;
        emailVerificationToken: string | null;
        avatarUrl: string | null;
        authProvider: import("@prisma/client").$Enums.AuthProvider;
        passwordHash: string | null;
        passwordChangedAt: Date | null;
        emailVerificationExpiry: Date | null;
        isActive: boolean;
        emailVerifiedAt: Date | null;
        deletedAt: Date | null;
        updatedAt: Date;
    }>;
    syncUserFromClerk(authId: string): Promise<{
        id: string;
        createdAt: Date;
        email: string;
        firstName: string | null;
        lastName: string | null;
        clerkUserId: string | null;
        emailVerificationToken: string | null;
        avatarUrl: string | null;
        authProvider: import("@prisma/client").$Enums.AuthProvider;
        passwordHash: string | null;
        passwordChangedAt: Date | null;
        emailVerificationExpiry: Date | null;
        isActive: boolean;
        emailVerifiedAt: Date | null;
        deletedAt: Date | null;
        updatedAt: Date;
    }>;
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
    verifyEmail(token: string): Promise<{
        message: string;
    }>;
    resendVerification(email: string): Promise<{
        message: string;
    }>;
    logout(refreshToken: string): Promise<{
        message: string;
    }>;
    logoutAll(userId: string): Promise<{
        message: string;
    }>;
}
