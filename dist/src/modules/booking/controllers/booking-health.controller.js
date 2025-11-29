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
exports.BookingHealthController = void 0;
const common_1 = require("@nestjs/common");
const unified_auth_guard_1 = require("../../../auth/guards/unified-auth.guard");
const webhook_verifier_service_1 = require("../services/webhook-verifier.service");
const polling_service_1 = require("../services/polling.service");
const polling_queue_service_1 = require("../services/polling-queue.service");
const attribution_matcher_service_1 = require("../services/attribution-matcher.service");
const prisma_service_1 = require("../../../prisma/prisma.service");
let BookingHealthController = class BookingHealthController {
    webhookVerifier;
    pollingService;
    pollingQueue;
    attributionMatcher;
    prisma;
    constructor(webhookVerifier, pollingService, pollingQueue, attributionMatcher, prisma) {
        this.webhookVerifier = webhookVerifier;
        this.pollingService = pollingService;
        this.pollingQueue = pollingQueue;
        this.attributionMatcher = attributionMatcher;
        this.prisma = prisma;
    }
    async getHealth() {
        const [dlqPending, queueStats, recentPollingJobs] = await Promise.all([
            this.webhookVerifier.getPendingDLQItems(5),
            this.pollingQueue.getQueueStats(),
            this.prisma.bookingPollingJob.findMany({
                where: {
                    status: 'RUNNING',
                },
                take: 10,
            }),
        ]);
        return {
            status: 'healthy',
            deadLetterQueue: {
                pendingCount: dlqPending.length,
                items: dlqPending,
            },
            pollingQueue: queueStats,
            runningPollingJobs: recentPollingJobs.length,
        };
    }
    async getDeadLetterQueue() {
        const pending = await this.webhookVerifier.getPendingDLQItems(50);
        return {
            success: true,
            data: {
                pending,
                total: pending.length,
            },
        };
    }
    async retryDLQItem(id) {
        const item = await this.prisma.webhookDeadLetterQueue.findUnique({
            where: { id },
        });
        if (!item) {
            return {
                success: false,
                message: 'DLQ item not found',
            };
        }
        await this.prisma.webhookDeadLetterQueue.update({
            where: { id },
            data: {
                status: 'PENDING',
                retryCount: item.retryCount + 1,
            },
        });
        return {
            success: true,
            message: 'DLQ item queued for retry',
        };
    }
    async resolveDLQItem(id) {
        const item = await this.prisma.webhookDeadLetterQueue.findUnique({
            where: { id },
        });
        if (!item) {
            return {
                success: false,
                message: 'DLQ item not found',
            };
        }
        await this.webhookVerifier.updateDLQItem(id, 'RESOLVED', item.retryCount);
        return {
            success: true,
            message: 'DLQ item marked as resolved',
        };
    }
    async getPollingStats(workspaceId) {
        const stats = await this.pollingService.getPollingStats(workspaceId);
        return {
            success: true,
            data: stats,
        };
    }
    async getPollingQueueStats() {
        const stats = await this.pollingQueue.getQueueStats();
        return {
            success: true,
            data: stats,
        };
    }
    async getPollingQueueJobs() {
        const jobs = await this.pollingQueue.getRecentJobs(20);
        return {
            success: true,
            data: jobs,
        };
    }
    async triggerManualPolling() {
        await this.pollingQueue.triggerManualPolling();
        return {
            success: true,
            message: 'Manual polling job triggered',
        };
    }
    async getBookingStats(workspaceId) {
        const stats = await this.attributionMatcher.getBookingStats(workspaceId);
        const recentBookings = await this.prisma.booking.findMany({
            where: { workspaceId },
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
                lead: {
                    select: {
                        email: true,
                        name: true,
                    },
                },
            },
        });
        return {
            success: true,
            data: {
                stats,
                recentBookings,
            },
        };
    }
    async getWebhookHealth(workspaceId) {
        const credentials = await this.prisma.oAuthCredential.findMany({
            where: {
                workspaceId,
                providerType: 'CALENDLY',
            },
            select: {
                id: true,
                providerType: true,
                providerEmail: true,
                webhookEnabled: true,
                webhookFailedAttempts: true,
                webhookLastVerifiedAt: true,
                pollingEnabled: true,
                pollingLastRunAt: true,
                isActive: true,
            },
        });
        return {
            success: true,
            data: credentials,
        };
    }
    async cleanupIdempotencyKeys() {
        const count = await this.webhookVerifier.cleanupOldIdempotencyKeys();
        return {
            success: true,
            message: `Cleaned up ${count} old idempotency keys`,
            count,
        };
    }
    async cleanupPollingJobs() {
        const count = await this.pollingService.cleanupOldPollingJobs();
        return {
            success: true,
            message: `Cleaned up ${count} old polling jobs`,
            count,
        };
    }
    async cleanupQueueJobs() {
        await this.pollingQueue.cleanupOldJobs();
        return {
            success: true,
            message: 'Queue jobs cleaned up',
        };
    }
};
exports.BookingHealthController = BookingHealthController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BookingHealthController.prototype, "getHealth", null);
__decorate([
    (0, common_1.Get)('dlq'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BookingHealthController.prototype, "getDeadLetterQueue", null);
__decorate([
    (0, common_1.Post)('dlq/:id/retry'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BookingHealthController.prototype, "retryDLQItem", null);
__decorate([
    (0, common_1.Post)('dlq/:id/resolve'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BookingHealthController.prototype, "resolveDLQItem", null);
__decorate([
    (0, common_1.Get)('polling/:workspaceId'),
    __param(0, (0, common_1.Param)('workspaceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BookingHealthController.prototype, "getPollingStats", null);
__decorate([
    (0, common_1.Get)('polling-queue/stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BookingHealthController.prototype, "getPollingQueueStats", null);
__decorate([
    (0, common_1.Get)('polling-queue/jobs'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BookingHealthController.prototype, "getPollingQueueJobs", null);
__decorate([
    (0, common_1.Post)('polling/trigger'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BookingHealthController.prototype, "triggerManualPolling", null);
__decorate([
    (0, common_1.Get)('stats/:workspaceId'),
    __param(0, (0, common_1.Param)('workspaceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BookingHealthController.prototype, "getBookingStats", null);
__decorate([
    (0, common_1.Get)('webhooks/:workspaceId'),
    __param(0, (0, common_1.Param)('workspaceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BookingHealthController.prototype, "getWebhookHealth", null);
__decorate([
    (0, common_1.Post)('cleanup/idempotency'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BookingHealthController.prototype, "cleanupIdempotencyKeys", null);
__decorate([
    (0, common_1.Post)('cleanup/polling-jobs'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BookingHealthController.prototype, "cleanupPollingJobs", null);
__decorate([
    (0, common_1.Post)('cleanup/queue-jobs'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BookingHealthController.prototype, "cleanupQueueJobs", null);
exports.BookingHealthController = BookingHealthController = __decorate([
    (0, common_1.Controller)('booking/health'),
    (0, common_1.UseGuards)(unified_auth_guard_1.UnifiedAuthGuard),
    __metadata("design:paramtypes", [webhook_verifier_service_1.WebhookVerifierService,
        polling_service_1.PollingService,
        polling_queue_service_1.PollingQueueService,
        attribution_matcher_service_1.AttributionMatcherService,
        prisma_service_1.PrismaService])
], BookingHealthController);
//# sourceMappingURL=booking-health.controller.js.map