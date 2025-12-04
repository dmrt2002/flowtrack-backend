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
var EmailTrackingController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailTrackingController = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const public_decorator_1 = require("../../../auth/decorators/public.decorator");
const email_tracking_service_1 = require("../services/email-tracking.service");
let EmailTrackingController = EmailTrackingController_1 = class EmailTrackingController {
    emailTrackingService;
    trackingQueue;
    logger = new common_1.Logger(EmailTrackingController_1.name);
    constructor(emailTrackingService, trackingQueue) {
        this.emailTrackingService = emailTrackingService;
        this.trackingQueue = trackingQueue;
    }
    async trackEmailOpen(token, req, res) {
        const payload = await this.emailTrackingService.verifyTrackingToken(token);
        const clientIp = this.extractClientIp(req);
        const userAgent = req.headers['user-agent'] || null;
        if (payload) {
            try {
                await this.trackingQueue.add('analyze-tracking-event', {
                    clientIp,
                    userAgent,
                    sentAt: payload.sentAt,
                    leadId: payload.leadId,
                    workflowExecutionId: payload.workflowExecutionId,
                    emailType: payload.emailType,
                });
                this.logger.debug(`Tracking job enqueued: leadId=${payload.leadId}, clientIp=${clientIp}`);
            }
            catch (error) {
                this.logger.error(`Failed to enqueue tracking job: ${error.message}`, error.stack);
            }
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
    extractClientIp(req) {
        const xForwardedFor = req.headers['x-forwarded-for'];
        if (xForwardedFor) {
            const ips = Array.isArray(xForwardedFor)
                ? xForwardedFor[0]
                : xForwardedFor;
            const clientIp = ips.split(',')[0].trim();
            this.logger.debug(`Client IP extracted from X-Forwarded-For: ${clientIp}`);
            return clientIp;
        }
        const connectionIp = req.ip || req.socket.remoteAddress || 'unknown';
        this.logger.debug(`Client IP from connection: ${connectionIp}`);
        return connectionIp;
    }
};
exports.EmailTrackingController = EmailTrackingController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)(':token'),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], EmailTrackingController.prototype, "trackEmailOpen", null);
exports.EmailTrackingController = EmailTrackingController = EmailTrackingController_1 = __decorate([
    (0, common_1.Controller)('email/track'),
    __param(1, (0, bullmq_1.InjectQueue)('email-tracking-analysis')),
    __metadata("design:paramtypes", [email_tracking_service_1.EmailTrackingService,
        bullmq_2.Queue])
], EmailTrackingController);
//# sourceMappingURL=email-tracking.controller.js.map