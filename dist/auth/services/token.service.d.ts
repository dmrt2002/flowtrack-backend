import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
export interface JwtPayload {
    userId: string;
    email: string;
}
export interface RefreshTokenData {
    id: string;
    token: string;
    expiresAt: Date;
}
export declare class TokenService {
    private jwtService;
    private prisma;
    private configService;
    private readonly logger;
    constructor(jwtService: JwtService, prisma: PrismaService, configService: ConfigService);
    generateAccessToken(userId: string, email: string): string;
    generateRefreshToken(userId: string, ipAddress: string | null, userAgent: string | null): Promise<RefreshTokenData>;
    verifyRefreshToken(rawToken: string): Promise<{
        userId: string;
    }>;
    rotateRefreshToken(oldRawToken: string, ipAddress: string | null, userAgent: string | null): Promise<RefreshTokenData>;
    revokeRefreshToken(rawToken: string): Promise<void>;
    revokeAllUserTokens(userId: string): Promise<void>;
    generatePasswordResetToken(userId: string): Promise<string>;
    verifyPasswordResetToken(token: string): Promise<{
        userId: string;
    }>;
    markPasswordResetTokenAsUsed(token: string): Promise<void>;
    generateEmailVerificationToken(): string;
}
