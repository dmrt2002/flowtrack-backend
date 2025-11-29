"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.availabilityQuerySchema = exports.meetingEventSchema = exports.timeSlotSchema = exports.createMeetingSchema = void 0;
const zod_1 = require("zod");
exports.createMeetingSchema = zod_1.z.object({
    leadEmail: zod_1.z.string().email('Invalid email address'),
    leadName: zod_1.z.string().min(1, 'Lead name is required'),
    preferredDate: zod_1.z.string().datetime().optional(),
    durationMinutes: zod_1.z.number().int().min(15).max(240).default(30).optional(),
    scheduledTime: zod_1.z.string().datetime().optional(),
});
exports.timeSlotSchema = zod_1.z.object({
    startTime: zod_1.z.string().datetime(),
    endTime: zod_1.z.string().datetime(),
    available: zod_1.z.boolean(),
});
exports.meetingEventSchema = zod_1.z.object({
    eventId: zod_1.z.string(),
    meetLink: zod_1.z.string().url(),
    scheduledTime: zod_1.z.string().datetime(),
    status: zod_1.z.enum(['accepted', 'declined', 'tentative', 'needsAction', 'unknown']),
});
exports.availabilityQuerySchema = zod_1.z.object({
    startDate: zod_1.z.string().datetime(),
    endDate: zod_1.z.string().datetime(),
    durationMinutes: zod_1.z.number().int().min(15).max(240).default(30).optional(),
});
//# sourceMappingURL=meeting.dto.js.map