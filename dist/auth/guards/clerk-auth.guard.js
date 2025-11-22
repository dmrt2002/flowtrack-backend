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
var ClerkAuthGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClerkAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const clerk_sdk_node_1 = require("@clerk/clerk-sdk-node");
const config_1 = require("@nestjs/config");
const public_decorator_1 = require("../decorators/public.decorator");
let ClerkAuthGuard = ClerkAuthGuard_1 = class ClerkAuthGuard {
    reflector;
    configService;
    logger = new common_1.Logger(ClerkAuthGuard_1.name);
    clerkClient;
    constructor(reflector, configService) {
        this.reflector = reflector;
        this.configService = configService;
        const secretKey = this.configService.get('CLERK_SECRET_KEY');
        if (!secretKey) {
            throw new Error('CLERK_SECRET_KEY is not configured');
        }
        this.clerkClient = (0, clerk_sdk_node_1.createClerkClient)({ secretKey });
    }
    async canActivate(context) {
        const isPublic = this.reflector.getAllAndOverride(public_decorator_1.IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(request);
        if (!token) {
            throw new common_1.UnauthorizedException('No authentication token provided');
        }
        try {
            const payload = await this.clerkClient.verifyToken(token);
            if (!payload.sub) {
                throw new common_1.UnauthorizedException('Invalid token payload');
            }
            request.user = {
                authId: payload.sub,
                sessionId: payload.sid,
            };
            return true;
        }
        catch (error) {
            this.logger.error('Token verification failed', error);
            throw new common_1.UnauthorizedException('Invalid or expired token');
        }
    }
    extractTokenFromHeader(request) {
        const authHeader = request.headers.authorization;
        if (!authHeader) {
            return undefined;
        }
        const [type, token] = authHeader.split(' ');
        return type === 'Bearer' ? token : undefined;
    }
};
exports.ClerkAuthGuard = ClerkAuthGuard;
exports.ClerkAuthGuard = ClerkAuthGuard = ClerkAuthGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        config_1.ConfigService])
], ClerkAuthGuard);
//# sourceMappingURL=clerk-auth.guard.js.map