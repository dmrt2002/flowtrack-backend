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
};
exports.WorkspaceService = WorkspaceService;
exports.WorkspaceService = WorkspaceService = WorkspaceService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WorkspaceService);
//# sourceMappingURL=workspace.service.js.map