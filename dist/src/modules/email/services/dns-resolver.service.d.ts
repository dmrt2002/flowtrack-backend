import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
export declare class DnsResolverService implements OnModuleInit {
    private readonly queue;
    private readonly configService;
    private readonly logger;
    private readonly CACHE_PREFIX;
    private readonly CACHE_TTL_SECONDS;
    private redis;
    private readonly APPLE_PATTERNS;
    constructor(queue: Queue, configService: ConfigService);
    onModuleInit(): Promise<void>;
    reverseLookup(ip: string): Promise<{
        hostname: string | null;
        isAppleProxy: boolean;
    }>;
    private isAppleInfrastructure;
    clearCache(ip: string): Promise<void>;
    clearAllCache(): Promise<void>;
}
