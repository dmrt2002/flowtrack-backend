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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AuthController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const unified_auth_guard_1 = require("./guards/unified-auth.guard");
const public_decorator_1 = require("./decorators/public.decorator");
const dto_1 = require("./dto");
const zod_validation_pipe_1 = require("../common/pipes/zod-validation.pipe");
let AuthController = AuthController_1 = class AuthController {
    authService;
    logger = new common_1.Logger(AuthController_1.name);
    constructor(authService) {
        this.authService = authService;
    }
    async register(dto, req, response) {
        const ipAddress = this.getIpAddress(req);
        const userAgent = req.headers['user-agent'] || null;
        const result = await this.authService.registerLocal(dto, ipAddress, userAgent);
        this.logger.log(`🍪 Setting accessToken cookie for user: ${result.user.email}`);
        response.cookie('accessToken', result.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 6 * 60 * 60 * 1000,
            path: '/',
        });
        this.logger.debug(`🍪 Cookie set successfully with maxAge: 6 hours`);
        return result;
    }
    async login(dto, req, response) {
        const ipAddress = this.getIpAddress(req);
        const userAgent = req.headers['user-agent'] || null;
        const user = await this.authService.validateLocalUser(dto.email, dto.password, ipAddress, userAgent);
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const tokens = await this.authService.generateTokensForUser(user.id, user.email, ipAddress, userAgent);
        this.logger.log(`🍪 Setting accessToken cookie for user: ${user.email}`);
        response.cookie('accessToken', tokens.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 6 * 60 * 60 * 1000,
            path: '/',
        });
        this.logger.debug(`🍪 Cookie set successfully with maxAge: 6 hours`);
        return {
            user,
            ...tokens,
        };
    }
    async forgotPassword(dto) {
        return this.authService.forgotPassword(dto.email);
    }
    async resetPassword(dto) {
        return this.authService.resetPassword(dto.token, dto.password);
    }
    async verifyEmail(query) {
        return this.authService.verifyEmail(query.token);
    }
    async resendVerification(dto) {
        return this.authService.resendVerification(dto.email);
    }
    async logout(req, response) {
        this.logger.log(`🍪 Clearing accessToken cookie for user: ${req.user?.email}`);
        response.clearCookie('accessToken', { path: '/' });
        return { message: 'Logged out successfully' };
    }
    async logoutAll(req, response) {
        this.logger.log(`🍪 Clearing accessToken cookie for user: ${req.user?.email}`);
        response.clearCookie('accessToken', { path: '/' });
        return { message: 'Logged out from all devices successfully' };
    }
    async getMe(req) {
        const cookieToken = req.cookies?.accessToken;
        this.logger.log(`📥 /auth/me called - Cookie present: ${!!cookieToken}`);
        if (!req.user) {
            this.logger.error('❌ /auth/me - No user attached to request');
            throw new common_1.UnauthorizedException('User not authenticated');
        }
        this.logger.log(`✅ /auth/me success for user: ${req.user.email}`);
        return req.user;
    }
    getIpAddress(req) {
        return (req.headers['x-forwarded-for']?.split(',')[0].trim() ||
            req.headers['x-real-ip'] ||
            req.connection?.remoteAddress ||
            req.socket?.remoteAddress ||
            'unknown');
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('register'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)(new zod_validation_pipe_1.ZodValidationPipe(dto_1.registerSchema))),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)(new zod_validation_pipe_1.ZodValidationPipe(dto_1.loginSchema))),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('forgot-password'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)(new zod_validation_pipe_1.ZodValidationPipe(dto_1.forgotPasswordSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "forgotPassword", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('reset-password'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)(new zod_validation_pipe_1.ZodValidationPipe(dto_1.resetPasswordSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resetPassword", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('verify-email'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Query)(new zod_validation_pipe_1.ZodValidationPipe(dto_1.verifyEmailSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyEmail", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('resend-verification'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)(new zod_validation_pipe_1.ZodValidationPipe(dto_1.resendVerificationSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resendVerification", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, common_1.UseGuards)(unified_auth_guard_1.UnifiedAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Post)('logout-all'),
    (0, common_1.UseGuards)(unified_auth_guard_1.UnifiedAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logoutAll", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, common_1.UseGuards)(unified_auth_guard_1.UnifiedAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getMe", null);
exports.AuthController = AuthController = AuthController_1 = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map