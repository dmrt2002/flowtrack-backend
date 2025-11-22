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
var TaskService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const project_service_1 = require("../project/project.service");
let TaskService = TaskService_1 = class TaskService {
    prisma;
    projectService;
    logger = new common_1.Logger(TaskService_1.name);
    constructor(prisma, projectService) {
        this.prisma = prisma;
        this.projectService = projectService;
    }
    async getProjectTasks(userId, projectId) {
        await this.projectService.getProjectById(userId, projectId);
        return this.prisma.task.findMany({
            where: { projectId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async createTask(userId, dto) {
        await this.projectService.getProjectById(userId, dto.projectId);
        const task = await this.prisma.task.create({
            data: {
                title: dto.title,
                description: dto.description,
                projectId: dto.projectId,
            },
        });
        this.logger.log(`Task created: ${task.id} by user: ${userId}`);
        return task;
    }
    async updateTask(userId, taskId, dto) {
        const task = await this.prisma.task.findUnique({
            where: { id: taskId },
        });
        if (!task) {
            throw new common_1.NotFoundException('Task not found');
        }
        await this.projectService.getProjectById(userId, task.projectId);
        const updated = await this.prisma.task.update({
            where: { id: taskId },
            data: {
                ...(dto.title && { title: dto.title }),
                ...(dto.description !== undefined && { description: dto.description }),
                ...(dto.isComplete !== undefined && { isComplete: dto.isComplete }),
            },
        });
        this.logger.log(`Task updated: ${taskId} by user: ${userId}`);
        return updated;
    }
    async deleteTask(userId, taskId) {
        const task = await this.prisma.task.findUnique({
            where: { id: taskId },
        });
        if (!task) {
            throw new common_1.NotFoundException('Task not found');
        }
        await this.projectService.getProjectById(userId, task.projectId);
        await this.prisma.task.delete({
            where: { id: taskId },
        });
        this.logger.log(`Task deleted: ${taskId} by user: ${userId}`);
        return { message: 'Task deleted successfully' };
    }
};
exports.TaskService = TaskService;
exports.TaskService = TaskService = TaskService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        project_service_1.ProjectService])
], TaskService);
//# sourceMappingURL=task.service.js.map