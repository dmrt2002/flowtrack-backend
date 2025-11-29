import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { LeadStatus, LeadSource } from '@prisma/client';
import { IsOptional, IsString, IsUUID, IsEnum, IsArray, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

// Zod schemas for validation
export const LeadStatusSchema = z.nativeEnum(LeadStatus);
export const LeadSourceSchema = z.nativeEnum(LeadSource);

export const GetLeadsQuerySchema = z.object({
  search: z.string().optional(),
  workflowId: z.string().uuid().optional(),
  source: LeadSourceSchema.optional(),
  status: LeadStatusSchema.optional(),
  statuses: z.array(LeadStatusSchema).optional(),
  tags: z.array(z.string()).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  sortBy: z
    .enum(['createdAt', 'name', 'email', 'score', 'lastActivityAt', 'updatedAt'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  view: z.enum(['table', 'kanban']).optional().default('table'),
});

// Use class-validator decorators for Query DTO to work with global ValidationPipe
export class GetLeadsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  workflowId?: string;

  @IsOptional()
  @IsEnum(LeadSource)
  source?: LeadSource;

  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @IsOptional()
  @IsArray()
  @IsEnum(LeadStatus, { each: true })
  statuses?: LeadStatus[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @IsIn(['createdAt', 'name', 'email', 'score', 'lastActivityAt', 'updatedAt'])
  sortBy?: 'createdAt' | 'name' | 'email' | 'score' | 'lastActivityAt' | 'updatedAt' = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 25;

  @IsOptional()
  @IsIn(['table', 'kanban'])
  view?: 'table' | 'kanban' = 'table';
}

export const UpdateLeadSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  companyName: z.string().optional(),
  status: LeadStatusSchema.optional(),
  score: z.number().int().min(0).max(100).optional(),
  tags: z.array(z.string()).optional(),
  sourceMetadata: z.record(z.string(), z.unknown()).optional(),
});

export class UpdateLeadDto extends createZodDto(UpdateLeadSchema) {}

export const UpdateLeadStatusSchema = z.object({
  status: LeadStatusSchema,
});

export class UpdateLeadStatusDto {
  @IsEnum(LeadStatus)
  status: LeadStatus;
}

export const BulkUpdateLeadsSchema = z.object({
  leadIds: z.array(z.string().uuid()).min(1),
  status: LeadStatusSchema.optional(),
  tags: z.array(z.string()).optional(),
  addTags: z.array(z.string()).optional(),
  removeTags: z.array(z.string()).optional(),
});

export class BulkUpdateLeadsDto extends createZodDto(BulkUpdateLeadsSchema) {}

export const GetLeadMetricsQuerySchema = z.object({
  period: z.enum(['7d', '30d', '90d']).optional().default('30d'),
});

// Use class-validator decorators for Query DTO
export class GetLeadMetricsQueryDto {
  @IsOptional()
  @IsIn(['7d', '30d', '90d'])
  period?: '7d' | '30d' | '90d' = '30d';
}

// Export type definitions for use in services
export type GetLeadsQuery = z.infer<typeof GetLeadsQuerySchema>;
export type UpdateLead = z.infer<typeof UpdateLeadSchema>;
export type UpdateLeadStatus = z.infer<typeof UpdateLeadStatusSchema>;
export type BulkUpdateLeads = z.infer<typeof BulkUpdateLeadsSchema>;
export type GetLeadMetricsQuery = z.infer<typeof GetLeadMetricsQuerySchema>;
