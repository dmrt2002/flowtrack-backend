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
var ProjectService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const workspace_service_1 = require("../workspace/workspace.service");
let ProjectService = ProjectService_1 = class ProjectService {
    prisma;
    workspaceService;
    logger = new common_1.Logger(ProjectService_1.name);
    constructor(prisma, workspaceService) {
        this.prisma = prisma;
        this.workspaceService = workspaceService;
    }
    async getWorkspaceProjects(userId, workspaceId) {
        await this.workspaceService.checkUserWorkspaceAccess(userId, workspaceId);
        const projects = await this.prisma.project.findMany({
            where: { workspaceId },
            include: {
                _count: {
                    select: { tasks: true },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        return projects.map((project) => ({
            ...project,
            taskCount: project._count.tasks,
        }));
    }
    async createProject(userId, dto) {
        await this.workspaceService.checkUserWorkspaceAccess(userId, dto.workspaceId);
        const project = await this.prisma.project.create({
            data: {
                name: dto.name,
                description: dto.description,
                workspaceId: dto.workspaceId,
            },
        });
        this.logger.log(`Project created: ${project.id} by user: ${userId}`);
        return project;
    }
    async getProjectById(userId, projectId) {
        const project = await this.prisma.project.findUnique({
            where: { id: projectId },
            include: {
                workspace: true,
                tasks: {
                    orderBy: {
                        createdAt: 'desc',
                    },
                },
            },
        });
        if (!project) {
            throw new common_1.NotFoundException('Project not found');
        }
        await this.workspaceService.checkUserWorkspaceAccess(userId, project.workspaceId);
        return project;
    }
    async updateProject(userId, projectId, dto) {
        const project = await this.prisma.project.findUnique({
            where: { id: projectId },
        });
        if (!project) {
            throw new common_1.NotFoundException('Project not found');
        }
        await this.workspaceService.checkUserWorkspaceAccess(userId, project.workspaceId);
        const updatedProject = await this.prisma.project.update({
            where: { id: projectId },
            data: {
                ...(dto.name && { name: dto.name }),
                ...(dto.description !== undefined && { description: dto.description }),
            },
        });
        this.logger.log(`Project updated: ${projectId} by user: ${userId}`);
        return updatedProject;
    }
    async deleteProject(userId, projectId) {
        const project = await this.prisma.project.findUnique({
            where: { id: projectId },
        });
        if (!project) {
            throw new common_1.NotFoundException('Project not found');
        }
        const role = await this.workspaceService.getUserRole(userId, project.workspaceId);
        if (role !== 'admin') {
            throw new common_1.ForbiddenException('Only admins can delete projects');
        }
        await this.prisma.project.delete({
            where: { id: projectId },
        });
        this.logger.log(`Project deleted: ${projectId} by user: ${userId}`);
        return { message: 'Project deleted successfully' };
    }
};
exports.ProjectService = ProjectService;
exports.ProjectService = ProjectService = ProjectService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        workspace_service_1.WorkspaceService])
], ProjectService);
//# sourceMappingURL=project.service.js.map