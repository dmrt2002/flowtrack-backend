import { z } from 'zod';

export const createMeetingSchema = z.object({
  leadEmail: z.string().email('Invalid email address'),
  leadName: z.string().min(1, 'Lead name is required'),
  preferredDate: z.string().datetime().optional(),
  durationMinutes: z.number().int().min(15).max(240).default(30).optional(),
  scheduledTime: z.string().datetime().optional(), // Exact time if provided
});

export type CreateMeetingDto = z.infer<typeof createMeetingSchema>;

export const timeSlotSchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  available: z.boolean(),
});

export type TimeSlotDto = z.infer<typeof timeSlotSchema>;

export const meetingEventSchema = z.object({
  eventId: z.string(),
  meetLink: z.string().url(),
  scheduledTime: z.string().datetime(),
  status: z.enum(['accepted', 'declined', 'tentative', 'needsAction', 'unknown']),
});

export type MeetingEventDto = z.infer<typeof meetingEventSchema>;

export const availabilityQuerySchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  durationMinutes: z.number().int().min(15).max(240).default(30).optional(),
});

export type AvailabilityQueryDto = z.infer<typeof availabilityQuerySchema>;

