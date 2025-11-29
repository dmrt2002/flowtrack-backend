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
exports.OnboardingController = void 0;
const common_1 = require("@nestjs/common");
const unified_auth_guard_1 = require("../../auth/guards/unified-auth.guard");
const user_decorator_1 = require("../../auth/decorators/user.decorator");
const zod_validation_pipe_1 = require("../../common/pipes/zod-validation.pipe");
const onboarding_service_1 = require("./services/onboarding.service");
const dto_1 = require("./dto");
let OnboardingController = class OnboardingController {
    onboardingService;
    constructor(onboardingService) {
        this.onboardingService = onboardingService;
    }
    async initOnboarding(user) {
        return this.onboardingService.getOrCreateWorkflow(user.id);
    }
    async selectStrategy(user, dto) {
        return this.onboardingService.saveStrategy(user.id, dto);
    }
    async getFormFields(user, workflowId) {
        return this.onboardingService.getFormFields(user.id, workflowId);
    }
    async saveFormFields(user, dto) {
        return this.onboardingService.saveFormFields(user.id, dto);
    }
    async saveCalendlyLink(user, dto) {
        return this.onboardingService.saveCalendlyLink(user.id, dto);
    }
    async saveSchedulingPreference(user, dto) {
        return this.onboardingService.saveSchedulingPreference(user.id, dto);
    }
    async saveConfiguration(user, dto) {
        return this.onboardingService.saveConfiguration(user.id, dto);
    }
    async confirmOAuth(user, dto) {
        return this.onboardingService.confirmOAuthConnection(user.id, dto);
    }
    async generateSimulation(user, dto) {
        return this.onboardingService.generateSimulation(user.id, dto);
    }
    async getStatus(user) {
        return this.onboardingService.getOnboardingStatus(user.id);
    }
    async activateWorkflow(user, dto) {
        return this.onboardingService.activateWorkflow(user.id, dto);
    }
};
exports.OnboardingController = OnboardingController;
__decorate([
    (0, common_1.Get)('init'),
    __param(0, (0, user_decorator_1.User)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OnboardingController.prototype, "initOnboarding", null);
__decorate([
    (0, common_1.Post)('strategy'),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Body)(new zod_validation_pipe_1.ZodValidationPipe(dto_1.strategySelectionSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], OnboardingController.prototype, "selectStrategy", null);
__decorate([
    (0, common_1.Get)('form-fields/:workflowId'),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Param)('workflowId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], OnboardingController.prototype, "getFormFields", null);
__decorate([
    (0, common_1.Put)('form-fields'),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Body)(new zod_validation_pipe_1.ZodValidationPipe(dto_1.formFieldsSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], OnboardingController.prototype, "saveFormFields", null);
__decorate([
    (0, common_1.Post)('calendly'),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Body)(new zod_validation_pipe_1.ZodValidationPipe(dto_1.calendlySchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], OnboardingController.prototype, "saveCalendlyLink", null);
__decorate([
    (0, common_1.Post)('scheduling-preference'),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Body)(new zod_validation_pipe_1.ZodValidationPipe(dto_1.schedulingPreferenceSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], OnboardingController.prototype, "saveSchedulingPreference", null);
__decorate([
    (0, common_1.Post)('configure'),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Body)(new zod_validation_pipe_1.ZodValidationPipe(dto_1.configurationSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], OnboardingController.prototype, "saveConfiguration", null);
__decorate([
    (0, common_1.Post)('oauth-complete'),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Body)(new zod_validation_pipe_1.ZodValidationPipe(dto_1.oauthCompleteSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], OnboardingController.prototype, "confirmOAuth", null);
__decorate([
    (0, common_1.Post)('simulate'),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Body)(new zod_validation_pipe_1.ZodValidationPipe(dto_1.simulationSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], OnboardingController.prototype, "generateSimulation", null);
__decorate([
    (0, common_1.Get)('status'),
    __param(0, (0, user_decorator_1.User)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OnboardingController.prototype, "getStatus", null);
__decorate([
    (0, common_1.Post)('activate'),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Body)(new zod_validation_pipe_1.ZodValidationPipe(dto_1.activateWorkflowSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], OnboardingController.prototype, "activateWorkflow", null);
exports.OnboardingController = OnboardingController = __decorate([
    (0, common_1.Controller)('onboarding'),
    (0, common_1.UseGuards)(unified_auth_guard_1.UnifiedAuthGuard),
    __metadata("design:paramtypes", [onboarding_service_1.OnboardingService])
], OnboardingController);
//# sourceMappingURL=onboarding.controller.js.map