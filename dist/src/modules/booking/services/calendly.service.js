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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var CalendlyService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendlyService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../../prisma/prisma.service");
const token_manager_service_1 = require("./token-manager.service");
const webhook_verifier_service_1 = require("./webhook-verifier.service");
const attribution_matcher_service_1 = require("./attribution-matcher.service");
const axios_1 = __importDefault(require("axios"));
let CalendlyService = CalendlyService_1 = class CalendlyService {
    prisma;
    config;
    tokenManager;
    webhookVerifier;
    attributionMatcher;
    logger = new common_1.Logger(CalendlyService_1.name);
    calendlyApiBase = 'https://api.calendly.com';
    calendlyAuthBase = 'https://auth.calendly.com';
    constructor(prisma, config, tokenManager, webhookVerifier, attributionMatcher) {
        this.prisma = prisma;
        this.config = config;
        this.tokenManager = tokenManager;
        this.webhookVerifier = webhookVerifier;
        this.attributionMatcher = attributionMatcher;
    }
    getAuthorizationUrl(userId) {
        const clientId = this.config.get('CALENDLY_CLIENT_ID');
        const redirectUri = this.config.get('CALENDLY_REDIRECT_URI');
        if (!clientId || !redirectUri) {
            throw new Error('Calendly OAuth credentials not configured');
        }
        const params = new URLSearchParams({
            client_id: clientId,
            response_type: 'code',
            redirect_uri: redirectUri,
            state: userId,
        });
        return `${this.calendlyAuthBase}/oauth/authorize?${params.toString()}`;
    }
    async exchangeCodeForTokens(code, workspaceId) {
        const clientId = this.config.get('CALENDLY_CLIENT_ID');
        const clientSecret = this.config.get('CALENDLY_CLIENT_SECRET');
        const redirectUri = this.config.get('CALENDLY_REDIRECT_URI');
        if (!clientId || !clientSecret || !redirectUri) {
            throw new Error('Calendly OAuth credentials not configured');
        }
        try {
            const response = await axios_1.default.post(`${this.calendlyAuthBase}/oauth/token`, {
                grant_type: 'authorization_code',
                code,
                redirect_uri: redirectUri,
            }, {
                auth: {
                    username: clientId,
                    password: clientSecret,
                },
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            const { access_token, refresh_token, expires_in, organization, owner } = response.data;
            return {
                accessToken: access_token,
                refreshToken: refresh_token,
                expiresAt: new Date(Date.now() + expires_in * 1000),
                organization,
                owner,
            };
        }
        catch (error) {
            this.logger.error('Failed to exchange Calendly code for tokens:', error.response?.data || error.message);
            throw new common_1.BadRequestException('Failed to authenticate with Calendly');
        }
    }
    async detectPlanType(accessToken, organizationUri) {
        try {
            const response = await axios_1.default.get(`${this.calendlyApiBase}/webhook_subscriptions`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
                params: {
                    organization: organizationUri,
                    scope: 'organization',
                },
            });
            return 'PRO';
        }
        catch (error) {
            if (error.response?.status === 403 || error.response?.status === 402) {
                return 'FREE';
            }
            this.logger.warn('Could not detect Calendly plan type, defaulting to FREE');
            return 'FREE';
        }
    }
    async registerWebhook(credentialId, organizationUri) {
        try {
            const accessToken = await this.tokenManager.getValidAccessToken(credentialId);
            const webhookUrl = `${this.config.get('APP_URL')}/api/webhooks/calendly/${credentialId}`;
            const response = await axios_1.default.post(`${this.calendlyApiBase}/webhook_subscriptions`, {
                url: webhookUrl,
                organization: organizationUri,
                user: 'all',
                scope: 'organization',
                events: [
                    'invitee.created',
                    'invitee.canceled',
                ],
            }, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            });
            const { signing_key } = response.data.resource;
            this.logger.log(`Registered Calendly webhook for credential ${credentialId}`);
            return {
                webhookUrl,
                signingKey: signing_key,
            };
        }
        catch (error) {
            this.logger.error('Failed to register Calendly webhook:', error.response?.data || error.message);
            return null;
        }
    }
    async saveCredentials(userId, workspaceId, accessToken, refreshToken, expiresAt, organization, owner, planType) {
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
        }
        else {
            credential = await this.prisma.oAuthCredential.create({
                data: {
                    userId,
                    workspaceId,
                    providerType: 'CALENDLY',
                    ...credentialData,
                },
            });
        }
        try {
            this.logger.log(`Fetching scheduling URL for credential ${credential.id}`);
            const userResponse = await axios_1.default.get(`${this.calendlyApiBase}/users/me`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            const schedulingUrl = userResponse.data.resource.scheduling_url ||
                userResponse.data.resource.link;
            if (schedulingUrl) {
                await this.prisma.oAuthCredential.update({
                    where: { id: credential.id },
                    data: {
                        metadata: {
                            schedulingUrl,
                        },
                    },
                });
                this.logger.log(`Successfully fetched and cached scheduling URL: ${schedulingUrl}`);
            }
            else {
                this.logger.warn(`No scheduling URL found in Calendly user response for credential ${credential.id}`);
            }
        }
        catch (error) {
            this.logger.warn(`Failed to fetch scheduling URL automatically: ${error.response?.data?.message || error.message}. ` +
                `URL can be set manually later.`);
        }
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
        }
        else {
            await this.prisma.oAuthCredential.update({
                where: { id: credential.id },
                data: {
                    pollingEnabled: true,
                },
            });
        }
        return credential;
    }
    async processWebhookEvent(credentialId, signature, payload) {
        const isValid = await this.webhookVerifier.verifyCalendlyWebhook(JSON.stringify(payload), signature, credentialId);
        if (!isValid) {
            this.webhookVerifier.updateWebhookHealth(credentialId, false);
            throw new common_1.BadRequestException('Invalid webhook signature');
        }
        const eventId = payload.payload.uri;
        const isProcessed = await this.webhookVerifier.isEventProcessed(eventId, 'CALENDLY');
        if (isProcessed) {
            this.logger.log(`Calendly event ${eventId} already processed, skipping`);
            return { message: 'Event already processed' };
        }
        try {
            const eventType = payload.event;
            if (eventType === 'invitee.created') {
                await this.handleInviteeCreated(credentialId, payload.payload);
            }
            else if (eventType === 'invitee.canceled') {
                await this.handleInviteeCanceled(credentialId, payload.payload);
            }
            await this.webhookVerifier.markEventProcessed(eventId, 'CALENDLY', {
                eventType,
                processedAt: new Date().toISOString(),
            });
            await this.webhookVerifier.updateWebhookHealth(credentialId, true);
            return { message: 'Webhook processed successfully' };
        }
        catch (error) {
            this.logger.error(`Error processing Calendly webhook: ${error.message}`, error.stack);
            await this.webhookVerifier.addToDeadLetterQueue('CALENDLY', eventId, payload.event, error.message, error.stack, payload);
            throw error;
        }
    }
    async handleInviteeCreated(credentialId, payload) {
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
        const attribution = await this.attributionMatcher.matchCalendlyBooking(credential.workspaceId, invitee.email, tracking, payload.uri);
        if (attribution.leadId) {
            const booking = await this.prisma.booking.create({
                data: {
                    workspaceId: credential.workspaceId,
                    leadId: attribution.leadId,
                    workflowId: null,
                    oauthCredentialId: credentialId,
                    providerType: 'CALENDLY',
                    providerEventId: payload.uri,
                    providerEventUri: payload.uri,
                    eventName: event.name,
                    eventStartTime: new Date(payload.time),
                    eventEndTime: new Date(new Date(payload.time).getTime() + event.duration * 60 * 1000),
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
            await this.attributionMatcher.updateLeadWithBooking(attribution.leadId, booking.id, payload.uri, 'scheduled');
            this.logger.log(`Created booking ${booking.id} for lead ${attribution.leadId} (Calendly)`);
        }
        else {
            await this.attributionMatcher.createUnmatchedBooking(credential.workspaceId, null, credentialId, {
                providerType: 'CALENDLY',
                providerEventId: payload.uri,
                providerEventUri: payload.uri,
                eventName: event.name,
                eventStartTime: new Date(payload.time),
                eventEndTime: new Date(new Date(payload.time).getTime() + event.duration * 60 * 1000),
                eventDurationMinutes: event.duration,
                eventTimezone: invitee.timezone,
                inviteeEmail: invitee.email,
                inviteeName: invitee.name,
                inviteeTimezone: invitee.timezone,
                meetingUrl: payload.uri,
                responses: payload.questions_and_answers,
                receivedVia: 'WEBHOOK',
                rawPayload: payload,
            });
            this.logger.warn(`Created unmatched booking for ${invitee.email} (Calendly)`);
        }
    }
    async handleInviteeCanceled(credentialId, payload) {
        const booking = await this.attributionMatcher.findBookingByProviderEventId(payload.uri, 'CALENDLY');
        if (booking) {
            await this.attributionMatcher.updateBookingStatus(booking.id, 'canceled', payload.cancellation?.reason);
            if (booking.lead) {
                await this.attributionMatcher.updateLeadWithBooking(booking.lead.id, booking.id, payload.uri, 'canceled');
            }
            this.logger.log(`Canceled booking ${booking.id} (Calendly)`);
        }
        else {
            this.logger.warn(`Received cancellation for unknown booking: ${payload.uri}`);
        }
    }
    async pollEvents(credentialId) {
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
        const userResponse = await axios_1.default.get(`${this.calendlyApiBase}/users/me`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        const userUri = userResponse.data.resource.uri;
        const params = {
            user: userUri,
            status: 'active',
            count: 100,
        };
        if (credential.pollingCursor) {
            params.page_token = credential.pollingCursor;
        }
        else {
            params.min_start_time = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        }
        const response = await axios_1.default.get(`${this.calendlyApiBase}/scheduled_events`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
            params,
        });
        const events = response.data.collection || [];
        let eventsCreated = 0;
        let eventsUpdated = 0;
        for (const event of events) {
            const existing = await this.attributionMatcher.findBookingByProviderEventId(event.uri, 'CALENDLY');
            if (existing) {
                const newStatus = event.status === 'canceled' ? 'canceled' : 'scheduled';
                if (existing.bookingStatus !== newStatus) {
                    await this.attributionMatcher.updateBookingStatus(existing.id, newStatus);
                    eventsUpdated++;
                }
            }
            else {
                const inviteesResponse = await axios_1.default.get(`${event.uri}/invitees`, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                });
                const invitees = inviteesResponse.data.collection || [];
                for (const invitee of invitees) {
                    const attribution = await this.attributionMatcher.matchCalendlyBooking(credential.workspaceId, invitee.email, invitee.tracking || {}, event.uri);
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
                        await this.attributionMatcher.updateLeadWithBooking(attribution.leadId, '', event.uri, 'scheduled');
                        eventsCreated++;
                    }
                }
            }
        }
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
};
exports.CalendlyService = CalendlyService;
exports.CalendlyService = CalendlyService = CalendlyService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService,
        token_manager_service_1.TokenManagerService,
        webhook_verifier_service_1.WebhookVerifierService,
        attribution_matcher_service_1.AttributionMatcherService])
], CalendlyService);
//# sourceMappingURL=calendly.service.js.map