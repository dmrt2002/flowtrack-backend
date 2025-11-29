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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var TokenManagerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenManagerService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../../prisma/prisma.service");
const axios_1 = __importDefault(require("axios"));
let TokenManagerService = TokenManagerService_1 = class TokenManagerService {
    prisma;
    config;
    logger = new common_1.Logger(TokenManagerService_1.name);
    tokenCache = new Map();
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
    }
    async getValidAccessToken(credentialId) {
        const cached = this.tokenCache.get(credentialId);
        if (cached && cached.expiresAt > new Date(Date.now() + 5 * 60 * 1000)) {
            return cached.token;
        }
        const credential = await this.prisma.oAuthCredential.findUnique({
            where: { id: credentialId },
        });
        if (!credential) {
            throw new common_1.UnauthorizedException('OAuth credential not found');
        }
        if (!credential.isActive) {
            throw new common_1.UnauthorizedException('OAuth credential is inactive');
        }
        const needsRefresh = credential.expiresAt
            ? credential.expiresAt < new Date(Date.now() + 5 * 60 * 1000)
            : false;
        if (needsRefresh && credential.refreshToken) {
            this.logger.log(`Refreshing token for credential ${credentialId} (${credential.providerType})`);
            try {
                const refreshed = await this.refreshToken(credential);
                await this.prisma.oAuthCredential.update({
                    where: { id: credentialId },
                    data: {
                        accessToken: refreshed.accessToken,
                        refreshToken: refreshed.refreshToken || credential.refreshToken,
                        expiresAt: refreshed.expiresAt,
                    },
                });
                this.tokenCache.set(credentialId, {
                    token: refreshed.accessToken,
                    expiresAt: refreshed.expiresAt,
                });
                return refreshed.accessToken;
            }
            catch (error) {
                this.logger.error(`Failed to refresh token for credential ${credentialId}:`, error);
                await this.prisma.oAuthCredential.update({
                    where: { id: credentialId },
                    data: { isActive: false },
                });
                throw new common_1.UnauthorizedException('Failed to refresh access token');
            }
        }
        const token = credential.accessToken || '';
        this.tokenCache.set(credentialId, {
            token,
            expiresAt: credential.expiresAt || new Date(Date.now() + 60 * 60 * 1000),
        });
        return token;
    }
    async refreshToken(credential) {
        switch (credential.providerType) {
            case 'CALENDLY':
                return this.refreshCalendlyToken(credential);
            default:
                throw new Error(`Unsupported provider type: ${credential.providerType}`);
        }
    }
    async refreshCalendlyToken(credential) {
        const clientId = this.config.get('CALENDLY_CLIENT_ID');
        const clientSecret = this.config.get('CALENDLY_CLIENT_SECRET');
        if (!clientId || !clientSecret) {
            throw new Error('Calendly OAuth credentials not configured');
        }
        try {
            const response = await axios_1.default.post('https://auth.calendly.com/oauth/token', {
                grant_type: 'refresh_token',
                refresh_token: credential.refreshToken,
            }, {
                headers: {
                    'Content-Type': 'application/json',
                },
                auth: {
                    username: clientId,
                    password: clientSecret,
                },
            });
            const { access_token, refresh_token, expires_in } = response.data;
            return {
                accessToken: access_token,
                refreshToken: refresh_token,
                expiresAt: new Date(Date.now() + expires_in * 1000),
            };
        }
        catch (error) {
            this.logger.error('Calendly token refresh failed:', error.response?.data || error.message);
            throw new common_1.UnauthorizedException('Failed to refresh Calendly token');
        }
    }
    async updateRateLimit(credentialId, remaining, resetAt) {
        await this.prisma.oAuthCredential.update({
            where: { id: credentialId },
            data: {
                apiRateLimitRemaining: remaining,
                apiRateLimitResetAt: resetAt,
            },
        });
    }
    async checkRateLimit(credentialId) {
        const credential = await this.prisma.oAuthCredential.findUnique({
            where: { id: credentialId },
            select: {
                apiRateLimitRemaining: true,
                apiRateLimitResetAt: true,
            },
        });
        if (!credential) {
            return false;
        }
        if (credential.apiRateLimitRemaining === null ||
            credential.apiRateLimitResetAt === null) {
            return true;
        }
        if (credential.apiRateLimitResetAt < new Date()) {
            return true;
        }
        return credential.apiRateLimitRemaining > 0;
    }
    clearCache(credentialId) {
        this.tokenCache.delete(credentialId);
    }
    clearAllCache() {
        this.tokenCache.clear();
    }
};
exports.TokenManagerService = TokenManagerService;
exports.TokenManagerService = TokenManagerService = TokenManagerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], TokenManagerService);
//# sourceMappingURL=token-manager.service.js.map