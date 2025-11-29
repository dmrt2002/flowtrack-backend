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
exports.BillingController = void 0;
const common_1 = require("@nestjs/common");
const unified_auth_guard_1 = require("../../auth/guards/unified-auth.guard");
const billing_service_1 = require("./billing.service");
const zod_validation_pipe_1 = require("../../common/pipes/zod-validation.pipe");
const user_decorator_1 = require("../../auth/decorators/user.decorator");
const dto_1 = require("./dto");
let BillingController = class BillingController {
    billingService;
    constructor(billingService) {
        this.billingService = billingService;
    }
    async getAvailablePlans() {
        return this.billingService.getAvailablePlans();
    }
    async getWorkspaceSubscription(user, workspaceId) {
        return this.billingService.getWorkspaceSubscription(user.id, workspaceId);
    }
    async getWorkspaceUsage(user, workspaceId) {
        return this.billingService.getWorkspaceUsage(user.id, workspaceId);
    }
    async createCheckoutSession(user, workspaceId, dto) {
        return this.billingService.createCheckoutSession(user.id, workspaceId, dto);
    }
    async createCustomerPortalSession(user, workspaceId) {
        return this.billingService.createCustomerPortalSession(user.id, workspaceId);
    }
    async cancelSubscription(user, workspaceId) {
        return this.billingService.cancelSubscription(user.id, workspaceId);
    }
    async reactivateSubscription(user, workspaceId) {
        return this.billingService.reactivateSubscription(user.id, workspaceId);
    }
};
exports.BillingController = BillingController;
__decorate([
    (0, common_1.Get)('plans'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "getAvailablePlans", null);
__decorate([
    (0, common_1.Get)('workspace/:workspaceId/subscription'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Param)('workspaceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "getWorkspaceSubscription", null);
__decorate([
    (0, common_1.Get)('workspace/:workspaceId/usage'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Param)('workspaceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "getWorkspaceUsage", null);
__decorate([
    (0, common_1.Post)('workspace/:workspaceId/checkout'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Param)('workspaceId')),
    __param(2, (0, common_1.Body)(new zod_validation_pipe_1.ZodValidationPipe(dto_1.createCheckoutSessionSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "createCheckoutSession", null);
__decorate([
    (0, common_1.Post)('workspace/:workspaceId/portal'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Param)('workspaceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "createCustomerPortalSession", null);
__decorate([
    (0, common_1.Post)('workspace/:workspaceId/cancel'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Param)('workspaceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "cancelSubscription", null);
__decorate([
    (0, common_1.Post)('workspace/:workspaceId/reactivate'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Param)('workspaceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "reactivateSubscription", null);
exports.BillingController = BillingController = __decorate([
    (0, common_1.Controller)('billing'),
    (0, common_1.UseGuards)(unified_auth_guard_1.UnifiedAuthGuard),
    __metadata("design:paramtypes", [billing_service_1.BillingService])
], BillingController);
//# sourceMappingURL=billing.controller.js.map