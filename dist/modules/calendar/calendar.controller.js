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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarController = void 0;
const common_1 = require("@nestjs/common");
const calendar_service_1 = require("./calendar.service");
const unified_auth_guard_1 = require("../../auth/guards/unified-auth.guard");
const user_decorator_1 = require("../../auth/decorators/user.decorator");
const zod_validation_pipe_1 = require("../../common/pipes/zod-validation.pipe");
const meeting_dto_1 = require("./dto/meeting.dto");
const prisma_service_1 = require("../../prisma/prisma.service");
let CalendarController = class CalendarController {
    calendarService;
    prisma;
    constructor(calendarService, prisma) {
        this.calendarService = calendarService;
        this.prisma = prisma;
    }
    async getAvailability(user, query) {
        const userRecord = await this.prisma.user.findUnique({
            where: { id: user.id },
            include: {
                ownedWorkspaces: true,
                workspaceMemberships: {
                    include: {
                        workspace: true,
                    },
                },
            },
        });
        if (!userRecord) {
            throw new Error('User not found');
        }
        const workspace = userRecord.ownedWorkspaces[0] ||
            userRecord.workspaceMemberships[0]?.workspace ||
            null;
        if (!workspace) {
            throw new Error('No workspace found for user');
        }
        const startDate = new Date(query.startDate);
        const endDate = new Date(query.endDate);
        const durationMinutes = query.durationMinutes || 30;
        const slots = await this.calendarService.getAvailableTimeSlots(workspace.id, { start: startDate, end: endDate }, durationMinutes);
        return {
            success: true,
            data: {
                slots: slots.map((slot) => ({
                    startTime: slot.startTime.toISOString(),
                    endTime: slot.endTime.toISOString(),
                    available: true,
                })),
            },
        };
    }
    async createMeeting(user, dto) {
        const userRecord = await this.prisma.user.findUnique({
            where: { id: user.id },
            include: {
                ownedWorkspaces: true,
                workspaceMemberships: {
                    include: {
                        workspace: true,
                    },
                },
            },
        });
        if (!userRecord) {
            throw new Error('User not found');
        }
        const workspace = userRecord.ownedWorkspaces[0] ||
            userRecord.workspaceMemberships[0]?.workspace ||
            null;
        if (!workspace) {
            throw new Error('No workspace found for user');
        }
        let scheduledTime;
        if (dto.scheduledTime) {
            scheduledTime = new Date(dto.scheduledTime);
        }
        else if (dto.preferredDate) {
            scheduledTime = new Date(dto.preferredDate);
        }
        else {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(9, 0, 0, 0);
            const endDate = new Date(tomorrow);
            endDate.setDate(endDate.getDate() + 30);
            const slots = await this.calendarService.getAvailableTimeSlots(workspace.id, { start: tomorrow, end: endDate }, dto.durationMinutes || 30);
            if (slots.length === 0) {
                throw new Error('No available time slots found');
            }
            scheduledTime = slots[0].startTime;
        }
        const result = await this.calendarService.createMeetingEvent(workspace.id, dto.leadEmail, dto.leadName, scheduledTime, dto.durationMinutes || 30);
        return {
            success: true,
            message: 'Meeting created successfully',
            data: {
                eventId: result.eventId,
                meetLink: result.meetLink,
                scheduledTime: result.scheduledTime.toISOString(),
            },
        };
    }
    async getMeetingStatus(user, eventId) {
        const userRecord = await this.prisma.user.findUnique({
            where: { id: user.id },
            include: {
                ownedWorkspaces: true,
                workspaceMemberships: {
                    include: {
                        workspace: true,
                    },
                },
            },
        });
        if (!userRecord) {
            throw new Error('User not found');
        }
        const workspace = userRecord.ownedWorkspaces[0] ||
            userRecord.workspaceMemberships[0]?.workspace ||
            null;
        if (!workspace) {
            throw new Error('No workspace found for user');
        }
        const status = await this.calendarService.getEventStatus(workspace.id, eventId);
        return {
            success: true,
            data: status,
        };
    }
    async cancelMeeting(user, eventId) {
        const userRecord = await this.prisma.user.findUnique({
            where: { id: user.id },
            include: {
                ownedWorkspaces: true,
                workspaceMemberships: {
                    include: {
                        workspace: true,
                    },
                },
            },
        });
        if (!userRecord) {
            throw new Error('User not found');
        }
        const workspace = userRecord.ownedWorkspaces[0] ||
            userRecord.workspaceMemberships[0]?.workspace ||
            null;
        if (!workspace) {
            throw new Error('No workspace found for user');
        }
        await this.calendarService.cancelEvent(workspace.id, eventId);
        return {
            success: true,
            message: 'Meeting cancelled successfully',
        };
    }
};
exports.CalendarController = CalendarController;
__decorate([
    (0, common_1.Get)('availability'),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Query)(new zod_validation_pipe_1.ZodValidationPipe(meeting_dto_1.availabilityQuerySchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CalendarController.prototype, "getAvailability", null);
__decorate([
    (0, common_1.Post)('meetings'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Body)(new zod_validation_pipe_1.ZodValidationPipe(meeting_dto_1.createMeetingSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CalendarController.prototype, "createMeeting", null);
__decorate([
    (0, common_1.Get)('meetings/:eventId/status'),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Param)('eventId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CalendarController.prototype, "getMeetingStatus", null);
__decorate([
    (0, common_1.Delete)('meetings/:eventId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, user_decorator_1.User)()),
    __param(1, (0, common_1.Param)('eventId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CalendarController.prototype, "cancelMeeting", null);
exports.CalendarController = CalendarController = __decorate([
    (0, common_1.Controller)('calendar'),
    (0, common_1.UseGuards)(unified_auth_guard_1.UnifiedAuthGuard),
    __metadata("design:paramtypes", [calendar_service_1.CalendarService,
        prisma_service_1.PrismaService])
], CalendarController);
//# sourceMappingURL=calendar.controller.js.map