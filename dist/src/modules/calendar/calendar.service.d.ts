import { OAuthService } from '../oauth/oauth.service';
import { PrismaService } from '../../prisma/prisma.service';
export declare class CalendarService {
    private readonly oauthService;
    private readonly prisma;
    private readonly logger;
    constructor(oauthService: OAuthService, prisma: PrismaService);
    private getCalendarClient;
    checkAvailability(workspaceId: string, startTime: Date, endTime: Date): Promise<boolean>;
    getAvailableTimeSlots(workspaceId: string, dateRange: {
        start: Date;
        end: Date;
    }, durationMinutes?: number): Promise<Array<{
        startTime: Date;
        endTime: Date;
    }>>;
    createMeetingEvent(workspaceId: string, leadEmail: string, leadName: string, scheduledTime: Date, durationMinutes?: number): Promise<{
        eventId: string;
        meetLink: string;
        scheduledTime: Date;
    }>;
    getEventStatus(workspaceId: string, eventId: string): Promise<{
        status: 'accepted' | 'declined' | 'tentative' | 'needsAction' | 'unknown';
        leadResponse?: 'accepted' | 'declined' | 'tentative' | 'needsAction';
    }>;
    cancelEvent(workspaceId: string, eventId: string): Promise<void>;
    listUpcomingEvents(workspaceId: string, maxResults?: number): Promise<Array<{
        id: string;
        summary: string;
        start: Date;
        end: Date;
    }>>;
    syncMeetingStatuses(): Promise<{
        updated: number;
        errors: number;
    }>;
}
