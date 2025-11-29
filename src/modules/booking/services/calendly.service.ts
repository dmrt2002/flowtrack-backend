import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { TokenManagerService } from './token-manager.service';
import { WebhookVerifierService } from './webhook-verifier.service';
import { AttributionMatcherService } from './attribution-matcher.service';
import axios from 'axios';

@Injectable()
export class CalendlyService {
  private readonly logger = new Logger(CalendlyService.name);
  private readonly calendlyApiBase = 'https://api.calendly.com';
  private readonly calendlyAuthBase = 'https://auth.calendly.com';

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private tokenManager: TokenManagerService,
    private webhookVerifier: WebhookVerifierService,
    private attributionMatcher: AttributionMatcherService,
  ) {}

  /**
   * Generate Calendly OAuth authorization URL
   *
   * WORKAROUND: Pass userId in state instead of workspaceId
   * because Calendly doesn't reliably return the state parameter.
   * The userId is used to retrieve the workspaceId from our state manager.
   *
   * @param userId - The authenticated user's ID
   */
  getAuthorizationUrl(userId: string): string {
    const clientId = this.config.get('CALENDLY_CLIENT_ID');
    const redirectUri = this.config.get('CALENDLY_REDIRECT_URI');

    if (!clientId || !redirectUri) {
      throw new Error('Calendly OAuth credentials not configured');
    }

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      state: userId, // Pass userId in state (workaround for Calendly state issue)
    });

    return `${this.calendlyAuthBase}/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForTokens(code: string, workspaceId: string) {
    const clientId = this.config.get('CALENDLY_CLIENT_ID');
    const clientSecret = this.config.get('CALENDLY_CLIENT_SECRET');
    const redirectUri = this.config.get('CALENDLY_REDIRECT_URI');

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Calendly OAuth credentials not configured');
    }

    try {
      const response = await axios.post(
        `${this.calendlyAuthBase}/oauth/token`,
        {
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        },
        {
          auth: {
            username: clientId,
            password: clientSecret,
          },
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      const { access_token, refresh_token, expires_in, organization, owner } =
        response.data;

      return {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: new Date(Date.now() + expires_in * 1000),
        organization,
        owner,
      };
    } catch (error: any) {
      this.logger.error('Failed to exchange Calendly code for tokens:', error.response?.data || error.message);
      throw new BadRequestException('Failed to authenticate with Calendly');
    }
  }

  /**
   * Detect Calendly plan type (FREE vs PRO) by attempting webhook registration
   */
  async detectPlanType(accessToken: string, organizationUri: string): Promise<string> {
    try {
      // Attempt to list webhooks (only available on PRO plans)
      const response = await axios.get(
        `${this.calendlyApiBase}/webhook_subscriptions`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            organization: organizationUri,
            scope: 'organization',
          },
        },
      );

      // If we can list webhooks, it's a PRO plan
      return 'PRO';
    } catch (error: any) {
      if (error.response?.status === 403 || error.response?.status === 402) {
        // 403/402 means webhooks not available = FREE plan
        return 'FREE';
      }

      // For other errors, default to FREE to be safe
      this.logger.warn('Could not detect Calendly plan type, defaulting to FREE');
      return 'FREE';
    }
  }

  /**
   * Register webhook subscription for PRO users
   */
  async registerWebhook(
    credentialId: string,
    organizationUri: string,
  ): Promise<{ webhookUrl: string; signingKey: string } | null> {
    try {
      const accessToken = await this.tokenManager.getValidAccessToken(credentialId);
      const webhookUrl = `${this.config.get('APP_URL')}/api/webhooks/calendly/${credentialId}`;

      const response = await axios.post(
        `${this.calendlyApiBase}/webhook_subscriptions`,
        {
          url: webhookUrl,
          organization: organizationUri,
          user: 'all',
          scope: 'organization',
          events: [
            'invitee.created',
            'invitee.canceled',
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const { signing_key } = response.data.resource;

      this.logger.log(`Registered Calendly webhook for credential ${credentialId}`);

      return {
        webhookUrl,
        signingKey: signing_key,
      };
    } catch (error: any) {
      this.logger.error('Failed to register Calendly webhook:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Save Calendly OAuth credentials
   */
  async saveCredentials(
    userId: string,
    workspaceId: string,
    accessToken: string,
    refreshToken: string,
    expiresAt: Date,
    organization: any,
    owner: any,
    planType: string,
  ) {
    // Check if credential already exists
    const existingCredential = await this.prisma.oAuthCredential.findFirst({
      where: {
        workspaceId,
        providerType: 'CALENDLY',
      },
    });

    const credentialData = {
      providerEmail: owner,
      providerPlan: planType,
      accessToken,
      refreshToken,
      expiresAt,
      isActive: true,
    };

    let credential;

    if (existingCredential) {
      credential = await this.prisma.oAuthCredential.update({
        where: { id: existingCredential.id },
        data: credentialData,
      });
    } else {
      credential = await this.prisma.oAuthCredential.create({
        data: {
          userId,
          workspaceId,
          providerType: 'CALENDLY',
          ...credentialData,
        },
      });
    }

    // Automatically fetch scheduling URL from Calendly
    try {
      this.logger.log(
        `Fetching scheduling URL for credential ${credential.id}`,
      );

      const userResponse = await axios.get(
        `${this.calendlyApiBase}/users/me`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const schedulingUrl =
        userResponse.data.resource.scheduling_url ||
        userResponse.data.resource.link;

      if (schedulingUrl) {
        await this.prisma.oAuthCredential.update({
          where: { id: credential.id },
          data: {
            metadata: {
              schedulingUrl,
            } as any,
          },
        });

        this.logger.log(
          `Successfully fetched and cached scheduling URL: ${schedulingUrl}`,
        );
      } else {
        this.logger.warn(
          `No scheduling URL found in Calendly user response for credential ${credential.id}`,
        );
      }
    } catch (error: any) {
      this.logger.warn(
        `Failed to fetch scheduling URL automatically: ${error.response?.data?.message || error.message}. ` +
          `URL can be set manually later.`,
      );
      // Don't throw - scheduling URL is optional, can be set manually
    }

    // If PRO plan, register webhook
    if (planType === 'PRO') {
      const webhookData = await this.registerWebhook(credential.id, organization);

      if (webhookData) {
        await this.prisma.oAuthCredential.update({
          where: { id: credential.id },
          data: {
            webhookUrl: webhookData.webhookUrl,
            webhookSigningKey: webhookData.signingKey,
            webhookEnabled: true,
          },
        });
      }
    } else {
      // FREE plan - enable polling
      await this.prisma.oAuthCredential.update({
        where: { id: credential.id },
        data: {
          pollingEnabled: true,
        },
      });
    }

    return credential;
  }

  /**
   * Process Calendly webhook event
   */
  async processWebhookEvent(
    credentialId: string,
    signature: string,
    payload: any,
  ) {
    // Verify webhook signature
    const isValid = await this.webhookVerifier.verifyCalendlyWebhook(
      JSON.stringify(payload),
      signature,
      credentialId,
    );

    if (!isValid) {
      this.webhookVerifier.updateWebhookHealth(credentialId, false);
      throw new BadRequestException('Invalid webhook signature');
    }

    // Check idempotency
    const eventId = payload.payload.uri;
    const isProcessed = await this.webhookVerifier.isEventProcessed(
      eventId,
      'CALENDLY',
    );

    if (isProcessed) {
      this.logger.log(`Calendly event ${eventId} already processed, skipping`);
      return { message: 'Event already processed' };
    }

    try {
      // Process based on event type
      const eventType = payload.event;

      if (eventType === 'invitee.created') {
        await this.handleInviteeCreated(credentialId, payload.payload);
      } else if (eventType === 'invitee.canceled') {
        await this.handleInviteeCanceled(credentialId, payload.payload);
      }

      // Mark as processed
      await this.webhookVerifier.markEventProcessed(eventId, 'CALENDLY', {
        eventType,
        processedAt: new Date().toISOString(),
      });

      // Update webhook health
      await this.webhookVerifier.updateWebhookHealth(credentialId, true);

      return { message: 'Webhook processed successfully' };
    } catch (error: any) {
      this.logger.error(`Error processing Calendly webhook: ${error.message}`, error.stack);

      // Add to dead letter queue
      await this.webhookVerifier.addToDeadLetterQueue(
        'CALENDLY',
        eventId,
        payload.event,
        error.message,
        error.stack,
        payload,
      );

      throw error;
    }
  }

  /**
   * Handle invitee.created event
   */
  private async handleInviteeCreated(credentialId: string, payload: any) {
    const credential = await this.prisma.oAuthCredential.findUnique({
      where: { id: credentialId },
    });

    if (!credential) {
      throw new Error('Credential not found');
    }

    const invitee = payload.invitee;
    const event = payload.event_type;
    const tracking = payload.tracking || {};

    if (!credential.workspaceId) {
      this.logger.error(`Credential ${credentialId} has no workspaceId`);
      return;
    }

    // Match booking to lead
    const attribution = await this.attributionMatcher.matchCalendlyBooking(
      credential.workspaceId,
      invitee.email,
      tracking,
      payload.uri,
    );

    if (attribution.leadId) {
      // Create booking for matched lead
      const booking = await this.prisma.booking.create({
        data: {
          workspaceId: credential.workspaceId,
          leadId: attribution.leadId,
          workflowId: null, // Will be populated if lead has workflow
          oauthCredentialId: credentialId,
          providerType: 'CALENDLY',
          providerEventId: payload.uri,
          providerEventUri: payload.uri,
          eventName: event.name,
          eventStartTime: new Date(payload.time),
          eventEndTime: new Date(
            new Date(payload.time).getTime() + event.duration * 60 * 1000,
          ),
          eventDurationMinutes: event.duration,
          eventTimezone: invitee.timezone,
          inviteeEmail: invitee.email,
          inviteeName: invitee.name,
          inviteeTimezone: invitee.timezone,
          bookingStatus: 'scheduled',
          attributionMethod: attribution.attributionMethod,
          utmContent: attribution.utmContent,
          meetingUrl: payload.uri,
          responses: payload.questions_and_answers,
          receivedVia: 'WEBHOOK',
          rawPayload: payload,
          syncedAt: new Date(),
        },
      });

      // Update lead
      await this.attributionMatcher.updateLeadWithBooking(
        attribution.leadId,
        booking.id,
        payload.uri,
        'scheduled',
      );

      this.logger.log(
        `Created booking ${booking.id} for lead ${attribution.leadId} (Calendly)`,
      );
    } else {
      // Create unmatched booking
      await this.attributionMatcher.createUnmatchedBooking(
        credential.workspaceId,
        null,
        credentialId,
        {
          providerType: 'CALENDLY',
          providerEventId: payload.uri,
          providerEventUri: payload.uri,
          eventName: event.name,
          eventStartTime: new Date(payload.time),
          eventEndTime: new Date(
            new Date(payload.time).getTime() + event.duration * 60 * 1000,
          ),
          eventDurationMinutes: event.duration,
          eventTimezone: invitee.timezone,
          inviteeEmail: invitee.email,
          inviteeName: invitee.name,
          inviteeTimezone: invitee.timezone,
          meetingUrl: payload.uri,
          responses: payload.questions_and_answers,
          receivedVia: 'WEBHOOK',
          rawPayload: payload,
        },
      );

      this.logger.warn(
        `Created unmatched booking for ${invitee.email} (Calendly)`,
      );
    }
  }

  /**
   * Handle invitee.canceled event
   */
  private async handleInviteeCanceled(credentialId: string, payload: any) {
    const booking = await this.attributionMatcher.findBookingByProviderEventId(
      payload.uri,
      'CALENDLY',
    );

    if (booking) {
      await this.attributionMatcher.updateBookingStatus(
        booking.id,
        'canceled',
        payload.cancellation?.reason,
      );

      if (booking.lead) {
        await this.attributionMatcher.updateLeadWithBooking(
          booking.lead.id,
          booking.id,
          payload.uri,
          'canceled',
        );
      }

      this.logger.log(`Canceled booking ${booking.id} (Calendly)`);
    } else {
      this.logger.warn(
        `Received cancellation for unknown booking: ${payload.uri}`,
      );
    }
  }

  /**
   * Poll for new events (for FREE users)
   */
  async pollEvents(credentialId: string): Promise<{
    eventsFetched: number;
    eventsCreated: number;
    eventsUpdated: number;
  }> {
    const credential = await this.prisma.oAuthCredential.findUnique({
      where: { id: credentialId },
    });

    if (!credential || !credential.pollingEnabled) {
      throw new Error('Polling not enabled for this credential');
    }

    if (!credential.workspaceId) {
      throw new Error(`Credential ${credentialId} has no workspaceId`);
    }

    const accessToken = await this.tokenManager.getValidAccessToken(credentialId);

    // Get current user
    const userResponse = await axios.get(`${this.calendlyApiBase}/users/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const userUri = userResponse.data.resource.uri;

    // Fetch scheduled events
    const params: any = {
      user: userUri,
      status: 'active',
      count: 100,
    };

    // Use cursor for pagination if available
    if (credential.pollingCursor) {
      params.page_token = credential.pollingCursor;
    } else {
      // First poll - get events from last 30 days
      params.min_start_time = new Date(
        Date.now() - 30 * 24 * 60 * 60 * 1000,
      ).toISOString();
    }

    const response = await axios.get(
      `${this.calendlyApiBase}/scheduled_events`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params,
      },
    );

    const events = response.data.collection || [];
    let eventsCreated = 0;
    let eventsUpdated = 0;

    // Process each event
    for (const event of events) {
      const existing = await this.attributionMatcher.findBookingByProviderEventId(
        event.uri,
        'CALENDLY',
      );

      if (existing) {
        // Update existing booking if status changed
        const newStatus = event.status === 'canceled' ? 'canceled' : 'scheduled';
        if (existing.bookingStatus !== newStatus) {
          await this.attributionMatcher.updateBookingStatus(
            existing.id,
            newStatus,
          );
          eventsUpdated++;
        }
      } else {
        // Fetch invitee details
        // event.uri is a full URL like https://api.calendly.com/scheduled_events/xxx
        // So we need to append /invitees to it directly
        const inviteesResponse = await axios.get(
          `${event.uri}/invitees`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );

        const invitees = inviteesResponse.data.collection || [];

        for (const invitee of invitees) {
          // Match booking to lead
          const attribution = await this.attributionMatcher.matchCalendlyBooking(
            credential.workspaceId,
            invitee.email,
            invitee.tracking || {},
            event.uri,
          );

          if (attribution.leadId) {
            await this.prisma.booking.create({
              data: {
                workspaceId: credential.workspaceId,
                leadId: attribution.leadId,
                workflowId: null,
                oauthCredentialId: credentialId,
                providerType: 'CALENDLY',
                providerEventId: event.uri,
                providerEventUri: event.uri,
                eventName: event.name,
                eventStartTime: new Date(event.start_time),
                eventEndTime: new Date(event.end_time),
                eventTimezone: invitee.timezone,
                inviteeEmail: invitee.email,
                inviteeName: invitee.name,
                inviteeTimezone: invitee.timezone,
                bookingStatus: event.status === 'canceled' ? 'canceled' : 'scheduled',
                attributionMethod: attribution.attributionMethod,
                utmContent: attribution.utmContent,
                meetingLocation: event.location?.type,
                meetingUrl: event.location?.join_url || event.uri,
                receivedVia: 'POLLING',
                rawPayload: { event, invitee },
                syncedAt: new Date(),
              },
            });

            await this.attributionMatcher.updateLeadWithBooking(
              attribution.leadId,
              '',
              event.uri,
              'scheduled',
            );

            eventsCreated++;
          }
        }
      }
    }

    // Update polling cursor
    const nextPageToken = response.data.pagination?.next_page_token;
    await this.prisma.oAuthCredential.update({
      where: { id: credentialId },
      data: {
        pollingLastRunAt: new Date(),
        pollingCursor: nextPageToken || null,
      },
    });

    return {
      eventsFetched: events.length,
      eventsCreated,
      eventsUpdated,
    };
  }
}
