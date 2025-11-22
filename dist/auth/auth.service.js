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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const clerk_sdk_node_1 = require("@clerk/clerk-sdk-node");
const config_1 = require("@nestjs/config");
const password_service_1 = require("./services/password.service");
const token_service_1 = require("./services/token.service");
const email_service_1 = require("./services/email.service");
const rate_limit_service_1 = require("./services/rate-limit.service");
let AuthService = AuthService_1 = class AuthService {
    prisma;
    configService;
    passwordService;
    tokenService;
    emailService;
    rateLimitService;
    logger = new common_1.Logger(AuthService_1.name);
    clerkClient;
    constructor(prisma, configService, passwordService, tokenService, emailService, rateLimitService) {
        this.prisma = prisma;
        this.configService = configService;
        this.passwordService = passwordService;
        this.tokenService = tokenService;
        this.emailService = emailService;
        this.rateLimitService = rateLimitService;
        const secretKey = this.configService.get('CLERK_SECRET_KEY');
        if (!secretKey) {
            throw new Error('CLERK_SECRET_KEY is not configured');
        }
        this.clerkClient = (0, clerk_sdk_node_1.createClerkClient)({ secretKey });
    }
    async getOrCreateUser(authId) {
        let user = await this.prisma.user.findUnique({
            where: { clerkUserId: authId },
        });
        if (user) {
            return user;
        }
        try {
            const clerkUser = await this.clerkClient.users.getUser(authId);
            const email = clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress || clerkUser.emailAddresses[0]?.emailAddress;
            if (!email) {
                throw new Error('User has no email address');
            }
            user = await this.prisma.user.create({
                data: {
                    clerkUserId: authId,
                    email,
                    firstName: clerkUser.firstName || null,
                    lastName: clerkUser.lastName || null,
                    avatarUrl: clerkUser.imageUrl || null,
                    authProvider: 'clerk',
                    emailVerifiedAt: new Date(),
                },
            });
            this.logger.log(`Created new user: ${user.id} (${email})`);
            return user;
        }
        catch (error) {
            this.logger.error(`Failed to create user from Clerk: ${authId}`, error);
            throw error;
        }
    }
    async syncUserFromClerk(authId) {
        try {
            const clerkUser = await this.clerkClient.users.getUser(authId);
            const email = clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress || clerkUser.emailAddresses[0]?.emailAddress;
            if (!email) {
                throw new Error('User has no email address');
            }
            const user = await this.prisma.user.upsert({
                where: { clerkUserId: authId },
                update: {
                    email,
                    firstName: clerkUser.firstName || null,
                    lastName: clerkUser.lastName || null,
                    avatarUrl: clerkUser.imageUrl || null,
                },
                create: {
                    clerkUserId: authId,
                    email,
                    firstName: clerkUser.firstName || null,
                    lastName: clerkUser.lastName || null,
                    avatarUrl: clerkUser.imageUrl || null,
                    authProvider: 'clerk',
                    emailVerifiedAt: new Date(),
                },
            });
            this.logger.log(`Synced user: ${user.id} (${email})`);
            return user;
        }
        catch (error) {
            this.logger.error(`Failed to sync user from Clerk: ${authId}`, error);
            throw error;
        }
    }
    async registerLocal(dto, ipAddress, userAgent) {
        const existingUser = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (existingUser) {
            throw new common_1.ConflictException('Email already registered');
        }
        const passwordHash = await this.passwordService.hashPassword(dto.password);
        const verificationToken = this.tokenService.generateEmailVerificationToken();
        const verificationExpiry = new Date();
        verificationExpiry.setHours(verificationExpiry.getHours() + 24);
        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                passwordHash,
                firstName: dto.firstName || null,
                lastName: dto.lastName || null,
                authProvider: 'local',
                emailVerificationToken: verificationToken,
                emailVerificationExpiry: verificationExpiry,
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                authProvider: true,
                createdAt: true,
            },
        });
        try {
            await this.emailService.sendVerificationEmail(user.email, verificationToken);
        }
        catch (error) {
            this.logger.error(`Failed to send verification email: ${error.message}`);
        }
        const tokens = await this.generateTokensForUser(user.id, user.email, ipAddress, userAgent);
        this.logger.log(`New local user registered: ${user.id} (${user.email})`);
        return {
            user,
            ...tokens,
            message: 'Registration successful. Please check your email to verify your account.',
        };
    }
    async validateLocalUser(email, password, ipAddress, userAgent) {
        await this.rateLimitService.validateLoginAttempt(email, ipAddress);
        const user = await this.prisma.user.findUnique({
            where: { email },
        });
        if (!user || user.authProvider !== 'local' || !user.passwordHash) {
            await this.rateLimitService.recordFailedLogin(email, ipAddress, userAgent, 'invalid_credentials');
            return null;
        }
        const isPasswordValid = await this.passwordService.verifyPassword(user.passwordHash, password);
        if (!isPasswordValid) {
            await this.rateLimitService.recordFailedLogin(email, ipAddress, userAgent, 'invalid_password');
            return null;
        }
        if (!user.emailVerifiedAt) {
            await this.rateLimitService.recordFailedLogin(email, ipAddress, userAgent, 'email_not_verified');
            throw new common_1.UnauthorizedException('Email not verified. Please verify your email before logging in.');
        }
        await this.rateLimitService.recordSuccessfulLogin(email, ipAddress, userAgent);
        this.logger.log(`Successful login: ${user.id} (${email})`);
        return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            avatarUrl: user.avatarUrl,
            authProvider: user.authProvider,
        };
    }
    async generateTokensForUser(userId, email, ipAddress, userAgent) {
        const accessToken = this.tokenService.generateAccessToken(userId, email);
        const refreshTokenData = await this.tokenService.generateRefreshToken(userId, ipAddress, userAgent);
        return {
            accessToken,
            refreshToken: refreshTokenData.token,
            expiresAt: refreshTokenData.expiresAt,
        };
    }
    async refreshTokens(refreshToken, ipAddress, userAgent) {
        const newRefreshTokenData = await this.tokenService.rotateRefreshToken(refreshToken, ipAddress, userAgent);
        const { userId } = await this.tokenService.verifyRefreshToken(newRefreshTokenData.token);
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { email: true },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
        }
        const accessToken = this.tokenService.generateAccessToken(userId, user.email);
        return {
            accessToken,
            refreshToken: newRefreshTokenData.token,
            expiresAt: newRefreshTokenData.expiresAt,
        };
    }
    async forgotPassword(email) {
        this.logger.log(`📧 Forgot password request received for: ${email}`);
        const user = await this.prisma.user.findUnique({
            where: { email },
        });
        if (!user || user.authProvider !== 'local') {
            this.logger.warn(`⚠️ User not found or not local auth: ${email}`);
            return {
                message: 'If the email exists, a password reset link has been sent.',
            };
        }
        this.logger.log(`✅ User found: ${user.id}`);
        const resetToken = await this.tokenService.generatePasswordResetToken(user.id);
        this.logger.log(`🔑 Reset token generated for user: ${user.id}`);
        try {
            await this.emailService.sendPasswordResetEmail(email, resetToken);
            this.logger.log(`✉️ Reset email sent successfully to: ${email}`);
        }
        catch (error) {
            this.logger.error(`❌ Failed to send password reset email: ${error.message}`);
            this.logger.error(error.stack);
        }
        this.logger.log(`✅ Password reset process completed for: ${email}`);
        return {
            message: 'If the email exists, a password reset link has been sent.',
        };
    }
    async resetPassword(token, newPassword) {
        const { userId } = await this.tokenService.verifyPasswordResetToken(token);
        const passwordHash = await this.passwordService.hashPassword(newPassword);
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                passwordHash,
                passwordChangedAt: new Date(),
            },
        });
        await this.tokenService.markPasswordResetTokenAsUsed(token);
        await this.tokenService.revokeAllUserTokens(userId);
        this.logger.log(`Password reset successful for user: ${userId}`);
        return {
            message: 'Password reset successful. Please login with your new password.',
        };
    }
    async verifyEmail(token) {
        const user = await this.prisma.user.findFirst({
            where: {
                emailVerificationToken: token,
                emailVerificationExpiry: {
                    gte: new Date(),
                },
            },
        });
        if (!user) {
            throw new common_1.BadRequestException('Invalid or expired verification token');
        }
        if (user.emailVerifiedAt) {
            return { message: 'Email already verified' };
        }
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerifiedAt: new Date(),
                emailVerificationToken: null,
                emailVerificationExpiry: null,
            },
        });
        try {
            await this.emailService.sendWelcomeEmail(user.email, user.firstName || null);
        }
        catch (error) {
            this.logger.error(`Failed to send welcome email: ${error.message}`);
        }
        this.logger.log(`Email verified for user: ${user.id} (${user.email})`);
        return { message: 'Email verified successfully. You can now login.' };
    }
    async resendVerification(email) {
        const user = await this.prisma.user.findUnique({
            where: { email },
        });
        if (!user || user.authProvider !== 'local') {
            return {
                message: 'If the email exists, a verification link has been sent.',
            };
        }
        if (user.emailVerifiedAt) {
            throw new common_1.BadRequestException('Email already verified');
        }
        const verificationToken = this.tokenService.generateEmailVerificationToken();
        const verificationExpiry = new Date();
        verificationExpiry.setHours(verificationExpiry.getHours() + 24);
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerificationToken: verificationToken,
                emailVerificationExpiry: verificationExpiry,
            },
        });
        try {
            await this.emailService.sendVerificationEmail(email, verificationToken);
        }
        catch (error) {
            this.logger.error(`Failed to send verification email: ${error.message}`);
        }
        this.logger.log(`Verification email resent to: ${email}`);
        return {
            message: 'If the email exists, a verification link has been sent.',
        };
    }
    async logout(refreshToken) {
        await this.tokenService.revokeRefreshToken(refreshToken);
        return { message: 'Logged out successfully' };
    }
    async logoutAll(userId) {
        await this.tokenService.revokeAllUserTokens(userId);
        return { message: 'Logged out from all devices successfully' };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService,
        password_service_1.PasswordService,
        token_service_1.TokenService,
        email_service_1.EmailService,
        rate_limit_service_1.RateLimitService])
], AuthService);
//# sourceMappingURL=auth.service.js.map