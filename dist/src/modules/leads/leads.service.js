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
exports.LeadsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
let LeadsService = class LeadsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getLeads(workspaceId, query) {
        const { search, workflowId, source, status, statuses, tags, dateFrom, dateTo, sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 25, view = 'table', } = query;
        const where = {
            workspaceId,
            ...(search && {
                OR: [
                    { email: { contains: search, mode: 'insensitive' } },
                    { name: { contains: search, mode: 'insensitive' } },
                    { companyName: { contains: search, mode: 'insensitive' } },
                    { phone: { contains: search, mode: 'insensitive' } },
                ],
            }),
            ...(workflowId && { workflowId }),
            ...(source && { source }),
            ...(status && { status }),
            ...(statuses && statuses.length > 0 && { status: { in: statuses } }),
            ...(tags && tags.length > 0 && {
                tags: { hasSome: tags },
            }),
            ...(dateFrom && {
                createdAt: { gte: new Date(dateFrom) },
            }),
            ...(dateTo && {
                createdAt: { lte: new Date(dateTo) },
            }),
        };
        if (view === 'kanban') {
            return this.getLeadsKanban(where);
        }
        const [total, leads] = await Promise.all([
            this.prisma.lead.count({ where }),
            this.prisma.lead.findMany({
                where,
                include: {
                    workflow: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                    _count: {
                        select: {
                            events: true,
                            bookings: true,
                        },
                    },
                },
                orderBy: { [sortBy]: sortOrder },
                skip: (page - 1) * limit,
                take: limit,
            }),
        ]);
        return {
            leads,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            view: 'table',
        };
    }
    async getLeadsKanban(where) {
        const kanbanStatuses = [
            client_1.LeadStatus.EMAIL_SENT,
            client_1.LeadStatus.FOLLOW_UP_PENDING,
            client_1.LeadStatus.FOLLOW_UP_SENT,
            client_1.LeadStatus.BOOKED,
            client_1.LeadStatus.WON,
            client_1.LeadStatus.LOST,
        ];
        const leadsByStatus = await Promise.all(kanbanStatuses.map(async (status) => {
            const statusWhere = { ...where, status };
            const [leads, count] = await Promise.all([
                this.prisma.lead.findMany({
                    where: statusWhere,
                    orderBy: { createdAt: 'desc' },
                    take: 50,
                    include: {
                        workflow: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                        _count: {
                            select: {
                                events: true,
                                bookings: true,
                            },
                        },
                    },
                }),
                this.prisma.lead.count({ where: statusWhere }),
            ]);
            return {
                status,
                leads,
                count,
            };
        }));
        return {
            columns: leadsByStatus,
            view: 'kanban',
        };
    }
    async getLeadById(workspaceId, leadId) {
        const lead = await this.prisma.lead.findUnique({
            where: { id: leadId },
            include: {
                workflow: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                fieldData: {
                    orderBy: { createdAt: 'asc' },
                },
                events: {
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                    include: {
                        triggeredBy: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                            },
                        },
                    },
                },
                bookings: {
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                },
            },
        });
        if (!lead) {
            throw new common_1.NotFoundException('Lead not found');
        }
        if (lead.workspaceId !== workspaceId) {
            throw new common_1.ForbiddenException('Access denied to this lead');
        }
        return lead;
    }
    async getLeadMetrics(workspaceId, query) {
        const { period = '30d' } = query;
        const now = new Date();
        const daysMap = { '7d': 7, '30d': 30, '90d': 90 };
        const days = daysMap[period];
        const currentPeriodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        const previousPeriodStart = new Date(currentPeriodStart.getTime() - days * 24 * 60 * 60 * 1000);
        const [totalLeads, newToday, qualified, currentLeads, previousLeads] = await Promise.all([
            this.prisma.lead.count({
                where: { workspaceId },
            }),
            this.prisma.lead.count({
                where: {
                    workspaceId,
                    createdAt: {
                        gte: new Date(now.setHours(0, 0, 0, 0)),
                    },
                },
            }),
            this.prisma.lead.count({
                where: {
                    workspaceId,
                    status: { in: [client_1.LeadStatus.RESPONDED, client_1.LeadStatus.BOOKED, client_1.LeadStatus.WON] },
                },
            }),
            this.prisma.lead.findMany({
                where: {
                    workspaceId,
                    createdAt: { gte: currentPeriodStart },
                },
                select: { score: true, createdAt: true },
            }),
            this.prisma.lead.findMany({
                where: {
                    workspaceId,
                    createdAt: {
                        gte: previousPeriodStart,
                        lt: currentPeriodStart,
                    },
                },
                select: { score: true, createdAt: true },
            }),
        ]);
        const currentAvgScore = currentLeads.length > 0
            ? currentLeads.reduce((sum, lead) => sum + lead.score, 0) / currentLeads.length
            : 0;
        const previousAvgScore = previousLeads.length > 0
            ? previousLeads.reduce((sum, lead) => sum + lead.score, 0) / previousLeads.length
            : 0;
        const totalLeadsChange = previousLeads.length > 0
            ? ((currentLeads.length - previousLeads.length) / previousLeads.length) * 100
            : currentLeads.length > 0
                ? 100
                : 0;
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const newYesterday = await this.prisma.lead.count({
            where: {
                workspaceId,
                createdAt: {
                    gte: new Date(yesterday.setHours(0, 0, 0, 0)),
                    lt: new Date(now.setHours(0, 0, 0, 0)),
                },
            },
        });
        const newTodayChange = newToday - newYesterday;
        const qualifiedPrevious = await this.prisma.lead.count({
            where: {
                workspaceId,
                status: { in: [client_1.LeadStatus.RESPONDED, client_1.LeadStatus.BOOKED, client_1.LeadStatus.WON] },
                createdAt: {
                    gte: previousPeriodStart,
                    lt: currentPeriodStart,
                },
            },
        });
        const qualifiedCurrent = await this.prisma.lead.count({
            where: {
                workspaceId,
                status: { in: [client_1.LeadStatus.RESPONDED, client_1.LeadStatus.BOOKED, client_1.LeadStatus.WON] },
                createdAt: { gte: currentPeriodStart },
            },
        });
        const qualifiedChange = qualifiedPrevious > 0
            ? ((qualifiedCurrent - qualifiedPrevious) / qualifiedPrevious) * 100
            : qualifiedCurrent > 0
                ? 100
                : 0;
        const averageScoreChange = currentAvgScore - previousAvgScore;
        return {
            totalLeads,
            totalLeadsChange: Math.round(totalLeadsChange * 10) / 10,
            newToday,
            newTodayChange,
            qualified,
            qualifiedChange: Math.round(qualifiedChange * 10) / 10,
            averageScore: Math.round(currentAvgScore * 10) / 10,
            averageScoreChange: Math.round(averageScoreChange * 10) / 10,
        };
    }
    async updateLead(workspaceId, leadId, dto, userId) {
        const lead = await this.prisma.lead.findUnique({
            where: { id: leadId },
        });
        if (!lead) {
            throw new common_1.NotFoundException('Lead not found');
        }
        if (lead.workspaceId !== workspaceId) {
            throw new common_1.ForbiddenException('Access denied to this lead');
        }
        const changes = [];
        if (dto.status && dto.status !== lead.status) {
            changes.push(`Status changed from ${lead.status} to ${dto.status}`);
        }
        if (dto.score !== undefined && dto.score !== lead.score) {
            changes.push(`Score updated from ${lead.score} to ${dto.score}`);
        }
        const updateData = {
            ...(dto.name !== undefined && { name: dto.name }),
            ...(dto.email !== undefined && { email: dto.email }),
            ...(dto.phone !== undefined && { phone: dto.phone }),
            ...(dto.companyName !== undefined && { companyName: dto.companyName }),
            ...(dto.status !== undefined && { status: dto.status }),
            ...(dto.score !== undefined && { score: dto.score }),
            ...(dto.tags !== undefined && { tags: dto.tags }),
            ...(dto.sourceMetadata !== undefined
                ? dto.sourceMetadata === null
                    ? { sourceMetadata: client_1.Prisma.JsonNull }
                    : { sourceMetadata: dto.sourceMetadata }
                : {}),
            lastActivityAt: new Date(),
        };
        const updatedLead = await this.prisma.lead.update({
            where: { id: leadId },
            data: updateData,
            include: {
                workflow: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                fieldData: true,
                events: {
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                },
            },
        });
        if (changes.length > 0) {
            await this.prisma.leadEvent.createMany({
                data: changes.map((description) => ({
                    leadId,
                    eventType: dto.status ? 'STATUS_CHANGED' : 'SCORE_UPDATED',
                    description,
                    triggeredByUserId: userId || null,
                })),
            });
        }
        return updatedLead;
    }
    async bulkUpdateLeads(workspaceId, dto, userId) {
        const { leadIds, status, tags, addTags, removeTags } = dto;
        const leads = await this.prisma.lead.findMany({
            where: {
                id: { in: leadIds },
                workspaceId,
            },
        });
        if (leads.length !== leadIds.length) {
            throw new common_1.ForbiddenException('Some leads do not belong to this workspace');
        }
        const updateData = {
            lastActivityAt: new Date(),
            ...(status && { status }),
        };
        if (tags) {
            updateData.tags = tags;
        }
        else if (addTags || removeTags) {
            for (const lead of leads) {
                let newTags = [...lead.tags];
                if (addTags) {
                    newTags = [...new Set([...newTags, ...addTags])];
                }
                if (removeTags) {
                    newTags = newTags.filter((tag) => !removeTags.includes(tag));
                }
                await this.prisma.lead.update({
                    where: { id: lead.id },
                    data: { tags: newTags, lastActivityAt: new Date() },
                });
            }
        }
        if (!addTags && !removeTags) {
            await this.prisma.lead.updateMany({
                where: { id: { in: leadIds } },
                data: updateData,
            });
        }
        if (status) {
            const description = `Status changed to ${status}`;
            await this.prisma.leadEvent.createMany({
                data: leadIds.map((leadId) => ({
                    leadId,
                    eventType: 'STATUS_CHANGED',
                    description,
                    triggeredByUserId: userId || null,
                })),
            });
        }
        return {
            success: true,
            updatedCount: leadIds.length,
        };
    }
    async deleteLead(workspaceId, leadId) {
        const lead = await this.prisma.lead.findUnique({
            where: { id: leadId },
        });
        if (!lead) {
            throw new common_1.NotFoundException('Lead not found');
        }
        if (lead.workspaceId !== workspaceId) {
            throw new common_1.ForbiddenException('Access denied to this lead');
        }
        await this.prisma.lead.delete({
            where: { id: leadId },
        });
        return { success: true };
    }
    async updateLeadStatus(workspaceId, leadId, dto, userId) {
        const lead = await this.prisma.lead.findUnique({
            where: { id: leadId },
        });
        if (!lead) {
            throw new common_1.NotFoundException('Lead not found');
        }
        if (lead.workspaceId !== workspaceId) {
            throw new common_1.ForbiddenException('Access denied to this lead');
        }
        const oldStatus = lead.status;
        const newStatus = dto.status;
        const updatedLead = await this.prisma.lead.update({
            where: { id: leadId },
            data: {
                status: newStatus,
                lastActivityAt: new Date(),
            },
            include: {
                workflow: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                _count: {
                    select: {
                        events: true,
                        bookings: true,
                    },
                },
            },
        });
        await this.prisma.leadEvent.create({
            data: {
                leadId,
                eventType: 'status_changed',
                eventCategory: client_1.LeadEventCategory.system,
                description: `Status changed from ${oldStatus} to ${newStatus}`,
                metadata: {
                    oldStatus,
                    newStatus,
                    changedBy: userId || 'system',
                    changedAt: new Date().toISOString(),
                },
                triggeredByUserId: userId || null,
            },
        });
        return updatedLead;
    }
};
exports.LeadsService = LeadsService;
exports.LeadsService = LeadsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LeadsService);
//# sourceMappingURL=leads.service.js.map