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
var SalesPitchController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesPitchController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const unified_auth_guard_1 = require("../../auth/guards/unified-auth.guard");
const user_decorator_1 = require("../../auth/decorators/user.decorator");
const sales_pitch_service_1 = require("./services/sales-pitch.service");
const pitch_queue_service_1 = require("./services/pitch-queue.service");
const pitch_dto_1 = require("./dto/pitch.dto");
let SalesPitchController = SalesPitchController_1 = class SalesPitchController {
    pitchService;
    queueService;
    logger = new common_1.Logger(SalesPitchController_1.name);
    constructor(pitchService, queueService) {
        this.pitchService = pitchService;
        this.queueService = queueService;
    }
    async getSalesPitch(leadId, user) {
        try {
            const workspaceId = user.workspaces[0]?.id;
            if (!workspaceId) {
                throw new Error('No workspace found for user');
            }
            this.logger.log(`Getting sales pitch for lead ${leadId}`);
            const pitch = await this.pitchService.generateOrGetCachedPitch(leadId, workspaceId);
            return pitch_dto_1.SalesPitchResponseDto.fromDomain(pitch);
        }
        catch (error) {
            this.logger.error(`Failed to get sales pitch: ${error.message}`, error.stack);
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException({
                code: 'PITCH_GENERATION_FAILED',
                message: 'Failed to generate sales pitch',
                details: { error: error.message },
            }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async regeneratePitch(leadId, user) {
        try {
            const workspaceId = user.workspaces[0]?.id;
            if (!workspaceId) {
                throw new Error('No workspace found for user');
            }
            this.logger.log(`Regenerating sales pitch for lead ${leadId}`);
            const pitch = await this.pitchService.regeneratePitch(leadId, workspaceId);
            return pitch_dto_1.SalesPitchResponseDto.fromDomain(pitch);
        }
        catch (error) {
            this.logger.error(`Failed to regenerate sales pitch: ${error.message}`, error.stack);
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException({
                code: 'PITCH_REGENERATION_FAILED',
                message: 'Failed to regenerate sales pitch',
                details: { error: error.message },
            }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getPitchStatus(leadId, user) {
        const workspaceId = user.workspaces[0]?.id;
        if (!workspaceId) {
            throw new Error('No workspace found for user');
        }
        const cached = await this.pitchService.getCachedPitch(leadId, workspaceId);
        if (cached) {
            return {
                exists: true,
                generatedAt: cached.generatedAt.toISOString(),
            };
        }
        return { exists: false };
    }
    async batchGeneratePitches(dto, user) {
        try {
            const workspaceId = user.workspaces[0]?.id;
            if (!workspaceId) {
                throw new Error('No workspace found for user');
            }
            if (!dto.leadIds || dto.leadIds.length === 0) {
                throw new common_1.HttpException({
                    code: 'INVALID_REQUEST',
                    message: 'Lead IDs array cannot be empty',
                }, common_1.HttpStatus.BAD_REQUEST);
            }
            this.logger.log(`Starting batch pitch generation for ${dto.leadIds.length} leads`);
            const jobId = await this.queueService.addBatchGenerationJob(workspaceId, dto.leadIds, user.id);
            return {
                jobId,
                total: dto.leadIds.length,
                message: 'Batch pitch generation started',
            };
        }
        catch (error) {
            this.logger.error(`Failed to start batch generation: ${error.message}`, error.stack);
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException({
                code: 'BATCH_GENERATION_FAILED',
                message: 'Failed to start batch pitch generation',
                details: { error: error.message },
            }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getBatchProgress(jobId) {
        const progress = await this.queueService.getJobProgress(jobId);
        if (!progress) {
            throw new common_1.HttpException({
                code: 'JOB_NOT_FOUND',
                message: 'Batch generation job not found',
                details: { jobId },
            }, common_1.HttpStatus.NOT_FOUND);
        }
        return progress;
    }
};
exports.SalesPitchController = SalesPitchController;
__decorate([
    (0, common_1.Get)(':id/sales-pitch'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get AI-generated sales pitch for lead',
        description: 'Generates personalized sales talking points by combining user company data with lead enrichment. ' +
            'Uses local Ollama LLM for zero-cost intelligence. Results are cached for 7 days.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Sales pitch generated successfully',
        type: pitch_dto_1.SalesPitchResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Lead not found',
        type: pitch_dto_1.PitchErrorResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 503,
        description: 'Ollama service unavailable',
        type: pitch_dto_1.PitchErrorResponseDto,
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, user_decorator_1.User)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SalesPitchController.prototype, "getSalesPitch", null);
__decorate([
    (0, common_1.Post)(':id/sales-pitch/regenerate'),
    (0, swagger_1.ApiOperation)({
        summary: 'Force regenerate sales pitch',
        description: 'Bypasses cache and generates a fresh sales pitch. ' +
            'Useful when lead enrichment data has been updated.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Sales pitch regenerated successfully',
        type: pitch_dto_1.SalesPitchResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Lead not found',
        type: pitch_dto_1.PitchErrorResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 503,
        description: 'Ollama service unavailable',
        type: pitch_dto_1.PitchErrorResponseDto,
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, user_decorator_1.User)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SalesPitchController.prototype, "regeneratePitch", null);
__decorate([
    (0, common_1.Get)(':id/sales-pitch/status'),
    (0, swagger_1.ApiOperation)({
        summary: 'Check if sales pitch is cached',
        description: 'Returns whether a cached pitch exists for this lead without generating a new one',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Pitch status',
        schema: {
            properties: {
                exists: { type: 'boolean', example: true },
                generatedAt: { type: 'string', format: 'date-time', example: '2025-12-04T10:30:00Z' },
            },
        },
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, user_decorator_1.User)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SalesPitchController.prototype, "getPitchStatus", null);
__decorate([
    (0, common_1.Post)('batch/generate-pitches'),
    (0, swagger_1.ApiOperation)({
        summary: 'Generate sales pitches for multiple leads in batch',
        description: 'Queues batch pitch generation job for multiple leads. ' +
            'Returns job ID for tracking progress. Processes 3 leads concurrently.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Batch generation job started',
        type: pitch_dto_1.BatchGenerationJobResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Invalid request (empty lead IDs)',
        type: pitch_dto_1.PitchErrorResponseDto,
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, user_decorator_1.User)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [pitch_dto_1.BatchGeneratePitchesDto, Object]),
    __metadata("design:returntype", Promise)
], SalesPitchController.prototype, "batchGeneratePitches", null);
__decorate([
    (0, common_1.Get)('batch/generate-pitches/:jobId/progress'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get progress of batch pitch generation job',
        description: 'Returns current progress of a batch generation job',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Job progress',
        type: pitch_dto_1.BatchGenerationProgressDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Job not found',
        type: pitch_dto_1.PitchErrorResponseDto,
    }),
    __param(0, (0, common_1.Param)('jobId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SalesPitchController.prototype, "getBatchProgress", null);
exports.SalesPitchController = SalesPitchController = SalesPitchController_1 = __decorate([
    (0, swagger_1.ApiTags)('Sales Pitch'),
    (0, common_1.Controller)('leads'),
    (0, common_1.UseGuards)(unified_auth_guard_1.UnifiedAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [sales_pitch_service_1.SalesPitchService,
        pitch_queue_service_1.PitchQueueService])
], SalesPitchController);
//# sourceMappingURL=sales-pitch.controller.js.map