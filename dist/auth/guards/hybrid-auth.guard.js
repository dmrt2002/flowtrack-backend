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
Object.defineProperty(exports, "__esModule", { value: true });
exports.HybridAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const clerk_auth_guard_1 = require("./clerk-auth.guard");
let HybridAuthGuard = class HybridAuthGuard extends (0, passport_1.AuthGuard)('jwt') {
    reflector;
    configService;
    clerkGuard;
    constructor(reflector, configService) {
        super();
        this.reflector = reflector;
        this.configService = configService;
        this.clerkGuard = new clerk_auth_guard_1.ClerkAuthGuard(reflector, configService);
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;
        if (!authHeader) {
            throw new common_1.UnauthorizedException('No authorization header found');
        }
        const token = authHeader.replace('Bearer ', '');
        const isLikelyJwt = token.split('.').length === 3;
        if (!isLikelyJwt) {
            try {
                const clerkResult = await this.clerkGuard.canActivate(context);
                if (clerkResult) {
                    return true;
                }
            }
            catch (error) {
            }
        }
        try {
            const result = await super.canActivate(context);
            return result;
        }
        catch (error) {
            throw new common_1.UnauthorizedException('Invalid authentication token. Please login again.');
        }
    }
};
exports.HybridAuthGuard = HybridAuthGuard;
exports.HybridAuthGuard = HybridAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        config_1.ConfigService])
], HybridAuthGuard);
//# sourceMappingURL=hybrid-auth.guard.js.map