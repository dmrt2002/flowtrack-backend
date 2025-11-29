import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

interface AttributionResult {
  leadId: string | null;
  attributionMethod: 'UTM' | 'HIDDEN_FIELD' | 'MANUAL' | null;
  utmContent?: string;
  hiddenFieldValue?: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

@Injectable()
export class AttributionMatcherService {
  private readonly logger = new Logger(AttributionMatcherService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Match booking to lead using Calendly UTM parameters
   */
  async matchCalendlyBooking(
    workspaceId: string,
    inviteeEmail: string,
    utmParams: Record<string, string>,
    eventUri: string,
  ): Promise<AttributionResult> {
    // Strategy 1: UTM parameter matching (lead_{id})
    const utmContent = utmParams.utm_content || utmParams.UTM_CONTENT;

    if (utmContent && utmContent.startsWith('lead_')) {
      const leadId = utmContent.replace('lead_', '');

      // Verify lead exists (no email verification needed - user can book with any email)
      const lead = await this.prisma.lead.findFirst({
        where: {
          id: leadId,
          workspaceId,
        },
      });

      if (lead) {
        this.logger.log(
          `Matched Calendly booking via UTM parameter: lead ${leadId}`,
        );
        return {
          leadId: lead.id,
          attributionMethod: 'UTM',
          utmContent,
          confidence: 'HIGH',
        };
      }

      this.logger.warn(
        `UTM parameter contained lead ID ${leadId} but lead not found in workspace`,
      );
    }

    // Strategy 2: Email-based matching
    const emailMatch = await this.matchByEmail(workspaceId, inviteeEmail);
    if (emailMatch.leadId) {
      this.logger.log(
        `Matched Calendly booking via email: lead ${emailMatch.leadId}`,
      );
      return emailMatch;
    }

    // No match found
    this.logger.warn(
      `Could not match Calendly booking for email ${inviteeEmail} in workspace ${workspaceId}`,
    );
    return {
      leadId: null,
      attributionMethod: null,
      confidence: 'LOW',
    };
  }


  /**
   * Match lead by email address (fallback strategy)
   */
  private async matchByEmail(
    workspaceId: string,
    email: string,
  ): Promise<AttributionResult> {
    const normalizedEmail = email.toLowerCase().trim();

    // Find lead by email
    const lead = await this.prisma.lead.findFirst({
      where: {
        workspaceId,
        email: normalizedEmail,
      },
      orderBy: {
        createdAt: 'desc', // Get most recent lead if duplicates
      },
    });

    if (lead) {
      return {
        leadId: lead.id,
        attributionMethod: null, // Email matching doesn't have a specific method
        confidence: 'MEDIUM',
      };
    }

    return {
      leadId: null,
      attributionMethod: null,
      confidence: 'LOW',
    };
  }

  /**
   * Create unmatched booking (for bookings without a lead)
   * This could happen if someone books directly without going through FlowTrack
   */
  async createUnmatchedBooking(
    workspaceId: string,
    workflowId: string | null,
    oauthCredentialId: string,
    bookingData: {
      providerType: 'CALENDLY';
      providerEventId: string;
      providerEventUri?: string;
      eventName: string;
      eventStartTime: Date;
      eventEndTime: Date;
      eventDurationMinutes?: number;
      eventTimezone?: string;
      inviteeEmail: string;
      inviteeName?: string;
      inviteeTimezone?: string;
      meetingLocation?: string;
      meetingUrl?: string;
      meetingNotes?: string;
      responses?: any;
      receivedVia: 'WEBHOOK' | 'POLLING';
      rawPayload?: any;
    },
  ): Promise<{ leadId: string; bookingId: string }> {
    this.logger.log(
      `Creating unmatched booking for ${bookingData.inviteeEmail} in workspace ${workspaceId}`,
    );

    // Create a lead for this unmatched booking
    // Note: workflowId is required in Lead model, so we need to find a default workflow if not provided
    let finalWorkflowId = workflowId;
    if (!finalWorkflowId) {
      // Find the most recent active workflow for this workspace
      const defaultWorkflow = await this.prisma.workflow.findFirst({
        where: {
          workspaceId,
          status: { in: ['active', 'draft'] },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!defaultWorkflow) {
        this.logger.warn(
          `Cannot create lead without workflowId for unmatched booking in workspace ${workspaceId} - no workflows found`,
        );
        throw new Error(
          'No workflow found for workspace. Please create a workflow first.',
        );
      }

      finalWorkflowId = defaultWorkflow.id;
      this.logger.log(
        `Using default workflow ${finalWorkflowId} for unmatched booking in workspace ${workspaceId}`,
      );
    }

    const lead = await this.prisma.lead.create({
      data: {
        workspaceId,
        workflowId: finalWorkflowId,
        email: bookingData.inviteeEmail.toLowerCase(),
        name: bookingData.inviteeName || null,
        status: 'NEW',
        source: 'MANUAL', // Unmatched booking came from Calendly (not tracked through normal flow)
        meetingEventId: bookingData.providerEventId,
        meetingStatus: 'scheduled',
      },
    });

    // Create the booking
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

  /**
   * Update lead with booking information
   */
  async updateLeadWithBooking(
    leadId: string,
    bookingId: string,
    eventId: string,
    status: 'scheduled' | 'canceled' | 'rescheduled' | 'completed',
  ): Promise<void> {
    await this.prisma.lead.update({
      where: { id: leadId },
      data: {
        meetingEventId: eventId,
        meetingStatus: status,
        // Auto-update status to BOOKED when meeting is scheduled
        ...(status === 'scheduled' && { status: 'BOOKED' }),
      },
    });

    this.logger.log(
      `Updated lead ${leadId} with booking ${bookingId} (status: ${status})`,
    );
  }

  /**
   * Find existing booking by provider event ID
   */
  async findBookingByProviderEventId(
    providerEventId: string,
    providerType: 'CALENDLY',
  ) {
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

  /**
   * Update booking status (for cancellations, reschedules, etc.)
   */
  async updateBookingStatus(
    bookingId: string,
    status: 'scheduled' | 'canceled' | 'rescheduled' | 'completed' | 'no_show',
    cancellationReason?: string,
    rescheduledFromBookingId?: string,
  ): Promise<void> {
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

  /**
   * Get booking statistics for a workspace
   */
  async getBookingStats(workspaceId: string) {
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
}
