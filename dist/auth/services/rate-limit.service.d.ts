import { PrismaService } from '../../prisma/prisma.service';
export interface LoginAttemptResult {
    allowed: boolean;
    remainingAttempts: number;
    resetAt: Date;
}
export declare class RateLimitService {
    private prisma;
    private readonly logger;
    private readonly MAX_ATTEMPTS;
    private readonly WINDOW_MINUTES;
    constructor(prisma: PrismaService);
    checkLoginAttempt(email: string, ipAddress: string): Promise<LoginAttemptResult>;
    recordSuccessfulLogin(email: string, ipAddress: string, userAgent: string | null): Promise<void>;
    recordFailedLogin(email: string, ipAddress: string, userAgent: string | null, failureReason: string): Promise<void>;
    validateLoginAttempt(email: string, ipAddress: string): Promise<void>;
    getLoginAttemptStats(email: string): Promise<{
        totalAttempts: number;
        successfulAttempts: number;
        failedAttempts: number;
        lastSuccessfulLogin: Date | null;
        lastFailedLogin: Date | null;
    }>;
    cleanupOldAttempts(): Promise<number>;
    getSuspiciousActivity(limit?: number): Promise<Array<{
        email: string;
        ipAddress: string;
        failedCount: number;
        lastAttempt: Date;
    }>>;
}
