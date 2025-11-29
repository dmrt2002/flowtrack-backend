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
var TokenService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../../prisma/prisma.service");
const crypto_1 = require("crypto");
let TokenService = TokenService_1 = class TokenService {
    jwtService;
    prisma;
    configService;
    logger = new common_1.Logger(TokenService_1.name);
    constructor(jwtService, prisma, configService) {
        this.jwtService = jwtService;
        this.prisma = prisma;
        this.configService = configService;
    }
    generateAccessToken(userId, email) {
        const payload = { userId, email };
        return this.jwtService.sign(payload);
    }
    async generateRefreshToken(userId, ipAddress, userAgent) {
        const rawToken = (0, crypto_1.randomBytes)(32).toString('hex');
        const hashedToken = (0, crypto_1.createHash)('sha256').update(rawToken).digest('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        const refreshToken = await this.prisma.refreshToken.create({
            data: {
                userId,
                token: hashedToken,
                expiresAt,
                ipAddress,
                userAgent,
            },
        });
        return {
            id: refreshToken.id,
            token: rawToken,
            expiresAt: refreshToken.expiresAt,
        };
    }
    async verifyRefreshToken(rawToken) {
        const hashedToken = (0, crypto_1.createHash)('sha256').update(rawToken).digest('hex');
        const refreshToken = await this.prisma.refreshToken.findUnique({
            where: { token: hashedToken },
            include: { user: true },
        });
        if (!refreshToken) {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
        if (refreshToken.isRevoked) {
            this.logger.warn(`Revoked refresh token used: ${refreshToken.id} by user: ${refreshToken.userId}`);
            throw new common_1.UnauthorizedException('Refresh token has been revoked');
        }
        if (new Date() > refreshToken.expiresAt) {
            throw new common_1.UnauthorizedException('Refresh token has expired');
        }
        return { userId: refreshToken.userId };
    }
    async rotateRefreshToken(oldRawToken, ipAddress, userAgent) {
        const { userId } = await this.verifyRefreshToken(oldRawToken);
        const hashedOldToken = (0, crypto_1.createHash)('sha256')
            .update(oldRawToken)
            .digest('hex');
        await this.prisma.refreshToken.update({
            where: { token: hashedOldToken },
            data: {
                isRevoked: true,
                revokedAt: new Date(),
            },
        });
        return this.generateRefreshToken(userId, ipAddress, userAgent);
    }
    async revokeRefreshToken(rawToken) {
        const hashedToken = (0, crypto_1.createHash)('sha256').update(rawToken).digest('hex');
        await this.prisma.refreshToken.updateMany({
            where: { token: hashedToken },
            data: {
                isRevoked: true,
                revokedAt: new Date(),
            },
        });
    }
    async revokeAllUserTokens(userId) {
        await this.prisma.refreshToken.updateMany({
            where: {
                userId,
                isRevoked: false,
            },
            data: {
                isRevoked: true,
                revokedAt: new Date(),
            },
        });
        this.logger.log(`Revoked all refresh tokens for user: ${userId}`);
    }
    async generatePasswordResetToken(userId) {
        const token = (0, crypto_1.randomBytes)(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);
        await this.prisma.passwordResetToken.create({
            data: {
                userId,
                token,
                expiresAt,
            },
        });
        return token;
    }
    async verifyPasswordResetToken(token) {
        const resetToken = await this.prisma.passwordResetToken.findUnique({
            where: { token },
        });
        if (!resetToken) {
            throw new common_1.UnauthorizedException('Invalid password reset token');
        }
        if (resetToken.isUsed) {
            throw new common_1.UnauthorizedException('Password reset token has already been used');
        }
        if (new Date() > resetToken.expiresAt) {
            throw new common_1.UnauthorizedException('Password reset token has expired');
        }
        return { userId: resetToken.userId };
    }
    async markPasswordResetTokenAsUsed(token) {
        await this.prisma.passwordResetToken.update({
            where: { token },
            data: {
                isUsed: true,
                usedAt: new Date(),
            },
        });
    }
    generateEmailVerificationToken() {
        return (0, crypto_1.randomBytes)(32).toString('hex');
    }
};
exports.TokenService = TokenService;
exports.TokenService = TokenService = TokenService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        prisma_service_1.PrismaService,
        config_1.ConfigService])
], TokenService);
//# sourceMappingURL=token.service.js.map