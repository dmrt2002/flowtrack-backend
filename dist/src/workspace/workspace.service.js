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
var WorkspaceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkspaceService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const slug_util_1 = require("../common/utils/slug.util");
let WorkspaceService = WorkspaceService_1 = class WorkspaceService {
    prisma;
    logger = new common_1.Logger(WorkspaceService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getUserWorkspaces(userId) {
        const memberships = await this.prisma.workspaceMember.findMany({
            where: { userId },
            include: {
                workspace: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        return memberships.map((m) => ({
            ...m.workspace,
            role: m.role,
            membershipId: m.id,
        }));
    }
    async createWorkspace(userId, dto) {
        const baseSlug = (0, slug_util_1.generateSlug)(dto.name);
        let slug = baseSlug;
        let counter = 1;
        while (await this.prisma.workspace.findUnique({ where: { slug } })) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }
        const generateIntakeEmailId = () => {
            return Math.random().toString(36).substring(2, 12);
        };
        let intakeEmailId = generateIntakeEmailId();
        while (await this.prisma.workspace.findUnique({ where: { intakeEmailId } })) {
            intakeEmailId = generateIntakeEmailId();
        }
        const workspace = await this.prisma.$transaction(async (tx) => {
            const newWorkspace = await tx.workspace.create({
                data: {
                    name: dto.name,
                    slug,
                    intakeEmailId,
                    ownerUserId: userId,
                },
            });
            await tx.workspaceMember.create({
                data: {
                    userId,
                    workspaceId: newWorkspace.id,
                    role: 'admin',
                },
            });
            return newWorkspace;
        });
        this.logger.log(`Workspace created: ${workspace.id} by user: ${userId}`);
        return workspace;
    }
    async getWorkspaceById(userId, workspaceId) {
        const workspace = await this.prisma.workspace.findUnique({
            where: { id: workspaceId },
            include: {
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                },
            },
        });
        if (!workspace) {
            throw new common_1.NotFoundException('Workspace not found');
        }
        const membership = workspace.members.find((m) => m.userId === userId);
        if (!membership) {
            throw new common_1.ForbiddenException('You do not have access to this workspace');
        }
        return {
            ...workspace,
            role: membership.role,
        };
    }
    async getWorkspaceMembers(userId, workspaceId) {
        await this.checkUserWorkspaceAccess(userId, workspaceId);
        const memberships = await this.prisma.workspaceMember.findMany({
            where: { workspaceId },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        createdAt: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'asc',
            },
        });
        return memberships.map((m) => ({
            id: m.id,
            role: m.role,
            user: m.user,
            joinedAt: m.createdAt,
        }));
    }
    async inviteUser(userId, workspaceId, dto) {
        const membership = await this.prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId,
                },
            },
        });
        if (!membership) {
            throw new common_1.ForbiddenException('You do not have access to this workspace');
        }
        if (membership.role !== 'admin') {
            throw new common_1.ForbiddenException('Only admins can invite users');
        }
        const existingUser = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (existingUser) {
            const existingMembership = await this.prisma.workspaceMember.findUnique({
                where: {
                    workspaceId_userId: {
                        workspaceId,
                        userId: existingUser.id,
                    },
                },
            });
            if (existingMembership) {
                throw new common_1.ConflictException('User is already a member of this workspace');
            }
        }
        const workspace = await this.prisma.workspace.findUnique({
            where: { id: workspaceId },
        });
        this.logger.log(`Invitation to workspace ${workspace?.name} sent to ${dto.email}`);
        return {
            message: 'Invitation email will be sent',
            inviteId: 'pending-' + Date.now(),
        };
    }
    async checkUserWorkspaceAccess(userId, workspaceId) {
        const membership = await this.prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId,
                },
            },
        });
        if (!membership) {
            throw new common_1.ForbiddenException('You do not have access to this workspace');
        }
    }
    async getUserRole(userId, workspaceId) {
        const membership = await this.prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId,
                },
            },
        });
        if (!membership) {
            throw new common_1.ForbiddenException('You do not have access to this workspace');
        }
        return membership.role;
    }
    async updateMemberRole(userId, workspaceId, memberId, dto) {
        const requesterMembership = await this.prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId,
                },
            },
        });
        if (!requesterMembership) {
            throw new common_1.ForbiddenException('You do not have access to this workspace');
        }
        if (requesterMembership.role !== 'admin' && requesterMembership.role !== 'owner') {
            throw new common_1.ForbiddenException('Only admins and owners can change member roles');
        }
        const memberToUpdate = await this.prisma.workspaceMember.findUnique({
            where: { id: memberId },
            include: {
                workspace: true,
            },
        });
        if (!memberToUpdate || memberToUpdate.workspaceId !== workspaceId) {
            throw new common_1.NotFoundException('Member not found in this workspace');
        }
        if (memberToUpdate.role === 'owner') {
            throw new common_1.BadRequestException('Cannot change the owner\'s role. Transfer ownership instead.');
        }
        const updatedMember = await this.prisma.workspaceMember.update({
            where: { id: memberId },
            data: {
                role: dto.role,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
        this.logger.log(`Member role updated: ${updatedMember.user.email} -> ${dto.role} in workspace ${workspaceId}`);
        return {
            id: updatedMember.id,
            role: updatedMember.role,
            user: updatedMember.user,
            joinedAt: updatedMember.createdAt,
        };
    }
    async removeMember(userId, workspaceId, memberId) {
        const requesterMembership = await this.prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId,
                },
            },
        });
        if (!requesterMembership) {
            throw new common_1.ForbiddenException('You do not have access to this workspace');
        }
        if (requesterMembership.role !== 'admin' && requesterMembership.role !== 'owner') {
            throw new common_1.ForbiddenException('Only admins and owners can remove members');
        }
        const memberToRemove = await this.prisma.workspaceMember.findUnique({
            where: { id: memberId },
            include: {
                user: {
                    select: {
                        email: true,
                    },
                },
            },
        });
        if (!memberToRemove || memberToRemove.workspaceId !== workspaceId) {
            throw new common_1.NotFoundException('Member not found in this workspace');
        }
        if (memberToRemove.role === 'owner') {
            throw new common_1.BadRequestException('Cannot remove the workspace owner');
        }
        if (memberToRemove.userId === userId) {
            throw new common_1.BadRequestException('Use the leave endpoint to remove yourself from the workspace');
        }
        await this.prisma.workspaceMember.delete({
            where: { id: memberId },
        });
        this.logger.log(`Member removed: ${memberToRemove.user.email} from workspace ${workspaceId}`);
        return {
            success: true,
            message: 'Member removed successfully',
        };
    }
    async transferOwnership(userId, workspaceId, dto) {
        const workspace = await this.prisma.workspace.findUnique({
            where: { id: workspaceId },
            include: {
                members: {
                    where: {
                        userId,
                    },
                },
            },
        });
        if (!workspace) {
            throw new common_1.NotFoundException('Workspace not found');
        }
        if (workspace.ownerUserId !== userId) {
            throw new common_1.ForbiddenException('Only the workspace owner can transfer ownership');
        }
        const newOwnerMembership = await this.prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId: dto.newOwnerId,
                },
            },
        });
        if (!newOwnerMembership) {
            throw new common_1.BadRequestException('New owner must be a member of the workspace');
        }
        await this.prisma.$transaction(async (tx) => {
            await tx.workspace.update({
                where: { id: workspaceId },
                data: {
                    ownerUserId: dto.newOwnerId,
                },
            });
            await tx.workspaceMember.update({
                where: {
                    workspaceId_userId: {
                        workspaceId,
                        userId: dto.newOwnerId,
                    },
                },
                data: {
                    role: 'owner',
                },
            });
            await tx.workspaceMember.update({
                where: {
                    workspaceId_userId: {
                        workspaceId,
                        userId,
                    },
                },
                data: {
                    role: 'admin',
                },
            });
        });
        this.logger.log(`Ownership transferred in workspace ${workspaceId}: ${userId} -> ${dto.newOwnerId}`);
        return {
            success: true,
            message: 'Ownership transferred successfully',
        };
    }
    async leaveWorkspace(userId, workspaceId) {
        const membership = await this.prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId,
                },
            },
        });
        if (!membership) {
            throw new common_1.NotFoundException('You are not a member of this workspace');
        }
        if (membership.role === 'owner') {
            throw new common_1.BadRequestException('Workspace owners cannot leave. Please transfer ownership first.');
        }
        await this.prisma.workspaceMember.delete({
            where: { id: membership.id },
        });
        this.logger.log(`User ${userId} left workspace ${workspaceId}`);
        return {
            success: true,
            message: 'You have left the workspace',
        };
    }
    async updateWorkspace(userId, workspaceId, dto) {
        const membership = await this.prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId,
                },
            },
        });
        if (!membership) {
            throw new common_1.ForbiddenException('You do not have access to this workspace');
        }
        if (membership.role !== 'admin' && membership.role !== 'owner') {
            throw new common_1.ForbiddenException('Only admins and owners can update workspace settings');
        }
        let slug;
        if (dto.name) {
            const baseSlug = (0, slug_util_1.generateSlug)(dto.name);
            slug = baseSlug;
            let counter = 1;
            while (await this.prisma.workspace.findFirst({
                where: {
                    slug,
                    id: { not: workspaceId },
                },
            })) {
                slug = `${baseSlug}-${counter}`;
                counter++;
            }
        }
        const updatedWorkspace = await this.prisma.workspace.update({
            where: { id: workspaceId },
            data: {
                ...(dto.name && { name: dto.name }),
                ...(slug && { slug }),
            },
        });
        this.logger.log(`Workspace updated: ${workspaceId}`);
        return updatedWorkspace;
    }
    async deleteWorkspace(userId, workspaceId) {
        const workspace = await this.prisma.workspace.findUnique({
            where: { id: workspaceId },
        });
        if (!workspace) {
            throw new common_1.NotFoundException('Workspace not found');
        }
        if (workspace.ownerUserId !== userId) {
            throw new common_1.ForbiddenException('Only the workspace owner can delete the workspace');
        }
        await this.prisma.workspace.delete({
            where: { id: workspaceId },
        });
        this.logger.log(`Workspace deleted: ${workspaceId} by user: ${userId}`);
        return {
            success: true,
            message: 'Workspace deleted successfully',
        };
    }
};
exports.WorkspaceService = WorkspaceService;
exports.WorkspaceService = WorkspaceService = WorkspaceService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WorkspaceService);
//# sourceMappingURL=workspace.service.js.map