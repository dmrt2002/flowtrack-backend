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
var CalendarService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarService = void 0;
const common_1 = require("@nestjs/common");
const googleapis_1 = require("googleapis");
const oauth_service_1 = require("../oauth/oauth.service");
const prisma_service_1 = require("../../prisma/prisma.service");
let CalendarService = CalendarService_1 = class CalendarService {
    oauthService;
    prisma;
    logger = new common_1.Logger(CalendarService_1.name);
    constructor(oauthService, prisma) {
        this.oauthService = oauthService;
        this.prisma = prisma;
    }
    async getCalendarClient(workspaceId) {
        const credentials = await this.oauthService.getCalendarCredentials(workspaceId);
        if (!credentials) {
            throw new common_1.NotFoundException('Google Calendar not connected. Please connect Gmail first.');
        }
        const oauth2Client = new googleapis_1.google.auth.OAuth2();
        oauth2Client.setCredentials({
            access_token: credentials.accessToken,
            refresh_token: credentials.refreshToken,
        });
        return googleapis_1.google.calendar({ version: 'v3', auth: oauth2Client });
    }
    async checkAvailability(workspaceId, startTime, endTime) {
        try {
            const calendar = await this.getCalendarClient(workspaceId);
            const credentials = await this.oauthService.getCalendarCredentials(workspaceId);
            if (!credentials?.providerEmail) {
                return false;
            }
            const freebusyResponse = await calendar.freebusy.query({
                requestBody: {
                    timeMin: startTime.toISOString(),
                    timeMax: endTime.toISOString(),
                    items: [{ id: credentials.providerEmail }],
                },
            });
            const calendars = freebusyResponse.data.calendars;
            const calendarData = calendars?.[credentials.providerEmail];
            return !calendarData?.busy || calendarData.busy.length === 0;
        }
        catch (error) {
            this.logger.error('Error checking availability:', error);
            return false;
        }
    }
    async getAvailableTimeSlots(workspaceId, dateRange, durationMinutes = 30) {
        try {
            const calendar = await this.getCalendarClient(workspaceId);
            const credentials = await this.oauthService.getCalendarCredentials(workspaceId);
            if (!credentials?.providerEmail) {
                return [];
            }
            const freebusyResponse = await calendar.freebusy.query({
                requestBody: {
                    timeMin: dateRange.start.toISOString(),
                    timeMax: dateRange.end.toISOString(),
                    items: [{ id: credentials.providerEmail }],
                },
            });
            const calendars = freebusyResponse.data.calendars;
            const calendarData = calendars?.[credentials.providerEmail];
            const busyPeriods = calendarData?.busy || [];
            const slots = [];
            const current = new Date(dateRange.start);
            while (current < dateRange.end) {
                const hour = current.getHours();
                const day = current.getDay();
                if (hour >= 9 && hour < 17 && day >= 1 && day <= 5) {
                    const slotStart = new Date(current);
                    const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60 * 1000);
                    const isAvailable = !busyPeriods.some((busy) => {
                        const busyStart = new Date(busy.start || '');
                        const busyEnd = new Date(busy.end || '');
                        return ((slotStart >= busyStart && slotStart < busyEnd) ||
                            (slotEnd > busyStart && slotEnd <= busyEnd) ||
                            (slotStart <= busyStart && slotEnd >= busyEnd));
                    });
                    if (isAvailable && slotEnd <= dateRange.end) {
                        slots.push({ startTime: slotStart, endTime: slotEnd });
                    }
                }
                current.setMinutes(current.getMinutes() + 30);
            }
            return slots;
        }
        catch (error) {
            this.logger.error('Error getting available time slots:', error);
            return [];
        }
    }
    async createMeetingEvent(workspaceId, leadEmail, leadName, scheduledTime, durationMinutes = 30) {
        try {
            const calendar = await this.getCalendarClient(workspaceId);
            const credentials = await this.oauthService.getCalendarCredentials(workspaceId);
            if (!credentials?.providerEmail) {
                throw new common_1.NotFoundException('Google Calendar not connected');
            }
            const endTime = new Date(scheduledTime.getTime() + durationMinutes * 60 * 1000);
            const event = {
                summary: `Meeting with ${leadName}`,
                description: `Meeting scheduled via FlowTrack`,
                start: {
                    dateTime: scheduledTime.toISOString(),
                    timeZone: 'UTC',
                },
                end: {
                    dateTime: endTime.toISOString(),
                    timeZone: 'UTC',
                },
                attendees: [
                    { email: credentials.providerEmail },
                    { email: leadEmail },
                ],
                conferenceData: {
                    createRequest: {
                        requestId: `meet-${Date.now()}`,
                        conferenceSolutionKey: {
                            type: 'hangoutsMeet',
                        },
                    },
                },
                reminders: {
                    useDefault: false,
                    overrides: [
                        { method: 'email', minutes: 24 * 60 },
                        { method: 'popup', minutes: 15 },
                    ],
                },
            };
            const response = await calendar.events.insert({
                calendarId: 'primary',
                requestBody: event,
                conferenceDataVersion: 1,
                sendUpdates: 'all',
            });
            const meetLink = response.data.conferenceData?.entryPoints?.find((ep) => ep.entryPointType === 'video')?.uri || '';
            if (!response.data.id) {
                throw new Error('Failed to create calendar event');
            }
            return {
                eventId: response.data.id,
                meetLink,
                scheduledTime,
            };
        }
        catch (error) {
            this.logger.error('Error creating meeting event:', error);
            throw error;
        }
    }
    async getEventStatus(workspaceId, eventId) {
        try {
            const calendar = await this.getCalendarClient(workspaceId);
            const credentials = await this.oauthService.getCalendarCredentials(workspaceId);
            if (!credentials?.providerEmail) {
                throw new common_1.NotFoundException('Google Calendar not connected');
            }
            const response = await calendar.events.get({
                calendarId: 'primary',
                eventId,
            });
            const event = response.data;
            const attendees = event.attendees || [];
            const ownerAttendee = attendees.find((a) => a.email === credentials.providerEmail);
            const ownerStatus = ownerAttendee?.responseStatus || 'needsAction';
            const leadAttendee = attendees.find((a) => a.email !== credentials.providerEmail);
            const leadResponse = leadAttendee?.responseStatus;
            return {
                status: ownerStatus,
                leadResponse,
            };
        }
        catch (error) {
            this.logger.error('Error getting event status:', error);
            return { status: 'unknown' };
        }
    }
    async cancelEvent(workspaceId, eventId) {
        try {
            const calendar = await this.getCalendarClient(workspaceId);
            await calendar.events.delete({
                calendarId: 'primary',
                eventId,
                sendUpdates: 'all',
            });
        }
        catch (error) {
            this.logger.error('Error cancelling event:', error);
            throw error;
        }
    }
    async listUpcomingEvents(workspaceId, maxResults = 10) {
        try {
            const calendar = await this.getCalendarClient(workspaceId);
            const response = await calendar.events.list({
                calendarId: 'primary',
                timeMin: new Date().toISOString(),
                maxResults,
                singleEvents: true,
                orderBy: 'startTime',
            });
            const events = response.data.items || [];
            return events.map((event) => ({
                id: event.id || '',
                summary: event.summary || 'No title',
                start: new Date(event.start?.dateTime || event.start?.date || ''),
                end: new Date(event.end?.dateTime || event.end?.date || ''),
            }));
        }
        catch (error) {
            this.logger.error('Error listing upcoming events:', error);
            return [];
        }
    }
    async syncMeetingStatuses() {
        let updated = 0;
        let errors = 0;
        try {
            const leadsWithMeetings = await this.prisma.lead.findMany({
                where: {
                    meetingEventId: { not: null },
                    deletedAt: null,
                },
                select: {
                    id: true,
                    workspaceId: true,
                    meetingEventId: true,
                    meetingStatus: true,
                },
            });
            for (const lead of leadsWithMeetings) {
                if (!lead.meetingEventId)
                    continue;
                try {
                    const status = await this.getEventStatus(lead.workspaceId, lead.meetingEventId);
                    let newMeetingStatus = null;
                    if (status.leadResponse) {
                        switch (status.leadResponse) {
                            case 'accepted':
                                newMeetingStatus = 'ACCEPTED';
                                break;
                            case 'declined':
                                newMeetingStatus = 'DECLINED';
                                break;
                            case 'tentative':
                                newMeetingStatus = 'SCHEDULED';
                                break;
                            case 'needsAction':
                                newMeetingStatus = 'SCHEDULED';
                                break;
                        }
                    }
                    if (newMeetingStatus === 'ACCEPTED') {
                        const calendar = await this.getCalendarClient(lead.workspaceId);
                        const event = await calendar.events.get({
                            calendarId: 'primary',
                            eventId: lead.meetingEventId,
                        });
                        if (event.data.end?.dateTime) {
                            const endTime = new Date(event.data.end.dateTime);
                            if (endTime < new Date()) {
                                newMeetingStatus = 'COMPLETED';
                            }
                        }
                    }
                    if (newMeetingStatus && newMeetingStatus !== lead.meetingStatus) {
                        await this.prisma.lead.update({
                            where: { id: lead.id },
                            data: { meetingStatus: newMeetingStatus },
                        });
                        updated++;
                    }
                }
                catch (error) {
                    this.logger.error(`Error syncing meeting status for lead ${lead.id}:`, error);
                    errors++;
                }
            }
            this.logger.log(`Meeting status sync completed: ${updated} updated, ${errors} errors`);
            return { updated, errors };
        }
        catch (error) {
            this.logger.error('Error in meeting status sync:', error);
            return { updated, errors: 0 };
        }
    }
};
exports.CalendarService = CalendarService;
exports.CalendarService = CalendarService = CalendarService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [oauth_service_1.OAuthService,
        prisma_service_1.PrismaService])
], CalendarService);
//# sourceMappingURL=calendar.service.js.map