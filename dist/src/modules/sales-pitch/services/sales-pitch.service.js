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
var SalesPitchService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesPitchService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../../prisma/prisma.service");
const ollama_pitch_service_1 = require("./ollama-pitch.service");
const pitch_template_service_1 = require("./pitch-template.service");
const pitch_config_service_1 = require("./pitch-config.service");
let SalesPitchService = SalesPitchService_1 = class SalesPitchService {
    prisma;
    ollamaPitch;
    templateService;
    configService;
    logger = new common_1.Logger(SalesPitchService_1.name);
    CACHE_EXPIRY_DAYS = 7;
    constructor(prisma, ollamaPitch, templateService, configService) {
        this.prisma = prisma;
        this.ollamaPitch = ollamaPitch;
        this.templateService = templateService;
        this.configService = configService;
    }
    async generateOrGetCachedPitch(leadId, workspaceId) {
        try {
            const lead = await this.prisma.lead.findFirst({
                where: {
                    id: leadId,
                    workspaceId,
                },
                include: {
                    workspace: {
                        include: {
                            onboardingSessions: {
                                where: { isComplete: true },
                                orderBy: { completedAt: 'desc' },
                                take: 1,
                            },
                        },
                    },
                },
            });
            if (!lead) {
                throw new common_1.NotFoundException(`Lead ${leadId} not found`);
            }
            if (lead.salesPitchData) {
                const cached = lead.salesPitchData;
                if (cached.generatedAt) {
                    const age = Date.now() - new Date(cached.generatedAt).getTime();
                    const maxAge = this.CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
                    if (age < maxAge) {
                        this.logger.log(`Using cached pitch for lead ${leadId} (age: ${Math.round(age / 1000 / 60)} minutes)`);
                        return {
                            ...cached,
                            generatedAt: new Date(cached.generatedAt),
                        };
                    }
                }
            }
            const isOllamaAvailable = await this.ollamaPitch.checkOllamaAvailable();
            if (!isOllamaAvailable) {
                throw new common_1.HttpException({
                    code: 'OLLAMA_UNAVAILABLE',
                    message: 'AI pitch generation is currently unavailable. Please ensure Ollama is running.',
                    details: { ollamaUrl: process.env.OLLAMA_API_URL || 'http://localhost:11434' },
                }, common_1.HttpStatus.SERVICE_UNAVAILABLE);
            }
            const context = this.buildPitchContext(lead);
            if (!context.userCompany.name || !context.leadCompany.name) {
                throw new common_1.HttpException({
                    code: 'INSUFFICIENT_DATA',
                    message: 'Cannot generate pitch: Missing required company data',
                    details: {
                        hasUserCompany: !!context.userCompany.name,
                        hasLeadCompany: !!context.leadCompany.name,
                    },
                }, common_1.HttpStatus.BAD_REQUEST);
            }
            const config = await this.configService.getConfig(workspaceId);
            const customPrompt = this.templateService.buildPromptFromConfig(context, config);
            this.logger.log(`Generating new pitch for lead ${leadId}`);
            const pitch = await this.ollamaPitch.generatePitch(context, customPrompt, config.advancedConfig.temperature);
            await this.prisma.lead.update({
                where: { id: leadId },
                data: {
                    salesPitchData: JSON.parse(JSON.stringify(pitch)),
                },
            });
            this.logger.log(`Successfully generated and cached pitch for lead ${leadId}`);
            return pitch;
        }
        catch (error) {
            this.logger.error(`Error generating pitch for lead ${leadId}: ${error.message}`, error.stack);
            throw error;
        }
    }
    async regeneratePitch(leadId, workspaceId) {
        this.logger.log(`Force regenerating pitch for lead ${leadId}`);
        await this.prisma.lead.update({
            where: { id: leadId },
            data: { salesPitchData: client_1.Prisma.DbNull },
        });
        return this.generateOrGetCachedPitch(leadId, workspaceId);
    }
    buildPitchContext(lead) {
        const session = lead.workspace.onboardingSessions?.[0];
        const userCompanyData = session?.configurationData?.enrichedCompany;
        const enrichment = lead.enrichmentData;
        const context = {
            userCompany: {
                name: userCompanyData?.companyName || lead.workspace.name,
                industry: userCompanyData?.industry,
                businessModel: userCompanyData?.businessModel,
                companySize: userCompanyData?.companySize,
                summary: userCompanyData?.summary,
                techStack: userCompanyData?.structuredData?.techStack,
            },
            leadCompany: {
                name: enrichment?.company?.name || lead.companyName || lead.email.split('@')[1],
                domain: enrichment?.company?.domain || lead.email.split('@')[1],
                industry: enrichment?.company?.industry,
                size: enrichment?.company?.size,
                description: enrichment?.company?.description,
                techStack: enrichment?.company?.techStack,
                emailProvider: enrichment?.company?.emailProvider,
                location: enrichment?.company?.location || enrichment?.company?.headquarters,
            },
            leadPerson: {
                name: enrichment?.person?.fullName || lead.name || lead.email.split('@')[0],
                jobTitle: enrichment?.person?.jobTitle,
                seniority: enrichment?.person?.seniority,
                department: enrichment?.person?.department,
            },
        };
        this.logger.debug(`Built pitch context: User=${context.userCompany.name}, Lead=${context.leadCompany.name}`);
        return context;
    }
    async getCachedPitch(leadId, workspaceId) {
        const lead = await this.prisma.lead.findFirst({
            where: {
                id: leadId,
                workspaceId,
            },
            select: {
                salesPitchData: true,
            },
        });
        if (!lead?.salesPitchData) {
            return null;
        }
        const cached = lead.salesPitchData;
        return {
            ...cached,
            generatedAt: new Date(cached.generatedAt),
        };
    }
};
exports.SalesPitchService = SalesPitchService;
exports.SalesPitchService = SalesPitchService = SalesPitchService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ollama_pitch_service_1.OllamaPitchService,
        pitch_template_service_1.PitchTemplateService,
        pitch_config_service_1.PitchConfigService])
], SalesPitchService);
//# sourceMappingURL=sales-pitch.service.js.map