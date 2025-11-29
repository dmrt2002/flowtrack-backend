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
exports.EmailTrackingController = void 0;
const common_1 = require("@nestjs/common");
const public_decorator_1 = require("../../../auth/decorators/public.decorator");
const email_tracking_service_1 = require("../services/email-tracking.service");
let EmailTrackingController = class EmailTrackingController {
    emailTrackingService;
    constructor(emailTrackingService) {
        this.emailTrackingService = emailTrackingService;
    }
    async trackEmailOpen(token, res) {
        const payload = await this.emailTrackingService.verifyTrackingToken(token);
        if (payload) {
            this.emailTrackingService.recordEmailOpen(payload).catch(() => {
            });
        }
        const pixel = this.emailTrackingService.getTrackingPixel();
        res
            .status(common_1.HttpStatus.OK)
            .type('image/png')
            .set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
            .set('Expires', '0')
            .set('Pragma', 'no-cache')
            .send(pixel);
    }
};
exports.EmailTrackingController = EmailTrackingController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)(':token'),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EmailTrackingController.prototype, "trackEmailOpen", null);
exports.EmailTrackingController = EmailTrackingController = __decorate([
    (0, common_1.Controller)('email/track'),
    __metadata("design:paramtypes", [email_tracking_service_1.EmailTrackingService])
], EmailTrackingController);
//# sourceMappingURL=email-tracking.controller.js.map