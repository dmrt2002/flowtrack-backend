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
exports.WorkflowsController = void 0;
const common_1 = require("@nestjs/common");
const unified_auth_guard_1 = require("../../auth/guards/unified-auth.guard");
const user_decorator_1 = require("../../auth/decorators/user.decorator");
const zod_validation_pipe_1 = require("../../common/pipes/zod-validation.pipe");
const workflow_configuration_service_1 = require("./services/workflow-configuration.service");
const dto_1 = require("./dto");
let WorkflowsController = class WorkflowsController {
    workflowConfigurationService;
    constructor(workflowConfigurationService) {
        this.workflowConfigurationService = workflowConfigurationService;
    }
    async getWorkflowConfiguration(user, workflowId) {
        return this.workflowConfigurationService.getWorkflowConfiguration(user.id, workflowId);
    }
    async updateWorkflowConfiguration(user, dto) {
        return this.workflowConfigurationService.updateWorkflowConfiguration(user.id, dto);
    }
};
exports.WorkflowsController = WorkflowsController;
__decorate([
    (0, common_1.Get)(':workflowId/configuration'),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Param)('workflowId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], WorkflowsController.prototype, "getWorkflowConfiguration", null);
__decorate([
    (0, common_1.Put)('configuration'),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Body)(new zod_validation_pipe_1.ZodValidationPipe(dto_1.workflowConfigurationSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], WorkflowsController.prototype, "updateWorkflowConfiguration", null);
exports.WorkflowsController = WorkflowsController = __decorate([
    (0, common_1.Controller)('workflows'),
    (0, common_1.UseGuards)(unified_auth_guard_1.UnifiedAuthGuard),
    __metadata("design:paramtypes", [workflow_configuration_service_1.WorkflowConfigurationService])
], WorkflowsController);
//# sourceMappingURL=workflows.controller.js.map