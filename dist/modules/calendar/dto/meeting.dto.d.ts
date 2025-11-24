import { z } from 'zod';
export declare const createMeetingSchema: z.ZodObject<{
    leadEmail: z.ZodString;
    leadName: z.ZodString;
    preferredDate: z.ZodOptional<z.ZodString>;
    durationMinutes: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    scheduledTime: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type CreateMeetingDto = z.infer<typeof createMeetingSchema>;
export declare const timeSlotSchema: z.ZodObject<{
    startTime: z.ZodString;
    endTime: z.ZodString;
    available: z.ZodBoolean;
}, z.core.$strip>;
export type TimeSlotDto = z.infer<typeof timeSlotSchema>;
export declare const meetingEventSchema: z.ZodObject<{
    eventId: z.ZodString;
    meetLink: z.ZodString;
    scheduledTime: z.ZodString;
    status: z.ZodEnum<{
        unknown: "unknown";
        accepted: "accepted";
        declined: "declined";
        tentative: "tentative";
        needsAction: "needsAction";
    }>;
}, z.core.$strip>;
export type MeetingEventDto = z.infer<typeof meetingEventSchema>;
export declare const availabilityQuerySchema: z.ZodObject<{
    startDate: z.ZodString;
    endDate: z.ZodString;
    durationMinutes: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
}, z.core.$strip>;
export type AvailabilityQueryDto = z.infer<typeof availabilityQuerySchema>;
