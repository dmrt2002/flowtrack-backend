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
var UnifiedAuthGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnifiedAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../prisma/prisma.service");
const public_decorator_1 = require("../decorators/public.decorator");
let UnifiedAuthGuard = UnifiedAuthGuard_1 = class UnifiedAuthGuard {
    reflector;
    configService;
    jwtService;
    prisma;
    logger = new common_1.Logger(UnifiedAuthGuard_1.name);
    constructor(reflector, configService, jwtService, prisma) {
        this.reflector = reflector;
        this.configService = configService;
        this.jwtService = jwtService;
        this.prisma = prisma;
    }
    async canActivate(context) {
        const isPublic = this.reflector.getAllAndOverride(public_decorator_1.IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) {
            this.logger.debug('✅ Public route - skipping authentication');
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const cookieToken = request.cookies?.accessToken;
        if (!cookieToken) {
            this.logger.debug('🍪 No accessToken cookie found');
            throw new common_1.UnauthorizedException('Authentication required. Please login.');
        }
        this.logger.debug('🍪 Found accessToken cookie, validating JWT...');
        try {
            const jwtSecret = this.configService.get('JWT_SECRET');
            if (!jwtSecret) {
                throw new Error('JWT_SECRET not configured');
            }
            const payload = this.jwtService.verify(cookieToken, {
                secret: jwtSecret,
            });
            this.logger.debug(`🔐 JWT valid for user: ${payload.userId}`);
            const user = await this.prisma.user.findUnique({
                where: { id: payload.userId },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    avatarUrl: true,
                    authProvider: true,
                    emailVerifiedAt: true,
                    createdAt: true,
                    hasCompletedOnboarding: true,
                    onboardingCompletedAt: true,
                    workspaceMemberships: {
                        select: {
                            workspace: {
                                select: {
                                    id: true,
                                    name: true,
                                    slug: true,
                                },
                            },
                        },
                    },
                },
            });
            if (!user) {
                this.logger.error(`❌ User not found in DB: ${payload.userId}`);
                throw new common_1.UnauthorizedException('User not found');
            }
            if (user.authProvider === 'local' && !user.emailVerifiedAt) {
                this.logger.warn(`⚠️  Email not verified for user: ${user.email}`);
                throw new common_1.UnauthorizedException('Email not verified. Please verify your email address.');
            }
            const { workspaceMemberships, ...userData } = user;
            request.user = {
                ...userData,
                workspaces: workspaceMemberships.map((m) => m.workspace),
            };
            this.logger.debug(`✅ Authentication successful for: ${user.email}`);
            return true;
        }
        catch (error) {
            this.logger.error(`❌ JWT validation failed: ${error.message}`);
            throw new common_1.UnauthorizedException('Authentication required. Please login.');
        }
    }
};
exports.UnifiedAuthGuard = UnifiedAuthGuard;
exports.UnifiedAuthGuard = UnifiedAuthGuard = UnifiedAuthGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        config_1.ConfigService,
        jwt_1.JwtService,
        prisma_service_1.PrismaService])
], UnifiedAuthGuard);
//# sourceMappingURL=unified-auth.guard.js.map