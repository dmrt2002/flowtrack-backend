"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var RateLimitService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let RateLimitService = RateLimitService_1 = class RateLimitService {
    prisma;
    logger = new common_1.Logger(RateLimitService_1.name);
    MAX_ATTEMPTS = 5;
    WINDOW_MINUTES = 15;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async checkLoginAttempt(email, ipAddress) {
        const windowStart = new Date();
        windowStart.setMinutes(windowStart.getMinutes() - this.WINDOW_MINUTES);
        const failedAttempts = await this.prisma.loginAttempt.count({
            where: {
                email,
                ipAddress,
                wasSuccessful: false,
                createdAt: {
                    gte: windowStart,
                },
            },
        });
        const remainingAttempts = Math.max(0, this.MAX_ATTEMPTS - failedAttempts);
        const allowed = failedAttempts < this.MAX_ATTEMPTS;
        const resetAt = new Date(windowStart);
        resetAt.setMinutes(resetAt.getMinutes() + this.WINDOW_MINUTES);
        if (!allowed) {
            this.logger.warn(`Rate limit exceeded for ${email} from ${ipAddress}. ${failedAttempts} failed attempts.`);
        }
        return {
            allowed,
            remainingAttempts,
            resetAt,
        };
    }
    async recordSuccessfulLogin(email, ipAddress, userAgent) {
        await this.prisma.loginAttempt.create({
            data: {
                email,
                ipAddress,
                userAgent,
                wasSuccessful: true,
            },
        });
        this.logger.log(`Successful login recorded for ${email} from ${ipAddress}`);
    }
    async recordFailedLogin(email, ipAddress, userAgent, failureReason) {
        await this.prisma.loginAttempt.create({
            data: {
                email,
                ipAddress,
                userAgent,
                wasSuccessful: false,
                failureReason,
            },
        });
        this.logger.warn(`Failed login attempt for ${email} from ${ipAddress}: ${failureReason}`);
    }
    async validateLoginAttempt(email, ipAddress) {
        const result = await this.checkLoginAttempt(email, ipAddress);
        if (!result.allowed) {
            const minutesUntilReset = Math.ceil((result.resetAt.getTime() - Date.now()) / 1000 / 60);
            throw new common_1.UnauthorizedException(`Too many failed login attempts. Please try again in ${minutesUntilReset} minute${minutesUntilReset !== 1 ? 's' : ''}.`);
        }
    }
    async getLoginAttemptStats(email) {
        const [total, successful, failed, lastSuccess, lastFailure] = await Promise.all([
            this.prisma.loginAttempt.count({ where: { email } }),
            this.prisma.loginAttempt.count({
                where: { email, wasSuccessful: true },
            }),
            this.prisma.loginAttempt.count({
                where: { email, wasSuccessful: false },
            }),
            this.prisma.loginAttempt.findFirst({
                where: { email, wasSuccessful: true },
                orderBy: { createdAt: 'desc' },
                select: { createdAt: true },
            }),
            this.prisma.loginAttempt.findFirst({
                where: { email, wasSuccessful: false },
                orderBy: { createdAt: 'desc' },
                select: { createdAt: true },
            }),
        ]);
        return {
            totalAttempts: total,
            successfulAttempts: successful,
            failedAttempts: failed,
            lastSuccessfulLogin: lastSuccess?.createdAt || null,
            lastFailedLogin: lastFailure?.createdAt || null,
        };
    }
    async cleanupOldAttempts() {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const result = await this.prisma.loginAttempt.deleteMany({
            where: {
                createdAt: {
                    lt: thirtyDaysAgo,
                },
            },
        });
        this.logger.log(`Cleaned up ${result.count} old login attempts`);
        return result.count;
    }
    async getSuspiciousActivity(limit = 10) {
        const windowStart = new Date();
        windowStart.setHours(windowStart.getHours() - 1);
        const suspiciousAttempts = await this.prisma.$queryRaw `
      SELECT
        email,
        ip_address,
        COUNT(*) as failed_count,
        MAX(created_at) as last_attempt
      FROM login_attempts
      WHERE
        was_successful = false
        AND created_at >= ${windowStart}
      GROUP BY email, ip_address
      HAVING COUNT(*) >= 3
      ORDER BY failed_count DESC, last_attempt DESC
      LIMIT ${limit}
    `;
        return suspiciousAttempts.map((attempt) => ({
            email: attempt.email,
            ipAddress: attempt.ip_address,
            failedCount: Number(attempt.failed_count),
            lastAttempt: attempt.last_attempt,
        }));
    }
};
exports.RateLimitService = RateLimitService;
exports.RateLimitService = RateLimitService = RateLimitService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RateLimitService);
//# sourceMappingURL=rate-limit.service.js.map