import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as dns from 'dns/promises';

/**
 * DnsResolverService
 *
 * Performs reverse DNS lookups with Redis caching to detect Apple MPP infrastructure.
 * Identifies Apple proxy IPs by checking for specific hostname patterns.
 */
@Injectable()
export class DnsResolverService implements OnModuleInit {
  private readonly logger = new Logger(DnsResolverService.name);
  private readonly CACHE_PREFIX = 'dns:reverse:';
  private readonly CACHE_TTL_SECONDS: number;
  private redis: any; // BullMQ's internal Redis connection

  // Apple infrastructure patterns
  private readonly APPLE_PATTERNS = [
    'icloud-content',
    'apple-relay',
    'mail-proxy',
    'icloud.com',
    'apple.com',
  ];

  constructor(
    @InjectQueue('email-tracking-analysis') private readonly queue: Queue,
    private readonly configService: ConfigService,
  ) {
    this.CACHE_TTL_SECONDS = this.configService.get<number>(
      'EMAIL_TRACKING_DNS_CACHE_TTL_SECONDS',
      3600, // Default 1 hour
    );
  }

  async onModuleInit() {
    // Access BullMQ's internal Redis connection
    // @ts-ignore - accessing internal property
    this.redis = await this.queue.client;
  }

  /**
   * Perform reverse DNS lookup with caching
   * @param ip - Client IP address
   * @returns Object containing hostname and Apple proxy detection result
   */
  async reverseLookup(
    ip: string,
  ): Promise<{ hostname: string | null; isAppleProxy: boolean }> {
    try {
      // Check cache first
      const cacheKey = `${this.CACHE_PREFIX}${ip}`;
      const cachedResult = await this.redis.get(cacheKey);

      if (cachedResult) {
        this.logger.debug(`DNS cache hit for IP: ${ip}`);
        return JSON.parse(cachedResult);
      }

      // Perform DNS lookup
      this.logger.debug(`Performing reverse DNS lookup for IP: ${ip}`);
      const hostnames = await dns.reverse(ip);

      const hostname = hostnames.length > 0 ? hostnames[0] : null;
      const isAppleProxy = this.isAppleInfrastructure(hostname);

      const result = {
        hostname,
        isAppleProxy,
      };

      // Cache the result
      await this.redis.setex(
        cacheKey,
        this.CACHE_TTL_SECONDS,
        JSON.stringify(result),
      );

      this.logger.debug(
        `DNS lookup completed for ${ip}: hostname=${hostname}, isApple=${isAppleProxy}`,
      );

      return result;
    } catch (error) {
      // DNS lookup failed - log and return null
      this.logger.warn(`DNS reverse lookup failed for IP ${ip}: ${error.message}`);

      // Cache the failure to avoid repeated lookups
      const result = {
        hostname: null,
        isAppleProxy: false,
      };

      const cacheKey = `${this.CACHE_PREFIX}${ip}`;
      await this.redis.setex(
        cacheKey,
        this.CACHE_TTL_SECONDS,
        JSON.stringify(result),
      );

      return result;
    }
  }

  /**
   * Check if hostname matches Apple infrastructure patterns
   * @param hostname - Resolved hostname
   * @returns True if hostname matches Apple patterns
   */
  private isAppleInfrastructure(hostname: string | null): boolean {
    if (!hostname) {
      return false;
    }

    const lowerHostname = hostname.toLowerCase();

    return this.APPLE_PATTERNS.some((pattern) =>
      lowerHostname.includes(pattern),
    );
  }

  /**
   * Clear DNS cache for a specific IP (useful for testing)
   * @param ip - IP address to clear from cache
   */
  async clearCache(ip: string): Promise<void> {
    const cacheKey = `${this.CACHE_PREFIX}${ip}`;
    await this.redis.del(cacheKey);
    this.logger.debug(`Cleared DNS cache for IP: ${ip}`);
  }

  /**
   * Clear all DNS caches (useful for maintenance)
   */
  async clearAllCache(): Promise<void> {
    const pattern = `${this.CACHE_PREFIX}*`;
    const keys = await this.redis.keys(pattern);

    if (keys.length > 0) {
      await this.redis.del(...keys);
      this.logger.log(`Cleared ${keys.length} DNS cache entries`);
    }
  }
}
