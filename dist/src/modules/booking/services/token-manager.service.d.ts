import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
export declare class TokenManagerService {
    private prisma;
    private config;
    private readonly logger;
    private readonly tokenCache;
    constructor(prisma: PrismaService, config: ConfigService);
    getValidAccessToken(credentialId: string): Promise<string>;
    private refreshToken;
    private refreshCalendlyToken;
    updateRateLimit(credentialId: string, remaining: number, resetAt: Date): Promise<void>;
    checkRateLimit(credentialId: string): Promise<boolean>;
    clearCache(credentialId: string): void;
    clearAllCache(): void;
}
