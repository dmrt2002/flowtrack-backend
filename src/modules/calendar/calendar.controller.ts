import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { UnifiedAuthGuard } from '../../auth/guards/unified-auth.guard';
import { User } from '../../auth/decorators/user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  createMeetingSchema,
  availabilityQuerySchema,
} from './dto/meeting.dto';
import type {
  CreateMeetingDto,
  AvailabilityQueryDto,
} from './dto/meeting.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('calendar')
@UseGuards(UnifiedAuthGuard)
export class CalendarController {
  constructor(
    private readonly calendarService: CalendarService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * GET /api/v1/calendar/availability
   * Get available time slots for scheduling
   */
  @Get('availability')
  async getAvailability(
    @User() user: any,
    @Query(new ZodValidationPipe(availabilityQuerySchema))
    query: AvailabilityQueryDto,
  ) {
    // Get user's workspace
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

    const workspace =
      userRecord.ownedWorkspaces[0] ||
      userRecord.workspaceMemberships[0]?.workspace ||
      null;

    if (!workspace) {
      throw new Error('No workspace found for user');
    }

    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);
    const durationMinutes = query.durationMinutes || 30;

    const slots = await this.calendarService.getAvailableTimeSlots(
      workspace.id,
      { start: startDate, end: endDate },
      durationMinutes,
    );

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

  /**
   * POST /api/v1/calendar/meetings
   * Create meeting event with Google Meet link
   */
  @Post('meetings')
  @HttpCode(HttpStatus.CREATED)
  async createMeeting(
    @User() user: any,
    @Body(new ZodValidationPipe(createMeetingSchema)) dto: CreateMeetingDto,
  ) {
    // Get user's workspace
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

    const workspace =
      userRecord.ownedWorkspaces[0] ||
      userRecord.workspaceMemberships[0]?.workspace ||
      null;

    if (!workspace) {
      throw new Error('No workspace found for user');
    }

    // Determine scheduled time
    let scheduledTime: Date;
    if (dto.scheduledTime) {
      scheduledTime = new Date(dto.scheduledTime);
    } else if (dto.preferredDate) {
      scheduledTime = new Date(dto.preferredDate);
    } else {
      // Default to next available slot
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0); // 9 AM tomorrow

      const endDate = new Date(tomorrow);
      endDate.setDate(endDate.getDate() + 30); // Next 30 days

      const slots = await this.calendarService.getAvailableTimeSlots(
        workspace.id,
        { start: tomorrow, end: endDate },
        dto.durationMinutes || 30,
      );

      if (slots.length === 0) {
        throw new Error('No available time slots found');
      }

      scheduledTime = slots[0].startTime;
    }

    const result = await this.calendarService.createMeetingEvent(
      workspace.id,
      dto.leadEmail,
      dto.leadName,
      scheduledTime,
      dto.durationMinutes || 30,
    );

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

  /**
   * GET /api/v1/calendar/meetings/:eventId/status
   * Get meeting status
   */
  @Get('meetings/:eventId/status')
  async getMeetingStatus(
    @User() user: any,
    @Param('eventId') eventId: string,
  ) {
    // Get user's workspace
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

    const workspace =
      userRecord.ownedWorkspaces[0] ||
      userRecord.workspaceMemberships[0]?.workspace ||
      null;

    if (!workspace) {
      throw new Error('No workspace found for user');
    }

    const status = await this.calendarService.getEventStatus(
      workspace.id,
      eventId,
    );

    return {
      success: true,
      data: status,
    };
  }

  /**
   * DELETE /api/v1/calendar/meetings/:eventId
   * Cancel meeting
   */
  @Delete('meetings/:eventId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelMeeting(
    @User() user: any,
    @Param('eventId') eventId: string,
  ) {
    // Get user's workspace
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

    const workspace =
      userRecord.ownedWorkspaces[0] ||
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
}

