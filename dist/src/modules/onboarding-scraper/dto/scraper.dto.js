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
exports.GetEnrichmentStatusResponseDto = exports.ScrapeCompanyResponseDto = exports.ScraperErrorResponseDto = exports.EnrichedCompanyResponseDto = exports.ScrapeCompanyRequestDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class ScrapeCompanyRequestDto {
    companyName;
    website;
    workflowId;
    atLeastOne;
}
exports.ScrapeCompanyRequestDto = ScrapeCompanyRequestDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Company name to infer website from',
        example: 'Acme Corporation',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ScrapeCompanyRequestDto.prototype, "companyName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Direct website URL provided by user',
        example: 'https://example.com',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ScrapeCompanyRequestDto.prototype, "website", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Workflow ID for the onboarding session',
        example: '123e4567-e89b-12d3-a456-426614174000',
    }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ScrapeCompanyRequestDto.prototype, "workflowId", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((o) => !o.companyName && !o.website),
    (0, class_validator_1.IsNotEmpty)({ message: 'Either companyName or website must be provided' }),
    __metadata("design:type", String)
], ScrapeCompanyRequestDto.prototype, "atLeastOne", void 0);
class EnrichedCompanyResponseDto {
    summary;
    industry;
    businessModel;
    companySize;
    website;
    companyName;
    logo;
    confidence;
    scrapedAt;
    source;
}
exports.EnrichedCompanyResponseDto = EnrichedCompanyResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Generated business summary',
        example: 'A B2B SaaS company that provides construction management software for contractors',
    }),
    __metadata("design:type", String)
], EnrichedCompanyResponseDto.prototype, "summary", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Detected industry',
        example: 'Technology - Construction Tech',
    }),
    __metadata("design:type", String)
], EnrichedCompanyResponseDto.prototype, "industry", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Business model type',
        enum: ['B2B', 'B2C', 'B2B2C', 'Marketplace', 'Unknown'],
        example: 'B2B',
    }),
    __metadata("design:type", String)
], EnrichedCompanyResponseDto.prototype, "businessModel", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Company size classification',
        enum: ['Startup', 'SMB', 'Mid-Market', 'Enterprise', 'Unknown'],
        example: 'SMB',
    }),
    __metadata("design:type", String)
], EnrichedCompanyResponseDto.prototype, "companySize", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Resolved website domain',
        example: 'example.com',
    }),
    __metadata("design:type", String)
], EnrichedCompanyResponseDto.prototype, "website", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Extracted or provided company name',
        example: 'Acme Corporation',
    }),
    __metadata("design:type", String)
], EnrichedCompanyResponseDto.prototype, "companyName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Company logo URL (from Clearbit)',
        example: 'https://logo.clearbit.com/example.com',
    }),
    __metadata("design:type", String)
], EnrichedCompanyResponseDto.prototype, "logo", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Overall confidence score (0.0 - 1.0)',
        example: 0.85,
        minimum: 0,
        maximum: 1,
    }),
    __metadata("design:type", Number)
], EnrichedCompanyResponseDto.prototype, "confidence", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Timestamp when data was scraped',
        example: '2025-12-04T10:30:00.000Z',
    }),
    __metadata("design:type", Date)
], EnrichedCompanyResponseDto.prototype, "scrapedAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Source of the domain',
        enum: ['user_provided', 'inferred', 'fallback'],
        example: 'inferred',
    }),
    __metadata("design:type", String)
], EnrichedCompanyResponseDto.prototype, "source", void 0);
class ScraperErrorResponseDto {
    code;
    message;
    details;
}
exports.ScraperErrorResponseDto = ScraperErrorResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Error code',
        enum: [
            'INVALID_INPUT',
            'DOMAIN_NOT_FOUND',
            'WEBSITE_INACCESSIBLE',
            'SCRAPING_FAILED',
            'TIMEOUT',
            'NETWORK_ERROR',
            'PARSING_ERROR',
            'LOW_CONFIDENCE',
            'UNKNOWN_ERROR',
        ],
        example: 'DOMAIN_NOT_FOUND',
    }),
    __metadata("design:type", String)
], ScraperErrorResponseDto.prototype, "code", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Human-readable error message',
        example: 'Could not find a valid website for this company',
    }),
    __metadata("design:type", String)
], ScraperErrorResponseDto.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Additional error details',
    }),
    __metadata("design:type", Object)
], ScraperErrorResponseDto.prototype, "details", void 0);
class ScrapeCompanyResponseDto {
    success;
    data;
    error;
}
exports.ScrapeCompanyResponseDto = ScrapeCompanyResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Indicates if scraping was successful',
        example: true,
    }),
    __metadata("design:type", Boolean)
], ScrapeCompanyResponseDto.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Enriched company data (if successful)',
        type: EnrichedCompanyResponseDto,
    }),
    __metadata("design:type", EnrichedCompanyResponseDto)
], ScrapeCompanyResponseDto.prototype, "data", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Error information (if failed)',
        type: ScraperErrorResponseDto,
    }),
    __metadata("design:type", ScraperErrorResponseDto)
], ScrapeCompanyResponseDto.prototype, "error", void 0);
class GetEnrichmentStatusResponseDto {
    exists;
    data;
}
exports.GetEnrichmentStatusResponseDto = GetEnrichmentStatusResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Indicates if enrichment data exists',
        example: true,
    }),
    __metadata("design:type", Boolean)
], GetEnrichmentStatusResponseDto.prototype, "exists", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Enriched company data (if exists)',
        type: EnrichedCompanyResponseDto,
    }),
    __metadata("design:type", EnrichedCompanyResponseDto)
], GetEnrichmentStatusResponseDto.prototype, "data", void 0);
//# sourceMappingURL=scraper.dto.js.map