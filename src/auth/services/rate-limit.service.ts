import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface LoginAttemptResult {
  allowed: boolean;
  remainingAttempts: number;
  resetAt: Date;
}

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);

  // Rate limit configuration
  private readonly MAX_ATTEMPTS = 5;
  private readonly WINDOW_MINUTES = 15;

  constructor(private prisma: PrismaService) {}

  /**
   * Check if login attempt is allowed based on rate limiting
   * Returns remaining attempts and reset time
   */
  async checkLoginAttempt(
    email: string,
    ipAddress: string,
  ): Promise<LoginAttemptResult> {
    const windowStart = new Date();
    windowStart.setMinutes(windowStart.getMinutes() - this.WINDOW_MINUTES);

    // Count failed attempts in the time window
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
      this.logger.warn(
        `Rate limit exceeded for ${email} from ${ipAddress}. ${failedAttempts} failed attempts.`,
      );
    }

    return {
      allowed,
      remainingAttempts,
      resetAt,
    };
  }

  /**
   * Record a successful login attempt
   */
  async recordSuccessfulLogin(
    email: string,
    ipAddress: string,
    userAgent: string | null,
  ): Promise<void> {
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

  /**
   * Record a failed login attempt with reason
   */
  async recordFailedLogin(
    email: string,
    ipAddress: string,
    userAgent: string | null,
    failureReason: string,
  ): Promise<void> {
    await this.prisma.loginAttempt.create({
      data: {
        email,
        ipAddress,
        userAgent,
        wasSuccessful: false,
        failureReason,
      },
    });

    this.logger.warn(
      `Failed login attempt for ${email} from ${ipAddress}: ${failureReason}`,
    );
  }

  /**
   * Validate login attempt and throw if rate limited
   * This is a convenience method that checks and throws
   */
  async validateLoginAttempt(email: string, ipAddress: string): Promise<void> {
    const result = await this.checkLoginAttempt(email, ipAddress);

    if (!result.allowed) {
      const minutesUntilReset = Math.ceil(
        (result.resetAt.getTime() - Date.now()) / 1000 / 60,
      );

      throw new UnauthorizedException(
        `Too many failed login attempts. Please try again in ${minutesUntilReset} minute${minutesUntilReset !== 1 ? 's' : ''}.`,
      );
    }
  }

  /**
   * Get login attempt statistics for a user (useful for security dashboards)
   */
  async getLoginAttemptStats(email: string): Promise<{
    totalAttempts: number;
    successfulAttempts: number;
    failedAttempts: number;
    lastSuccessfulLogin: Date | null;
    lastFailedLogin: Date | null;
  }> {
    const [total, successful, failed, lastSuccess, lastFailure] =
      await Promise.all([
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

  /**
   * Clean up old login attempts (for maintenance cron job)
   * Removes attempts older than 30 days
   */
  async cleanupOldAttempts(): Promise<number> {
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

  /**
   * Get recent suspicious activity (multiple failed attempts)
   * Useful for security monitoring
   */
  async getSuspiciousActivity(limit: number = 10): Promise<
    Array<{
      email: string;
      ipAddress: string;
      failedCount: number;
      lastAttempt: Date;
    }>
  > {
    const windowStart = new Date();
    windowStart.setHours(windowStart.getHours() - 1); // Last hour

    const suspiciousAttempts = await this.prisma.$queryRaw<
      Array<{
        email: string;
        ip_address: string;
        failed_count: bigint;
        last_attempt: Date;
      }>
    >`
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
}
