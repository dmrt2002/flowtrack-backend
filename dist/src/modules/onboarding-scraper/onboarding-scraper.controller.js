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
var OnboardingScraperController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnboardingScraperController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const onboarding_scraper_service_1 = require("./services/onboarding-scraper.service");
const scraper_dto_1 = require("./dto/scraper.dto");
let OnboardingScraperController = OnboardingScraperController_1 = class OnboardingScraperController {
    scraperService;
    logger = new common_1.Logger(OnboardingScraperController_1.name);
    constructor(scraperService) {
        this.scraperService = scraperService;
    }
    async scrapeCompany(dto) {
        try {
            this.logger.log(`Scraping company: ${dto.companyName || dto.website}`);
            if (!dto.companyName && !dto.website) {
                throw new common_1.HttpException({
                    success: false,
                    error: {
                        code: 'INVALID_INPUT',
                        message: 'Either companyName or website must be provided',
                    },
                }, common_1.HttpStatus.BAD_REQUEST);
            }
            const workflow = await this.scraperService['prisma'].workflow.findUnique({
                where: { id: dto.workflowId },
                select: { workspaceId: true },
            });
            if (!workflow) {
                throw new common_1.HttpException({
                    success: false,
                    error: {
                        code: 'INVALID_INPUT',
                        message: 'Workflow not found',
                    },
                }, common_1.HttpStatus.NOT_FOUND);
            }
            const result = await this.scraperService.scrapeCompany({
                companyName: dto.companyName,
                website: dto.website,
                workflowId: dto.workflowId,
                workspaceId: workflow.workspaceId,
            });
            if (!result.success) {
                throw new common_1.HttpException(result, common_1.HttpStatus.BAD_REQUEST);
            }
            return result;
        }
        catch (error) {
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            this.logger.error(`Unexpected error in scrapeCompany: ${error.message}`, error.stack);
            throw new common_1.HttpException({
                success: false,
                error: {
                    code: 'UNKNOWN_ERROR',
                    message: 'An unexpected error occurred',
                    details: { message: error.message },
                },
            }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getEnrichmentStatus(workflowId) {
        try {
            this.logger.log(`Getting enrichment status for workflow: ${workflowId}`);
            const workflow = await this.scraperService['prisma'].workflow.findUnique({
                where: { id: workflowId },
            });
            if (!workflow) {
                throw new common_1.HttpException('Workflow not found', common_1.HttpStatus.NOT_FOUND);
            }
            const data = await this.scraperService.getEnrichedData(workflowId);
            if (data) {
                return {
                    exists: true,
                    data,
                };
            }
            return {
                exists: false,
            };
        }
        catch (error) {
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            this.logger.error(`Error getting enrichment status: ${error.message}`, error.stack);
            throw new common_1.HttpException('Failed to get enrichment status', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async healthCheck() {
        return {
            status: 'healthy',
            version: '1.0.0',
            timestamp: new Date(),
        };
    }
};
exports.OnboardingScraperController = OnboardingScraperController;
__decorate([
    (0, common_1.Post)('scrape-company'),
    (0, swagger_1.ApiOperation)({
        summary: 'Scrape company website and extract business intelligence',
        description: 'Analyzes a company website to extract business model, industry, company size, and generate a summary. ' +
            'Accepts either a company name (will infer domain) or direct website URL.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Company data successfully scraped and analyzed',
        type: scraper_dto_1.ScrapeCompanyResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Invalid input or scraping failed',
    }),
    (0, swagger_1.ApiResponse)({
        status: 500,
        description: 'Internal server error',
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [scraper_dto_1.ScrapeCompanyRequestDto]),
    __metadata("design:returntype", Promise)
], OnboardingScraperController.prototype, "scrapeCompany", null);
__decorate([
    (0, common_1.Get)('enrichment-status/:workflowId'),
    (0, swagger_1.ApiOperation)({
        summary: 'Check if enrichment data exists for a workflow',
        description: 'Returns enriched company data if it exists, otherwise returns exists: false',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Enrichment status retrieved',
        type: scraper_dto_1.GetEnrichmentStatusResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Workflow not found',
    }),
    __param(0, (0, common_1.Param)('workflowId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OnboardingScraperController.prototype, "getEnrichmentStatus", null);
__decorate([
    (0, common_1.Get)('scraper-health'),
    (0, swagger_1.ApiOperation)({
        summary: 'Health check for scraper service',
        description: 'Returns service status and version',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Service is healthy',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OnboardingScraperController.prototype, "healthCheck", null);
exports.OnboardingScraperController = OnboardingScraperController = OnboardingScraperController_1 = __decorate([
    (0, swagger_1.ApiTags)('Onboarding Scraper'),
    (0, common_1.Controller)('onboarding'),
    __metadata("design:paramtypes", [onboarding_scraper_service_1.OnboardingScraperService])
], OnboardingScraperController);
//# sourceMappingURL=onboarding-scraper.controller.js.map