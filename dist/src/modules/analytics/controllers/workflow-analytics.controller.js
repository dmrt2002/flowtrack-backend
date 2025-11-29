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
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowAnalyticsController = void 0;
const common_1 = require("@nestjs/common");
const unified_auth_guard_1 = require("../../../auth/guards/unified-auth.guard");
const workflow_analytics_service_1 = require("../services/workflow-analytics.service");
const workflow_analytics_dto_1 = require("../dto/workflow-analytics.dto");
let WorkflowAnalyticsController = class WorkflowAnalyticsController {
    analyticsService;
    constructor(analyticsService) {
        this.analyticsService = analyticsService;
    }
    async getWorkflowAnalytics(workflowId, query) {
        return this.analyticsService.getWorkflowAnalytics(workflowId, query);
    }
    async getFormPerformance(workflowId, query) {
        const { startDate, endDate, previousStartDate, previousEndDate } = this.getDateRanges(query.period || '30d');
        return this.analyticsService.getFormPerformanceMetrics(workflowId, startDate, endDate, previousStartDate, previousEndDate);
    }
    async getTimeSeries(workflowId, query) {
        const { startDate, endDate } = this.getDateRanges(query.period || '30d');
        return this.analyticsService.getSubmissionsTimeSeries(workflowId, startDate, endDate);
    }
    async getLeadSources(workflowId, query) {
        const { startDate, endDate } = this.getDateRanges(query.period || '30d');
        return this.analyticsService.getTopLeadSources(workflowId, startDate, endDate, 5);
    }
    async getRecentSubmissions(workflowId, query) {
        return this.analyticsService.getRecentSubmissions(workflowId, query.recentLimit || 10);
    }
    getDateRanges(period) {
        const endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
        const startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - days + 1);
        startDate.setHours(0, 0, 0, 0);
        const previousEndDate = new Date(startDate);
        previousEndDate.setDate(previousEndDate.getDate() - 1);
        previousEndDate.setHours(23, 59, 59, 999);
        const previousStartDate = new Date(previousEndDate);
        previousStartDate.setDate(previousStartDate.getDate() - days + 1);
        previousStartDate.setHours(0, 0, 0, 0);
        return {
            startDate,
            endDate,
            previousStartDate,
            previousEndDate,
        };
    }
};
exports.WorkflowAnalyticsController = WorkflowAnalyticsController;
__decorate([
    (0, common_1.Get)(':workflowId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('workflowId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, workflow_analytics_dto_1.WorkflowAnalyticsQueryDto]),
    __metadata("design:returntype", Promise)
], WorkflowAnalyticsController.prototype, "getWorkflowAnalytics", null);
__decorate([
    (0, common_1.Get)(':workflowId/performance'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('workflowId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, workflow_analytics_dto_1.WorkflowAnalyticsQueryDto]),
    __metadata("design:returntype", Promise)
], WorkflowAnalyticsController.prototype, "getFormPerformance", null);
__decorate([
    (0, common_1.Get)(':workflowId/time-series'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('workflowId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, workflow_analytics_dto_1.WorkflowAnalyticsQueryDto]),
    __metadata("design:returntype", Promise)
], WorkflowAnalyticsController.prototype, "getTimeSeries", null);
__decorate([
    (0, common_1.Get)(':workflowId/sources'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('workflowId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, workflow_analytics_dto_1.WorkflowAnalyticsQueryDto]),
    __metadata("design:returntype", Promise)
], WorkflowAnalyticsController.prototype, "getLeadSources", null);
__decorate([
    (0, common_1.Get)(':workflowId/recent'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('workflowId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, workflow_analytics_dto_1.WorkflowAnalyticsQueryDto]),
    __metadata("design:returntype", Promise)
], WorkflowAnalyticsController.prototype, "getRecentSubmissions", null);
exports.WorkflowAnalyticsController = WorkflowAnalyticsController = __decorate([
    (0, common_1.Controller)('analytics/workflows'),
    (0, common_1.UseGuards)(unified_auth_guard_1.UnifiedAuthGuard),
    __metadata("design:paramtypes", [workflow_analytics_service_1.WorkflowAnalyticsService])
], WorkflowAnalyticsController);
//# sourceMappingURL=workflow-analytics.controller.js.map