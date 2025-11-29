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
exports.GetLeadMetricsQueryDto = exports.GetLeadMetricsQuerySchema = exports.BulkUpdateLeadsDto = exports.BulkUpdateLeadsSchema = exports.UpdateLeadStatusDto = exports.UpdateLeadStatusSchema = exports.UpdateLeadDto = exports.UpdateLeadSchema = exports.GetLeadsQueryDto = exports.GetLeadsQuerySchema = exports.LeadSourceSchema = exports.LeadStatusSchema = void 0;
const zod_1 = require("zod");
const nestjs_zod_1 = require("nestjs-zod");
const client_1 = require("@prisma/client");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
exports.LeadStatusSchema = zod_1.z.nativeEnum(client_1.LeadStatus);
exports.LeadSourceSchema = zod_1.z.nativeEnum(client_1.LeadSource);
exports.GetLeadsQuerySchema = zod_1.z.object({
    search: zod_1.z.string().optional(),
    workflowId: zod_1.z.string().uuid().optional(),
    source: exports.LeadSourceSchema.optional(),
    status: exports.LeadStatusSchema.optional(),
    statuses: zod_1.z.array(exports.LeadStatusSchema).optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    dateFrom: zod_1.z.string().datetime().optional(),
    dateTo: zod_1.z.string().datetime().optional(),
    sortBy: zod_1.z
        .enum(['createdAt', 'name', 'email', 'score', 'lastActivityAt', 'updatedAt'])
        .optional()
        .default('createdAt'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).optional().default('desc'),
    page: zod_1.z.coerce.number().int().min(1).optional().default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).optional().default(25),
    view: zod_1.z.enum(['table', 'kanban']).optional().default('table'),
});
class GetLeadsQueryDto {
    search;
    workflowId;
    source;
    status;
    statuses;
    tags;
    dateFrom;
    dateTo;
    sortBy = 'createdAt';
    sortOrder = 'desc';
    page = 1;
    limit = 25;
    view = 'table';
}
exports.GetLeadsQueryDto = GetLeadsQueryDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GetLeadsQueryDto.prototype, "search", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], GetLeadsQueryDto.prototype, "workflowId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.LeadSource),
    __metadata("design:type", String)
], GetLeadsQueryDto.prototype, "source", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.LeadStatus),
    __metadata("design:type", String)
], GetLeadsQueryDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsEnum)(client_1.LeadStatus, { each: true }),
    __metadata("design:type", Array)
], GetLeadsQueryDto.prototype, "statuses", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], GetLeadsQueryDto.prototype, "tags", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GetLeadsQueryDto.prototype, "dateFrom", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GetLeadsQueryDto.prototype, "dateTo", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['createdAt', 'name', 'email', 'score', 'lastActivityAt', 'updatedAt']),
    __metadata("design:type", String)
], GetLeadsQueryDto.prototype, "sortBy", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['asc', 'desc']),
    __metadata("design:type", String)
], GetLeadsQueryDto.prototype, "sortOrder", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], GetLeadsQueryDto.prototype, "page", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], GetLeadsQueryDto.prototype, "limit", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['table', 'kanban']),
    __metadata("design:type", String)
], GetLeadsQueryDto.prototype, "view", void 0);
exports.UpdateLeadSchema = zod_1.z.object({
    name: zod_1.z.string().optional(),
    email: zod_1.z.string().email().optional(),
    phone: zod_1.z.string().optional(),
    companyName: zod_1.z.string().optional(),
    status: exports.LeadStatusSchema.optional(),
    score: zod_1.z.number().int().min(0).max(100).optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    sourceMetadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
class UpdateLeadDto extends (0, nestjs_zod_1.createZodDto)(exports.UpdateLeadSchema) {
}
exports.UpdateLeadDto = UpdateLeadDto;
exports.UpdateLeadStatusSchema = zod_1.z.object({
    status: exports.LeadStatusSchema,
});
class UpdateLeadStatusDto {
    status;
}
exports.UpdateLeadStatusDto = UpdateLeadStatusDto;
__decorate([
    (0, class_validator_1.IsEnum)(client_1.LeadStatus),
    __metadata("design:type", String)
], UpdateLeadStatusDto.prototype, "status", void 0);
exports.BulkUpdateLeadsSchema = zod_1.z.object({
    leadIds: zod_1.z.array(zod_1.z.string().uuid()).min(1),
    status: exports.LeadStatusSchema.optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    addTags: zod_1.z.array(zod_1.z.string()).optional(),
    removeTags: zod_1.z.array(zod_1.z.string()).optional(),
});
class BulkUpdateLeadsDto extends (0, nestjs_zod_1.createZodDto)(exports.BulkUpdateLeadsSchema) {
}
exports.BulkUpdateLeadsDto = BulkUpdateLeadsDto;
exports.GetLeadMetricsQuerySchema = zod_1.z.object({
    period: zod_1.z.enum(['7d', '30d', '90d']).optional().default('30d'),
});
class GetLeadMetricsQueryDto {
    period = '30d';
}
exports.GetLeadMetricsQueryDto = GetLeadMetricsQueryDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['7d', '30d', '90d']),
    __metadata("design:type", String)
], GetLeadMetricsQueryDto.prototype, "period", void 0);
//# sourceMappingURL=leads.dto.js.map