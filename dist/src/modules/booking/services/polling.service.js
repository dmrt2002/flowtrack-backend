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
var PollingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PollingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
const calendly_service_1 = require("./calendly.service");
const token_manager_service_1 = require("./token-manager.service");
let PollingService = PollingService_1 = class PollingService {
    prisma;
    calendlyService;
    tokenManager;
    logger = new common_1.Logger(PollingService_1.name);
    constructor(prisma, calendlyService, tokenManager) {
        this.prisma = prisma;
        this.calendlyService = calendlyService;
        this.tokenManager = tokenManager;
    }
    async pollAllCalendlyFreeAccounts() {
        this.logger.log('Starting Calendly FREE account polling');
        const credentials = await this.prisma.oAuthCredential.findMany({
            where: {
                providerType: 'CALENDLY',
                isActive: true,
                pollingEnabled: true,
                providerPlan: 'FREE',
            },
        });
        this.logger.log(`Found ${credentials.length} Calendly FREE accounts to poll`);
        for (const credential of credentials) {
            try {
                const canPoll = await this.tokenManager.checkRateLimit(credential.id);
                if (!canPoll) {
                    this.logger.warn(`Rate limit reached for credential ${credential.id}, skipping`);
                    continue;
                }
                const pollingJob = await this.prisma.bookingPollingJob.create({
                    data: {
                        oauthCredentialId: credential.id,
                        status: 'RUNNING',
                    },
                });
                const startTime = Date.now();
                try {
                    const result = await this.calendlyService.pollEvents(credential.id);
                    const durationMs = Date.now() - startTime;
                    await this.prisma.bookingPollingJob.update({
                        where: { id: pollingJob.id },
                        data: {
                            status: 'COMPLETED',
                            completedAt: new Date(),
                            eventsFetched: result.eventsFetched,
                            eventsCreated: result.eventsCreated,
                            eventsUpdated: result.eventsUpdated,
                            durationMs,
                        },
                    });
                    this.logger.log(`Polling completed for credential ${credential.id}: ${result.eventsCreated} created, ${result.eventsUpdated} updated`);
                }
                catch (error) {
                    const durationMs = Date.now() - startTime;
                    await this.prisma.bookingPollingJob.update({
                        where: { id: pollingJob.id },
                        data: {
                            status: 'FAILED',
                            completedAt: new Date(),
                            errorMessage: error.message,
                            errorDetails: {
                                stack: error.stack,
                                response: error.response?.data,
                            },
                            durationMs,
                        },
                    });
                    this.logger.error(`Polling failed for credential ${credential.id}:`, error);
                }
                await this.delay(2000);
            }
            catch (error) {
                this.logger.error(`Error processing credential ${credential.id} for polling:`, error);
            }
        }
        this.logger.log('Calendly FREE account polling completed');
    }
    async getPollingStats(workspaceId) {
        const credentials = await this.prisma.oAuthCredential.findMany({
            where: {
                workspaceId,
                providerType: 'CALENDLY',
                pollingEnabled: true,
            },
            include: {
                pollingJobs: {
                    orderBy: {
                        startedAt: 'desc',
                    },
                    take: 10,
                },
            },
        });
        return credentials.map((credential) => ({
            credentialId: credential.id,
            providerEmail: credential.providerEmail,
            pollingLastRunAt: credential.pollingLastRunAt,
            recentJobs: credential.pollingJobs,
        }));
    }
    async getPollingJob(jobId) {
        return this.prisma.bookingPollingJob.findUnique({
            where: { id: jobId },
            include: {
                oauthCredential: {
                    select: {
                        providerType: true,
                        providerEmail: true,
                        workspaceId: true,
                    },
                },
            },
        });
    }
    async getRecentPollingJobs(credentialId, limit = 20) {
        return this.prisma.bookingPollingJob.findMany({
            where: {
                oauthCredentialId: credentialId,
            },
            orderBy: {
                startedAt: 'desc',
            },
            take: limit,
        });
    }
    async cleanupOldPollingJobs() {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const result = await this.prisma.bookingPollingJob.deleteMany({
            where: {
                startedAt: {
                    lt: thirtyDaysAgo,
                },
            },
        });
        this.logger.log(`Cleaned up ${result.count} old polling jobs`);
        return result.count;
    }
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
};
exports.PollingService = PollingService;
exports.PollingService = PollingService = PollingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        calendly_service_1.CalendlyService,
        token_manager_service_1.TokenManagerService])
], PollingService);
//# sourceMappingURL=polling.service.js.map