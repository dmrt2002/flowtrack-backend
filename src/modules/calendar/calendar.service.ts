import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { google } from 'googleapis';
import { OAuthService } from '../oauth/oauth.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(
    private readonly oauthService: OAuthService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Get authenticated Google Calendar client for a workspace
   * Note: getCalendarCredentials (which calls getGmailCredentials) already handles token refresh
   */
  private async getCalendarClient(workspaceId: string) {
    const credentials = await this.oauthService.getCalendarCredentials(
      workspaceId,
    );

    if (!credentials) {
      throw new NotFoundException(
        'Google Calendar not connected. Please connect Gmail first.',
      );
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: credentials.accessToken,
      refresh_token: credentials.refreshToken,
    });

    return google.calendar({ version: 'v3', auth: oauth2Client });
  }

  /**
   * Check if owner has free slots in a time range
   */
  async checkAvailability(
    workspaceId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<boolean> {
    try {
      const calendar = await this.getCalendarClient(workspaceId);
      const credentials = await this.oauthService.getCalendarCredentials(
        workspaceId,
      );

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

      // If no busy periods, time slot is available
      return !calendarData?.busy || calendarData.busy.length === 0;
    } catch (error) {
      this.logger.error('Error checking availability:', error);
      return false;
    }
  }

  /**
   * Get list of available time slots
   * Default: 30-minute meetings, business hours 9 AM - 5 PM, next 30 days
   */
  async getAvailableTimeSlots(
    workspaceId: string,
    dateRange: { start: Date; end: Date },
    durationMinutes: number = 30,
  ): Promise<Array<{ startTime: Date; endTime: Date }>> {
    try {
      const calendar = await this.getCalendarClient(workspaceId);
      const credentials = await this.oauthService.getCalendarCredentials(
        workspaceId,
      );

      if (!credentials?.providerEmail) {
        return [];
      }

      // Get busy periods
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

      // Generate time slots (every 30 minutes during business hours)
      const slots: Array<{ startTime: Date; endTime: Date }> = [];
      const current = new Date(dateRange.start);

      while (current < dateRange.end) {
        const hour = current.getHours();
        const day = current.getDay();

        // Business hours: 9 AM - 5 PM, Monday - Friday
        if (hour >= 9 && hour < 17 && day >= 1 && day <= 5) {
          const slotStart = new Date(current);
          const slotEnd = new Date(
            slotStart.getTime() + durationMinutes * 60 * 1000,
          );

          // Check if slot overlaps with any busy period
          const isAvailable = !busyPeriods.some((busy) => {
            const busyStart = new Date(busy.start || '');
            const busyEnd = new Date(busy.end || '');
            return (
              (slotStart >= busyStart && slotStart < busyEnd) ||
              (slotEnd > busyStart && slotEnd <= busyEnd) ||
              (slotStart <= busyStart && slotEnd >= busyEnd)
            );
          });

          if (isAvailable && slotEnd <= dateRange.end) {
            slots.push({ startTime: slotStart, endTime: slotEnd });
          }
        }

        // Move to next 30-minute slot
        current.setMinutes(current.getMinutes() + 30);
      }

      return slots;
    } catch (error) {
      this.logger.error('Error getting available time slots:', error);
      return [];
    }
  }

  /**
   * Create calendar event with Google Meet link
   */
  async createMeetingEvent(
    workspaceId: string,
    leadEmail: string,
    leadName: string,
    scheduledTime: Date,
    durationMinutes: number = 30,
  ): Promise<{ eventId: string; meetLink: string; scheduledTime: Date }> {
    try {
      const calendar = await this.getCalendarClient(workspaceId);
      const credentials = await this.oauthService.getCalendarCredentials(
        workspaceId,
      );

      if (!credentials?.providerEmail) {
        throw new NotFoundException('Google Calendar not connected');
      }

      const endTime = new Date(
        scheduledTime.getTime() + durationMinutes * 60 * 1000,
      );

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
            { method: 'email', minutes: 24 * 60 }, // 1 day before
            { method: 'popup', minutes: 15 }, // 15 minutes before
          ],
        },
      };

      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
        conferenceDataVersion: 1,
        sendUpdates: 'all', // Send invites to all attendees
      });

      const meetLink =
        response.data.conferenceData?.entryPoints?.find(
          (ep) => ep.entryPointType === 'video',
        )?.uri || '';

      if (!response.data.id) {
        throw new Error('Failed to create calendar event');
      }

      return {
        eventId: response.data.id,
        meetLink,
        scheduledTime,
      };
    } catch (error) {
      this.logger.error('Error creating meeting event:', error);
      throw error;
    }
  }

  /**
   * Get event status (accepted/declined/tentative)
   */
  async getEventStatus(
    workspaceId: string,
    eventId: string,
  ): Promise<{
    status: 'accepted' | 'declined' | 'tentative' | 'needsAction' | 'unknown';
    leadResponse?: 'accepted' | 'declined' | 'tentative' | 'needsAction';
  }> {
    try {
      const calendar = await this.getCalendarClient(workspaceId);
      const credentials = await this.oauthService.getCalendarCredentials(
        workspaceId,
      );

      if (!credentials?.providerEmail) {
        throw new NotFoundException('Google Calendar not connected');
      }

      const response = await calendar.events.get({
        calendarId: 'primary',
        eventId,
      });

      const event = response.data;
      const attendees = event.attendees || [];

      // Find owner's response
      const ownerAttendee = attendees.find(
        (a) => a.email === credentials.providerEmail,
      );
      const ownerStatus = ownerAttendee?.responseStatus || 'needsAction';

      // Find lead's response (first attendee that's not the owner)
      const leadAttendee = attendees.find(
        (a) => a.email !== credentials.providerEmail,
      );
      const leadResponse = leadAttendee?.responseStatus as
        | 'accepted'
        | 'declined'
        | 'tentative'
        | 'needsAction'
        | undefined;

      return {
        status: ownerStatus as
          | 'accepted'
          | 'declined'
          | 'tentative'
          | 'needsAction'
          | 'unknown',
        leadResponse,
      };
    } catch (error) {
      this.logger.error('Error getting event status:', error);
      return { status: 'unknown' };
    }
  }

  /**
   * Cancel a meeting event
   */
  async cancelEvent(workspaceId: string, eventId: string): Promise<void> {
    try {
      const calendar = await this.getCalendarClient(workspaceId);

      await calendar.events.delete({
        calendarId: 'primary',
        eventId,
        sendUpdates: 'all', // Notify all attendees
      });
    } catch (error) {
      this.logger.error('Error cancelling event:', error);
      throw error;
    }
  }

  /**
   * List upcoming events for availability checking
   */
  async listUpcomingEvents(
    workspaceId: string,
    maxResults: number = 10,
  ): Promise<Array<{ id: string; summary: string; start: Date; end: Date }>> {
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
    } catch (error) {
      this.logger.error('Error listing upcoming events:', error);
      return [];
    }
  }

  /**
   * Sync meeting statuses for all leads with scheduled meetings
   * Updates lead.meetingStatus based on calendar event attendee responses
   * This should be called periodically (e.g., every 15-30 minutes)
   */
  async syncMeetingStatuses(): Promise<{
    updated: number;
    errors: number;
  }> {
    let updated = 0;
    let errors = 0;

    try {
      // Find all leads with meeting event IDs
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
        if (!lead.meetingEventId) continue;

        try {
          const status = await this.getEventStatus(
            lead.workspaceId,
            lead.meetingEventId,
          );

          // Map calendar response status to lead meeting status
          let newMeetingStatus: string | null = null;
          if (status.leadResponse) {
            switch (status.leadResponse) {
              case 'accepted':
                newMeetingStatus = 'ACCEPTED';
                break;
              case 'declined':
                newMeetingStatus = 'DECLINED';
                break;
              case 'tentative':
                newMeetingStatus = 'SCHEDULED'; // Keep as scheduled if tentative
                break;
              case 'needsAction':
                newMeetingStatus = 'SCHEDULED'; // Still waiting for response
                break;
            }
          }

          // Check if meeting time has passed and was accepted
          if (newMeetingStatus === 'ACCEPTED') {
            // Get event details to check if time has passed
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

          // Update lead if status changed
          if (newMeetingStatus && newMeetingStatus !== lead.meetingStatus) {
            await this.prisma.lead.update({
              where: { id: lead.id },
              data: { meetingStatus: newMeetingStatus },
            });
            updated++;
          }
        } catch (error) {
          this.logger.error(
            `Error syncing meeting status for lead ${lead.id}:`,
            error,
          );
          errors++;
        }
      }

      this.logger.log(
        `Meeting status sync completed: ${updated} updated, ${errors} errors`,
      );

      return { updated, errors };
    } catch (error) {
      this.logger.error('Error in meeting status sync:', error);
      return { updated, errors: 0 };
    }
  }
}

