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
exports.UserService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const password_service_1 = require("../../auth/services/password.service");
let UserService = class UserService {
    prisma;
    passwordService;
    constructor(prisma, passwordService) {
        this.prisma = prisma;
        this.passwordService = passwordService;
    }
    async getUserProfile(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
                createdAt: true,
                updatedAt: true,
                hasCompletedOnboarding: true,
                emailVerifiedAt: true,
                authProvider: true,
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return user;
    }
    async updateProfile(userId, dto) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: {
                ...(dto.firstName !== undefined && { firstName: dto.firstName }),
                ...(dto.lastName !== undefined && { lastName: dto.lastName }),
                ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
                createdAt: true,
                updatedAt: true,
                hasCompletedOnboarding: true,
                emailVerifiedAt: true,
                authProvider: true,
            },
        });
        return updatedUser;
    }
    async changePassword(userId, dto) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                passwordHash: true,
                authProvider: true,
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (user.authProvider !== 'local') {
            throw new common_1.BadRequestException(`Cannot change password for ${user.authProvider} accounts. Please manage your password through ${user.authProvider}.`);
        }
        if (!user.passwordHash) {
            throw new common_1.BadRequestException('No password set for this account');
        }
        const isCurrentPasswordValid = await this.passwordService.verifyPassword(user.passwordHash, dto.currentPassword);
        if (!isCurrentPasswordValid) {
            throw new common_1.UnauthorizedException('Current password is incorrect');
        }
        const isSamePassword = await this.passwordService.verifyPassword(user.passwordHash, dto.newPassword);
        if (isSamePassword) {
            throw new common_1.BadRequestException('New password must be different from current password');
        }
        const newPasswordHash = await this.passwordService.hashPassword(dto.newPassword);
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                passwordHash: newPasswordHash,
            },
        });
        return {
            success: true,
            message: 'Password changed successfully',
        };
    }
    async getConnectedAccounts(userId) {
        const oauthAccounts = await this.prisma.oAuthCredential.findMany({
            where: { userId },
            select: {
                id: true,
                providerType: true,
                providerEmail: true,
                createdAt: true,
                isActive: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        return oauthAccounts;
    }
    async disconnectOAuthAccount(userId, credentialId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                authProvider: true,
                passwordHash: true,
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const credential = await this.prisma.oAuthCredential.findUnique({
            where: { id: credentialId },
        });
        if (!credential) {
            throw new common_1.NotFoundException('OAuth credential not found');
        }
        if (credential.userId !== userId) {
            throw new common_1.UnauthorizedException('This credential does not belong to you');
        }
        const totalOAuthAccounts = await this.prisma.oAuthCredential.count({
            where: { userId },
        });
        if (!user.passwordHash && totalOAuthAccounts === 1) {
            throw new common_1.BadRequestException('Cannot disconnect your only authentication method. Please set a password first.');
        }
        await this.prisma.oAuthCredential.delete({
            where: { id: credentialId },
        });
        return {
            success: true,
            message: 'OAuth account disconnected successfully',
        };
    }
    async deleteAccount(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                workspaceMemberships: {
                    include: {
                        workspace: {
                            select: {
                                ownerUserId: true,
                            },
                        },
                    },
                },
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const ownedWorkspaces = user.workspaceMemberships.filter((member) => member.workspace.ownerUserId === userId);
        if (ownedWorkspaces.length > 0) {
            throw new common_1.BadRequestException('Cannot delete account while owning workspaces. Please transfer ownership or delete your workspaces first.');
        }
        await this.prisma.user.delete({
            where: { id: userId },
        });
        return {
            success: true,
            message: 'Account deleted successfully',
        };
    }
};
exports.UserService = UserService;
exports.UserService = UserService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        password_service_1.PasswordService])
], UserService);
//# sourceMappingURL=user.service.js.map