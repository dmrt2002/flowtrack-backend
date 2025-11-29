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
exports.WorkflowConfigurationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
let WorkflowConfigurationService = class WorkflowConfigurationService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getWorkflowConfiguration(userId, workflowId) {
        const workflow = await this.prisma.workflow.findUnique({
            where: { id: workflowId },
            include: {
                workspace: {
                    include: {
                        members: true,
                    },
                },
            },
        });
        if (!workflow) {
            throw new common_1.NotFoundException('Workflow not found');
        }
        const hasAccess = workflow.workspace.members.some((member) => member.userId === userId);
        if (!hasAccess) {
            throw new common_1.ForbiddenException('You do not have access to this workflow');
        }
        const config = workflow.configurationData || {};
        return {
            success: true,
            data: {
                workflowId: workflow.id,
                welcomeSubject: config.welcomeSubject || null,
                welcomeBody: config.welcomeBody || null,
                thankYouSubject: config.thankYouSubject || null,
                thankYouBody: config.thankYouBody || null,
                followUpSubject: config.followUpSubject || null,
                followUpBody: config.followUpBody || null,
                followUpDelayDays: config.followUpDelayDays || null,
                deadlineDays: config.deadlineDays || null,
            },
        };
    }
    async updateWorkflowConfiguration(userId, dto) {
        const workflow = await this.prisma.workflow.findUnique({
            where: { id: dto.workflowId },
            include: {
                workspace: {
                    include: {
                        members: true,
                    },
                },
            },
        });
        if (!workflow) {
            throw new common_1.NotFoundException('Workflow not found');
        }
        const hasAccess = workflow.workspace.members.some((member) => member.userId === userId);
        if (!hasAccess) {
            throw new common_1.ForbiddenException('You do not have access to this workflow');
        }
        const existingConfig = workflow.configurationData || {};
        const updatedConfig = {
            ...existingConfig,
            ...(dto.welcomeSubject !== undefined && { welcomeSubject: dto.welcomeSubject }),
            ...(dto.welcomeBody !== undefined && { welcomeBody: dto.welcomeBody }),
            ...(dto.thankYouSubject !== undefined && { thankYouSubject: dto.thankYouSubject }),
            ...(dto.thankYouBody !== undefined && { thankYouBody: dto.thankYouBody }),
            ...(dto.followUpSubject !== undefined && { followUpSubject: dto.followUpSubject }),
            ...(dto.followUpBody !== undefined && { followUpBody: dto.followUpBody }),
            ...(dto.followUpDelayDays !== undefined && { followUpDelayDays: dto.followUpDelayDays }),
            ...(dto.deadlineDays !== undefined && { deadlineDays: dto.deadlineDays }),
        };
        const updatedWorkflow = await this.prisma.workflow.update({
            where: { id: dto.workflowId },
            data: {
                configurationData: updatedConfig,
                updatedAt: new Date(),
            },
        });
        return {
            success: true,
            message: 'Workflow configuration updated successfully',
            data: {
                workflowId: updatedWorkflow.id,
                welcomeSubject: updatedConfig.welcomeSubject || null,
                welcomeBody: updatedConfig.welcomeBody || null,
                thankYouSubject: updatedConfig.thankYouSubject || null,
                thankYouBody: updatedConfig.thankYouBody || null,
                followUpSubject: updatedConfig.followUpSubject || null,
                followUpBody: updatedConfig.followUpBody || null,
                followUpDelayDays: updatedConfig.followUpDelayDays || null,
                deadlineDays: updatedConfig.deadlineDays || null,
            },
        };
    }
};
exports.WorkflowConfigurationService = WorkflowConfigurationService;
exports.WorkflowConfigurationService = WorkflowConfigurationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WorkflowConfigurationService);
//# sourceMappingURL=workflow-configuration.service.js.map