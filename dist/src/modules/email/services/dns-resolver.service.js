"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var DnsResolverService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DnsResolverService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const dns = __importStar(require("dns/promises"));
let DnsResolverService = DnsResolverService_1 = class DnsResolverService {
    queue;
    configService;
    logger = new common_1.Logger(DnsResolverService_1.name);
    CACHE_PREFIX = 'dns:reverse:';
    CACHE_TTL_SECONDS;
    redis;
    APPLE_PATTERNS = [
        'icloud-content',
        'apple-relay',
        'mail-proxy',
        'icloud.com',
        'apple.com',
    ];
    constructor(queue, configService) {
        this.queue = queue;
        this.configService = configService;
        this.CACHE_TTL_SECONDS = this.configService.get('EMAIL_TRACKING_DNS_CACHE_TTL_SECONDS', 3600);
    }
    async onModuleInit() {
        this.redis = await this.queue.client;
    }
    async reverseLookup(ip) {
        try {
            const cacheKey = `${this.CACHE_PREFIX}${ip}`;
            const cachedResult = await this.redis.get(cacheKey);
            if (cachedResult) {
                this.logger.debug(`DNS cache hit for IP: ${ip}`);
                return JSON.parse(cachedResult);
            }
            this.logger.debug(`Performing reverse DNS lookup for IP: ${ip}`);
            const hostnames = await dns.reverse(ip);
            const hostname = hostnames.length > 0 ? hostnames[0] : null;
            const isAppleProxy = this.isAppleInfrastructure(hostname);
            const result = {
                hostname,
                isAppleProxy,
            };
            await this.redis.setex(cacheKey, this.CACHE_TTL_SECONDS, JSON.stringify(result));
            this.logger.debug(`DNS lookup completed for ${ip}: hostname=${hostname}, isApple=${isAppleProxy}`);
            return result;
        }
        catch (error) {
            this.logger.warn(`DNS reverse lookup failed for IP ${ip}: ${error.message}`);
            const result = {
                hostname: null,
                isAppleProxy: false,
            };
            const cacheKey = `${this.CACHE_PREFIX}${ip}`;
            await this.redis.setex(cacheKey, this.CACHE_TTL_SECONDS, JSON.stringify(result));
            return result;
        }
    }
    isAppleInfrastructure(hostname) {
        if (!hostname) {
            return false;
        }
        const lowerHostname = hostname.toLowerCase();
        return this.APPLE_PATTERNS.some((pattern) => lowerHostname.includes(pattern));
    }
    async clearCache(ip) {
        const cacheKey = `${this.CACHE_PREFIX}${ip}`;
        await this.redis.del(cacheKey);
        this.logger.debug(`Cleared DNS cache for IP: ${ip}`);
    }
    async clearAllCache() {
        const pattern = `${this.CACHE_PREFIX}*`;
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
            await this.redis.del(...keys);
            this.logger.log(`Cleared ${keys.length} DNS cache entries`);
        }
    }
};
exports.DnsResolverService = DnsResolverService;
exports.DnsResolverService = DnsResolverService = DnsResolverService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bullmq_1.InjectQueue)('email-tracking-analysis')),
    __metadata("design:paramtypes", [bullmq_2.Queue,
        config_1.ConfigService])
], DnsResolverService);
//# sourceMappingURL=dns-resolver.service.js.map