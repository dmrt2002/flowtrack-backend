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
exports.HotboxController = void 0;
const common_1 = require("@nestjs/common");
const unified_auth_guard_1 = require("../../../auth/guards/unified-auth.guard");
const message_service_1 = require("../services/message.service");
const zod_validation_pipe_1 = require("../../../common/pipes/zod-validation.pipe");
const hotbox_dto_1 = require("../dto/hotbox.dto");
let HotboxController = class HotboxController {
    messageService;
    constructor(messageService) {
        this.messageService = messageService;
    }
    async getConversationsNeedingReply(workspaceId, query) {
        return this.messageService.getConversationsNeedingReply(workspaceId, query.limit, query.offset);
    }
    async getConversationsSentOnly(workspaceId, query) {
        return this.messageService.getConversationsSentOnly(workspaceId, query.limit, query.offset);
    }
};
exports.HotboxController = HotboxController;
__decorate([
    (0, common_1.Get)('needs-reply'),
    __param(0, (0, common_1.Param)('workspaceId')),
    __param(1, (0, common_1.Query)(new zod_validation_pipe_1.ZodValidationPipe(hotbox_dto_1.getHotboxConversationsSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], HotboxController.prototype, "getConversationsNeedingReply", null);
__decorate([
    (0, common_1.Get)('sent'),
    __param(0, (0, common_1.Param)('workspaceId')),
    __param(1, (0, common_1.Query)(new zod_validation_pipe_1.ZodValidationPipe(hotbox_dto_1.getHotboxConversationsSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], HotboxController.prototype, "getConversationsSentOnly", null);
exports.HotboxController = HotboxController = __decorate([
    (0, common_1.Controller)('workspaces/:workspaceId/hotbox'),
    (0, common_1.UseGuards)(unified_auth_guard_1.UnifiedAuthGuard),
    __metadata("design:paramtypes", [message_service_1.MessageService])
], HotboxController);
//# sourceMappingURL=hotbox.controller.js.map