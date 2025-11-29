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
var AttributionMatcherService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttributionMatcherService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
let AttributionMatcherService = AttributionMatcherService_1 = class AttributionMatcherService {
    prisma;
    logger = new common_1.Logger(AttributionMatcherService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async matchCalendlyBooking(workspaceId, inviteeEmail, utmParams, eventUri) {
        const utmContent = utmParams.utm_content || utmParams.UTM_CONTENT;
        if (utmContent && utmContent.startsWith('lead_')) {
            const leadId = utmContent.replace('lead_', '');
            const lead = await this.prisma.lead.findFirst({
                where: {
                    id: leadId,
                    workspaceId,
                },
            });
            if (lead) {
                this.logger.log(`Matched Calendly booking via UTM parameter: lead ${leadId}`);
                return {
                    leadId: lead.id,
                    attributionMethod: 'UTM',
                    utmContent,
                    confidence: 'HIGH',
                };
            }
            this.logger.warn(`UTM parameter contained lead ID ${leadId} but lead not found in workspace`);
        }
        const emailMatch = await this.matchByEmail(workspaceId, inviteeEmail);
        if (emailMatch.leadId) {
            this.logger.log(`Matched Calendly booking via email: lead ${emailMatch.leadId}`);
            return emailMatch;
        }
        this.logger.warn(`Could not match Calendly booking for email ${inviteeEmail} in workspace ${workspaceId}`);
        return {
            leadId: null,
            attributionMethod: null,
            confidence: 'LOW',
        };
    }
    async matchByEmail(workspaceId, email) {
        const normalizedEmail = email.toLowerCase().trim();
        const lead = await this.prisma.lead.findFirst({
            where: {
                workspaceId,
                email: normalizedEmail,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        if (lead) {
            return {
                leadId: lead.id,
                attributionMethod: null,
                confidence: 'MEDIUM',
            };
        }
        return {
            leadId: null,
            attributionMethod: null,
            confidence: 'LOW',
        };
    }
    async createUnmatchedBooking(workspaceId, workflowId, oauthCredentialId, bookingData) {
        this.logger.log(`Creating unmatched booking for ${bookingData.inviteeEmail} in workspace ${workspaceId}`);
        let finalWorkflowId = workflowId;
        if (!finalWorkflowId) {
            const defaultWorkflow = await this.prisma.workflow.findFirst({
                where: {
                    workspaceId,
                    status: { in: ['active', 'draft'] },
                },
                orderBy: { createdAt: 'desc' },
            });
            if (!defaultWorkflow) {
                this.logger.warn(`Cannot create lead without workflowId for unmatched booking in workspace ${workspaceId} - no workflows found`);
                throw new Error('No workflow found for workspace. Please create a workflow first.');
            }
            finalWorkflowId = defaultWorkflow.id;
            this.logger.log(`Using default workflow ${finalWorkflowId} for unmatched booking in workspace ${workspaceId}`);
        }
        const lead = await this.prisma.lead.create({
            data: {
                workspaceId,
                workflowId: finalWorkflowId,
                email: bookingData.inviteeEmail.toLowerCase(),
                name: bookingData.inviteeName || null,
                status: 'NEW',
                source: 'MANUAL',
                meetingEventId: bookingData.providerEventId,
                meetingStatus: 'scheduled',
            },
        });
        const booking = await this.prisma.booking.create({
            data: {
                workspaceId,
                leadId: lead.id,
                workflowId,
                oauthCredentialId,
                providerType: bookingData.providerType,
                providerEventId: bookingData.providerEventId,
                providerEventUri: bookingData.providerEventUri,
                eventName: bookingData.eventName,
                eventStartTime: bookingData.eventStartTime,
                eventEndTime: bookingData.eventEndTime,
                eventDurationMinutes: bookingData.eventDurationMinutes,
                eventTimezone: bookingData.eventTimezone,
                inviteeEmail: bookingData.inviteeEmail,
                inviteeName: bookingData.inviteeName,
                inviteeTimezone: bookingData.inviteeTimezone,
                bookingStatus: 'scheduled',
                attributionMethod: null,
                meetingLocation: bookingData.meetingLocation,
                meetingUrl: bookingData.meetingUrl,
                meetingNotes: bookingData.meetingNotes,
                responses: bookingData.responses,
                receivedVia: bookingData.receivedVia,
                rawPayload: bookingData.rawPayload,
                syncedAt: new Date(),
            },
        });
        return {
            leadId: lead.id,
            bookingId: booking.id,
        };
    }
    async updateLeadWithBooking(leadId, bookingId, eventId, status) {
        await this.prisma.lead.update({
            where: { id: leadId },
            data: {
                meetingEventId: eventId,
                meetingStatus: status,
                ...(status === 'scheduled' && { status: 'BOOKED' }),
            },
        });
        this.logger.log(`Updated lead ${leadId} with booking ${bookingId} (status: ${status})`);
    }
    async findBookingByProviderEventId(providerEventId, providerType) {
        return this.prisma.booking.findUnique({
            where: {
                providerEventId_providerType: {
                    providerEventId,
                    providerType,
                },
            },
            include: {
                lead: true,
            },
        });
    }
    async updateBookingStatus(bookingId, status, cancellationReason, rescheduledFromBookingId) {
        await this.prisma.booking.update({
            where: { id: bookingId },
            data: {
                bookingStatus: status,
                cancellationReason,
                rescheduledFromBookingId,
                updatedAt: new Date(),
            },
        });
        this.logger.log(`Updated booking ${bookingId} status to ${status}`);
    }
    async getBookingStats(workspaceId) {
        const [total, scheduled, canceled, completed] = await Promise.all([
            this.prisma.booking.count({ where: { workspaceId } }),
            this.prisma.booking.count({
                where: { workspaceId, bookingStatus: 'scheduled' },
            }),
            this.prisma.booking.count({
                where: { workspaceId, bookingStatus: 'canceled' },
            }),
            this.prisma.booking.count({
                where: { workspaceId, bookingStatus: 'completed' },
            }),
        ]);
        return {
            total,
            scheduled,
            canceled,
            completed,
        };
    }
};
exports.AttributionMatcherService = AttributionMatcherService;
exports.AttributionMatcherService = AttributionMatcherService = AttributionMatcherService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AttributionMatcherService);
//# sourceMappingURL=attribution-matcher.service.js.map