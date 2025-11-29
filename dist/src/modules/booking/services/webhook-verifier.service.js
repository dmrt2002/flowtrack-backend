"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var WebhookVerifierService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookVerifierService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
const crypto = __importStar(require("crypto"));
let WebhookVerifierService = WebhookVerifierService_1 = class WebhookVerifierService {
    prisma;
    logger = new common_1.Logger(WebhookVerifierService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async verifyCalendlyWebhook(payload, signature, credentialId) {
        try {
            const credential = await this.prisma.oAuthCredential.findUnique({
                where: { id: credentialId },
                select: { webhookSigningKey: true },
            });
            if (!credential || !credential.webhookSigningKey) {
                this.logger.warn(`No webhook signing key found for credential ${credentialId}`);
                return false;
            }
            const signatureParts = signature.split(',');
            if (signatureParts.length < 3) {
                this.logger.warn('Invalid Calendly signature format');
                return false;
            }
            const providedSignature = signatureParts[2];
            const timestamp = signatureParts[1];
            const signedPayload = `${timestamp}.${payload}`;
            const expectedSignature = crypto
                .createHmac('sha256', credential.webhookSigningKey)
                .update(signedPayload)
                .digest('hex');
            const isValid = crypto.timingSafeEqual(Buffer.from(providedSignature), Buffer.from(expectedSignature));
            if (!isValid) {
                this.logger.warn(`Calendly webhook signature verification failed for credential ${credentialId}`);
            }
            return isValid;
        }
        catch (error) {
            this.logger.error('Error verifying Calendly webhook:', error);
            return false;
        }
    }
    async isEventProcessed(eventId, provider) {
        const key = `${provider}:${eventId}`;
        const existing = await this.prisma.webhookIdempotencyKey.findUnique({
            where: { key },
        });
        return !!existing;
    }
    async markEventProcessed(eventId, provider, metadata) {
        const key = `${provider}:${eventId}`;
        await this.prisma.webhookIdempotencyKey.create({
            data: {
                key,
                metadata,
            },
        });
    }
    async addToDeadLetterQueue(provider, eventId, eventType, errorMessage, errorStack, payload) {
        await this.prisma.webhookDeadLetterQueue.create({
            data: {
                provider,
                eventId,
                eventType,
                errorMessage,
                errorStack,
                payload,
                status: 'PENDING',
                retryCount: 0,
            },
        });
        this.logger.warn(`Added webhook to DLQ: ${provider} ${eventType} ${eventId} - ${errorMessage}`);
    }
    async getPendingDLQItems(limit = 10) {
        return this.prisma.webhookDeadLetterQueue.findMany({
            where: {
                status: 'PENDING',
                retryCount: { lt: 3 },
            },
            orderBy: {
                failedAt: 'asc',
            },
            take: limit,
        });
    }
    async updateDLQItem(id, status, retryCount) {
        await this.prisma.webhookDeadLetterQueue.update({
            where: { id },
            data: {
                status,
                retryCount,
                resolvedAt: status === 'RESOLVED' ? new Date() : undefined,
            },
        });
    }
    async updateWebhookHealth(credentialId, success) {
        const credential = await this.prisma.oAuthCredential.findUnique({
            where: { id: credentialId },
            select: { webhookFailedAttempts: true },
        });
        if (!credential) {
            return;
        }
        if (success) {
            await this.prisma.oAuthCredential.update({
                where: { id: credentialId },
                data: {
                    webhookFailedAttempts: 0,
                    webhookLastVerifiedAt: new Date(),
                },
            });
        }
        else {
            const newFailedAttempts = credential.webhookFailedAttempts + 1;
            await this.prisma.oAuthCredential.update({
                where: { id: credentialId },
                data: {
                    webhookFailedAttempts: newFailedAttempts,
                    webhookEnabled: newFailedAttempts < 10,
                },
            });
            if (newFailedAttempts >= 10) {
                this.logger.error(`Webhook disabled for credential ${credentialId} due to too many failures`);
            }
        }
    }
    async cleanupOldIdempotencyKeys() {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const result = await this.prisma.webhookIdempotencyKey.deleteMany({
            where: {
                processedAt: {
                    lt: sevenDaysAgo,
                },
            },
        });
        this.logger.log(`Cleaned up ${result.count} old idempotency keys`);
        return result.count;
    }
};
exports.WebhookVerifierService = WebhookVerifierService;
exports.WebhookVerifierService = WebhookVerifierService = WebhookVerifierService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WebhookVerifierService);
//# sourceMappingURL=webhook-verifier.service.js.map