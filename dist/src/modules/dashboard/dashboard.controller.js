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
var DashboardController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const common_1 = require("@nestjs/common");
const unified_auth_guard_1 = require("../../auth/guards/unified-auth.guard");
const user_decorator_1 = require("../../auth/decorators/user.decorator");
const zod_validation_pipe_1 = require("../../common/pipes/zod-validation.pipe");
const dashboard_service_1 = require("./dashboard.service");
const dto_1 = require("./dto");
let DashboardController = DashboardController_1 = class DashboardController {
    dashboardService;
    logger = new common_1.Logger(DashboardController_1.name);
    constructor(dashboardService) {
        this.dashboardService = dashboardService;
    }
    async getDashboardOverview(user, query) {
        this.logger.log(`Dashboard overview requested by user: ${user.email}, workspace: ${user.id}`);
        const workspaceId = await this.getUserWorkspaceId(user.id);
        return this.dashboardService.getDashboardOverview(workspaceId, query);
    }
    async getActiveWorkflow(user) {
        this.logger.log(`Active workflow requested by user: ${user.email}`);
        const workspaceId = await this.getUserWorkspaceId(user.id);
        return this.dashboardService.getActiveWorkflow(workspaceId);
    }
    async getDashboardMetrics(user, query) {
        this.logger.log(`Dashboard metrics requested by user: ${user.email}`);
        const workspaceId = await this.getUserWorkspaceId(user.id);
        return this.dashboardService.getDashboardMetrics(workspaceId, query);
    }
    async getLeads(user, query) {
        this.logger.log(`Leads list requested by user: ${user.email}`);
        const workspaceId = await this.getUserWorkspaceId(user.id);
        return this.dashboardService.getRecentLeads(workspaceId, query);
    }
    async getUserWorkspaceId(userId) {
        const user = await this.dashboardService['prisma'].user.findUnique({
            where: { id: userId },
            include: {
                ownedWorkspaces: true,
                workspaceMemberships: {
                    include: {
                        workspace: true,
                    },
                },
            },
        });
        if (!user) {
            throw new Error('User not found');
        }
        const workspace = user.ownedWorkspaces[0] ||
            user.workspaceMemberships[0]?.workspace ||
            null;
        if (!workspace) {
            throw new Error('No workspace found for user');
        }
        return workspace.id;
    }
};
exports.DashboardController = DashboardController;
__decorate([
    (0, common_1.Get)('overview'),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Query)(new zod_validation_pipe_1.ZodValidationPipe(dto_1.dashboardOverviewQuerySchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getDashboardOverview", null);
__decorate([
    (0, common_1.Get)('workflow'),
    __param(0, (0, user_decorator_1.User)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getActiveWorkflow", null);
__decorate([
    (0, common_1.Get)('metrics'),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Query)(new zod_validation_pipe_1.ZodValidationPipe(dto_1.metricsQuerySchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getDashboardMetrics", null);
__decorate([
    (0, common_1.Get)('leads'),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Query)(new zod_validation_pipe_1.ZodValidationPipe(dto_1.leadsListQuerySchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getLeads", null);
exports.DashboardController = DashboardController = DashboardController_1 = __decorate([
    (0, common_1.Controller)('dashboard'),
    (0, common_1.UseGuards)(unified_auth_guard_1.UnifiedAuthGuard),
    __metadata("design:paramtypes", [dashboard_service_1.DashboardService])
], DashboardController);
//# sourceMappingURL=dashboard.controller.js.map