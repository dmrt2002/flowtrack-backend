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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchGenerationProgressDto = exports.BatchGenerationJobResponseDto = exports.BatchGeneratePitchesDto = exports.PitchErrorResponseDto = exports.SalesPitchResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class SalesPitchResponseDto {
    summary;
    relevanceScore;
    talkingPoints;
    commonGround;
    painPoints;
    valueProposition;
    conversationStarters;
    competitorContext;
    generatedAt;
    version;
    static fromDomain(pitch) {
        return {
            summary: pitch.summary,
            relevanceScore: pitch.relevanceScore,
            talkingPoints: pitch.talkingPoints,
            commonGround: pitch.commonGround,
            painPoints: pitch.painPoints,
            valueProposition: pitch.valueProposition,
            conversationStarters: pitch.conversationStarters,
            competitorContext: pitch.competitorContext,
            generatedAt: pitch.generatedAt.toISOString(),
            version: pitch.version,
        };
    }
}
exports.SalesPitchResponseDto = SalesPitchResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Executive summary of the pitch', example: 'Your B2B construction automation platform aligns perfectly with their manual proposal processes. They use similar tech stack and face common scaling challenges.' }),
    __metadata("design:type", String)
], SalesPitchResponseDto.prototype, "summary", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Relevance score 0-100', example: 85, minimum: 0, maximum: 100 }),
    __metadata("design:type", Number)
], SalesPitchResponseDto.prototype, "relevanceScore", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Key talking points', type: [String], example: ['Both operate in construction tech space', 'They struggle with manual document generation', 'Your AI can reduce proposal time by 70%'] }),
    __metadata("design:type", Array)
], SalesPitchResponseDto.prototype, "talkingPoints", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Common ground for rapport building', type: [String], example: ['Same industry (Construction)', 'Similar company size (SMB)', 'Both use Google Workspace'] }),
    __metadata("design:type", Array)
], SalesPitchResponseDto.prototype, "commonGround", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Inferred pain points', type: [String], example: ['Manual proposal creation takes too long', 'Poor team collaboration on documents', 'Difficulty tracking proposal status'] }),
    __metadata("design:type", Array)
], SalesPitchResponseDto.prototype, "painPoints", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Value proposition statement', example: 'Your AI-powered platform can automate their proposal generation, improve team collaboration, and provide real-time tracking - reducing cycle time by 70%.' }),
    __metadata("design:type", String)
], SalesPitchResponseDto.prototype, "valueProposition", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Natural conversation starters', type: [String], example: ['I noticed you\'re using Google Workspace - how are you currently handling proposal automation?', 'What\'s your biggest challenge with document collaboration right now?'] }),
    __metadata("design:type", Array)
], SalesPitchResponseDto.prototype, "conversationStarters", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Competitor context if detected', required: false, example: 'They currently use PandaDoc for documents - position your AI intelligence as the differentiator' }),
    __metadata("design:type", String)
], SalesPitchResponseDto.prototype, "competitorContext", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Generation timestamp', example: '2025-12-04T10:30:00Z' }),
    __metadata("design:type", String)
], SalesPitchResponseDto.prototype, "generatedAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Pitch generation version', example: '1.0' }),
    __metadata("design:type", String)
], SalesPitchResponseDto.prototype, "version", void 0);
class PitchErrorResponseDto {
    code;
    message;
    details;
}
exports.PitchErrorResponseDto = PitchErrorResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Error code', example: 'OLLAMA_UNAVAILABLE' }),
    __metadata("design:type", String)
], PitchErrorResponseDto.prototype, "code", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Human-readable error message', example: 'AI pitch generation is currently unavailable. Please try again later.' }),
    __metadata("design:type", String)
], PitchErrorResponseDto.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Additional error details', required: false }),
    __metadata("design:type", Object)
], PitchErrorResponseDto.prototype, "details", void 0);
class BatchGeneratePitchesDto {
    leadIds;
}
exports.BatchGeneratePitchesDto = BatchGeneratePitchesDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Array of lead IDs to generate pitches for', type: [String], example: ['lead-1', 'lead-2', 'lead-3'] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], BatchGeneratePitchesDto.prototype, "leadIds", void 0);
class BatchGenerationJobResponseDto {
    jobId;
    total;
    message;
}
exports.BatchGenerationJobResponseDto = BatchGenerationJobResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Job ID for tracking progress', example: 'job-123' }),
    __metadata("design:type", String)
], BatchGenerationJobResponseDto.prototype, "jobId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Number of leads queued for generation', example: 25 }),
    __metadata("design:type", Number)
], BatchGenerationJobResponseDto.prototype, "total", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Job status message', example: 'Batch pitch generation started' }),
    __metadata("design:type", String)
], BatchGenerationJobResponseDto.prototype, "message", void 0);
class BatchGenerationProgressDto {
    total;
    completed;
    failed;
    inProgress;
}
exports.BatchGenerationProgressDto = BatchGenerationProgressDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Total number of leads', example: 25 }),
    __metadata("design:type", Number)
], BatchGenerationProgressDto.prototype, "total", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Number of pitches completed', example: 10 }),
    __metadata("design:type", Number)
], BatchGenerationProgressDto.prototype, "completed", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Number of pitches failed', example: 2 }),
    __metadata("design:type", Number)
], BatchGenerationProgressDto.prototype, "failed", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Whether generation is still in progress', example: true }),
    __metadata("design:type", Boolean)
], BatchGenerationProgressDto.prototype, "inProgress", void 0);
//# sourceMappingURL=pitch.dto.js.map