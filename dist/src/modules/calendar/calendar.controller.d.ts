import { CalendarService } from './calendar.service';
import type { CreateMeetingDto, AvailabilityQueryDto } from './dto/meeting.dto';
import { PrismaService } from '../../prisma/prisma.service';
export declare class CalendarController {
    private readonly calendarService;
    private readonly prisma;
    constructor(calendarService: CalendarService, prisma: PrismaService);
    getAvailability(user: any, query: AvailabilityQueryDto): Promise<{
        success: boolean;
        data: {
            slots: {
                startTime: string;
                endTime: string;
                available: boolean;
            }[];
        };
    }>;
    createMeeting(user: any, dto: CreateMeetingDto): Promise<{
        success: boolean;
        message: string;
        data: {
            eventId: string;
            meetLink: string;
            scheduledTime: string;
        };
    }>;
    getMeetingStatus(user: any, eventId: string): Promise<{
        success: boolean;
        data: {
            status: "accepted" | "declined" | "tentative" | "needsAction" | "unknown";
            leadResponse?: "accepted" | "declined" | "tentative" | "needsAction";
        };
    }>;
    cancelMeeting(user: any, eventId: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
