"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var WorkflowEmailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowEmailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const oauth_service_1 = require("../oauth/oauth.service");
const prisma_service_1 = require("../../prisma/prisma.service");
const email_tracking_service_1 = require("./services/email-tracking.service");
const sent_email_service_1 = require("./services/sent-email.service");
const googleapis_1 = require("googleapis");
const nodemailer = __importStar(require("nodemailer"));
let WorkflowEmailService = WorkflowEmailService_1 = class WorkflowEmailService {
    oauthService;
    configService;
    prisma;
    emailTrackingService;
    sentEmailService;
    logger = new common_1.Logger(WorkflowEmailService_1.name);
    systemTransporter;
    constructor(oauthService, configService, prisma, emailTrackingService, sentEmailService) {
        this.oauthService = oauthService;
        this.configService = configService;
        this.prisma = prisma;
        this.emailTrackingService = emailTrackingService;
        this.sentEmailService = sentEmailService;
        this.initializeSystemTransporter();
    }
    initializeSystemTransporter() {
        const smtpHost = this.configService.get('SMTP_HOST');
        const smtpPort = this.configService.get('SMTP_PORT');
        const smtpUser = this.configService.get('SMTP_USER');
        const smtpPass = this.configService.get('SMTP_PASS');
        if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
            this.logger.warn('SMTP configuration incomplete. System email fallback will not work.');
            return;
        }
        const useSSL = smtpPort === 465;
        this.systemTransporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: useSSL,
            auth: {
                user: smtpUser,
                pass: smtpPass,
            },
        });
        this.logger.log(`📧 System email transporter initialized: ${smtpHost}:${smtpPort}`);
    }
    async sendWorkflowEmail(workspaceId, emailData) {
        const provider = await this.oauthService.getEmailProvider(workspaceId);
        if (provider.type === 'GMAIL') {
            this.logger.log(`Sending email via Gmail API to: ${emailData.to} (Workspace: ${workspaceId})`);
            await this.sendViaGmailAPI(provider.credentials, emailData);
        }
        else {
            this.logger.log(`Sending email via System SMTP to: ${emailData.to} (Workspace: ${workspaceId})`);
            await this.sendViaSystemSMTP(emailData);
        }
    }
    async sendAndRecordWorkflowEmail(params) {
        const { workspaceId, leadId, workflowExecutionId, workflowId, emailData, emailType, recipientName, } = params;
        const provider = await this.oauthService.getEmailProvider(workspaceId);
        let gmailMessageId;
        let gmailThreadId;
        let smtpMessageId;
        let senderEmail;
        let senderName;
        let providerType;
        if (provider.type === 'GMAIL') {
            this.logger.log(`Sending email via Gmail API to: ${emailData.to} (Workspace: ${workspaceId})`);
            const result = await this.sendViaGmailAPIWithMetadata(provider.credentials, emailData);
            gmailMessageId = result.messageId;
            gmailThreadId = result.threadId;
            senderEmail = provider.credentials.providerEmail || 'noreply@flowtrack.app';
            senderName = undefined;
            providerType = 'GMAIL';
        }
        else {
            this.logger.log(`Sending email via System SMTP to: ${emailData.to} (Workspace: ${workspaceId})`);
            const result = await this.sendViaSystemSMTPWithMetadata(emailData);
            smtpMessageId = result.messageId;
            senderEmail =
                this.configService.get('SMTP_FROM_EMAIL', 'noreply@flowtrack.app');
            senderName = this.configService.get('SMTP_FROM_NAME', 'FlowTrack');
            providerType = 'SMTP';
        }
        const sentEmail = await this.sentEmailService.recordSentEmail({
            workspaceId,
            leadId,
            workflowExecutionId,
            workflowId,
            recipientEmail: emailData.to,
            recipientName,
            senderEmail,
            senderName,
            subject: emailData.subject,
            htmlBody: emailData.htmlBody,
            textBody: emailData.textBody,
            emailType,
            providerType,
            gmailMessageId,
            gmailThreadId,
            smtpMessageId,
            deliveryStatus: 'sent',
        });
        return {
            emailId: sentEmail.id,
            messageId: gmailMessageId || smtpMessageId,
        };
    }
    async sendViaGmailAPI(credentials, emailData) {
        await this.sendViaGmailAPIWithMetadata(credentials, emailData);
    }
    async sendViaGmailAPIWithMetadata(credentials, emailData) {
        try {
            const oauth2Client = new googleapis_1.google.auth.OAuth2(this.configService.get('GOOGLE_CLIENT_ID'), this.configService.get('GOOGLE_CLIENT_SECRET'), this.configService.get('GOOGLE_REDIRECT_URI'));
            oauth2Client.setCredentials({
                access_token: credentials.accessToken,
                refresh_token: credentials.refreshToken,
            });
            const gmail = googleapis_1.google.gmail({ version: 'v1', auth: oauth2Client });
            const emailLines = [
                `To: ${emailData.to}`,
                `From: ${credentials.providerEmail}`,
                `Cc: ${credentials.providerEmail}`,
                `Subject: ${emailData.subject}`,
                'MIME-Version: 1.0',
                'Content-Type: text/html; charset=utf-8',
                '',
                emailData.htmlBody,
            ];
            if (emailData.replyTo) {
                emailLines.splice(4, 0, `Reply-To: ${emailData.replyTo}`);
            }
            const message = emailLines.join('\n');
            const encodedMessage = Buffer.from(message)
                .toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');
            const response = await gmail.users.messages.send({
                userId: 'me',
                requestBody: {
                    raw: encodedMessage,
                },
            });
            this.logger.log(`✅ Email sent successfully via Gmail API to: ${emailData.to} (Message ID: ${response.data.id})`);
            return {
                messageId: response.data.id || '',
                threadId: response.data.threadId || '',
            };
        }
        catch (error) {
            this.logger.error(`❌ Failed to send email via Gmail API: ${error.message}`);
            throw new Error(`Gmail API send failed: ${error.message}`);
        }
    }
    async sendViaSystemSMTP(emailData) {
        await this.sendViaSystemSMTPWithMetadata(emailData);
    }
    async sendViaSystemSMTPWithMetadata(emailData) {
        if (!this.systemTransporter) {
            this.logger.error('System email transporter not initialized. Cannot send email.');
            throw new Error('System email service is not configured');
        }
        const fromEmail = this.configService.get('SMTP_FROM_EMAIL', 'noreply@flowtrack.app');
        try {
            const info = await this.systemTransporter.sendMail({
                from: fromEmail,
                to: emailData.to,
                cc: fromEmail,
                subject: emailData.subject,
                html: emailData.htmlBody,
                text: emailData.textBody,
                replyTo: emailData.replyTo,
            });
            this.logger.log(`✅ Email sent successfully via System SMTP to: ${emailData.to} (Message ID: ${info.messageId})`);
            return {
                messageId: info.messageId || '',
            };
        }
        catch (error) {
            this.logger.error(`❌ Failed to send email via System SMTP: ${error.message}`);
            throw new Error(`System SMTP send failed: ${error.message}`);
        }
    }
    renderTemplate(template, variables) {
        let rendered = template;
        for (const [key, value] of Object.entries(variables)) {
            const placeholder = new RegExp(`\\{${key}\\}`, 'g');
            rendered = rendered.replace(placeholder, String(value ?? ''));
        }
        return rendered;
    }
    insertCalendlyLink(template, calendlyLink) {
        if (!calendlyLink) {
            return template
                .replace(/\{calendlyLink\}/g, '')
                .replace(/\{bookingUrl\}/g, '');
        }
        const calendlyHtml = `
      <div style="margin: 20px 0; padding: 15px; background-color: #F3F4F6; border-radius: 8px;">
        <p style="margin: 0 0 10px 0; font-weight: 600;">📅 Schedule a Meeting</p>
        <a href="${calendlyLink}" style="display: inline-block; padding: 10px 20px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">
          Book a Time
        </a>
      </div>
    `;
        return template
            .replace(/\{calendlyLink\}/g, calendlyHtml)
            .replace(/\{bookingUrl\}/g, calendlyHtml);
    }
    insertMeetLink(template, meetLink) {
        if (!meetLink) {
            return template
                .replace(/\{meetLink\}/g, '')
                .replace(/\{calendlyLink\}/g, '')
                .replace(/\{bookingUrl\}/g, '');
        }
        const meetHtml = `
      <div style="margin: 20px 0; padding: 15px; background-color: #F3F4F6; border-radius: 8px;">
        <p style="margin: 0 0 10px 0; font-weight: 600;">📅 Join Meeting</p>
        <a href="${meetLink}" style="display: inline-block; padding: 10px 20px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">
          Join Google Meet
        </a>
      </div>
    `;
        return template
            .replace(/\{meetLink\}/g, meetHtml)
            .replace(/\{calendlyLink\}/g, meetHtml)
            .replace(/\{bookingUrl\}/g, meetHtml);
    }
    insertSchedulingLink(template, schedulingLink, linkType) {
        if (!schedulingLink) {
            return template
                .replace(/\{calendlyLink\}/g, '')
                .replace(/\{meetLink\}/g, '')
                .replace(/\{bookingUrl\}/g, '');
        }
        if (linkType === 'GOOGLE_MEET') {
            return this.insertMeetLink(template, schedulingLink);
        }
        else {
            return this.insertCalendlyLink(template, schedulingLink);
        }
    }
    async buildEmailFromTemplate(workspaceId, workflowId, leadId, template, variables, meetLink) {
        const workflow = await this.prisma.workflow.findUnique({
            where: { id: workflowId },
            select: { schedulingType: true },
        });
        let schedulingLink = null;
        let linkType = 'CALENDLY';
        if (workflow?.schedulingType === 'GOOGLE_MEET' && meetLink) {
            schedulingLink = meetLink;
            linkType = 'GOOGLE_MEET';
        }
        else if (workflow?.schedulingType === 'GOOGLE_MEET') {
            schedulingLink = null;
            linkType = 'GOOGLE_MEET';
        }
        else {
            schedulingLink = await this.generateCalendlyLinkWithAttribution(leadId, workspaceId);
            linkType = 'CALENDLY';
        }
        let emailBody = this.insertSchedulingLink(template, schedulingLink, linkType);
        emailBody = this.renderTemplate(emailBody, variables);
        return emailBody;
    }
    async generateCalendlyLinkWithAttribution(leadId, workspaceId) {
        const baseLink = await this.oauthService.getCalendlyLink(workspaceId);
        if (!baseLink) {
            return null;
        }
        try {
            const url = new URL(baseLink);
            url.searchParams.set('utm_content', `lead_${leadId}`);
            return url.toString();
        }
        catch (error) {
            this.logger.error('Failed to generate Calendly link with attribution:', error);
            return baseLink;
        }
    }
    injectTrackingPixel(htmlBody, leadId, workflowExecutionId, emailType) {
        const trackingPayload = {
            leadId,
            workflowExecutionId,
            emailType,
            sentAt: Date.now(),
        };
        const trackingToken = this.emailTrackingService.generateTrackingToken(trackingPayload);
        const backendUrl = this.configService.get('BACKEND_URL', 'http://localhost:3000');
        const trackingPixelUrl = `${backendUrl}/api/v1/email/track/${trackingToken}`;
        const trackingPixelHtml = `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />`;
        if (htmlBody.includes('</body>')) {
            return htmlBody.replace('</body>', `${trackingPixelHtml}</body>`);
        }
        else {
            return `${htmlBody}${trackingPixelHtml}`;
        }
    }
    async verifySystemConnection() {
        if (!this.systemTransporter) {
            return false;
        }
        try {
            await this.systemTransporter.verify();
            return true;
        }
        catch (error) {
            this.logger.error(`System SMTP connection verification failed: ${error.message}`);
            return false;
        }
    }
};
exports.WorkflowEmailService = WorkflowEmailService;
exports.WorkflowEmailService = WorkflowEmailService = WorkflowEmailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [oauth_service_1.OAuthService,
        config_1.ConfigService,
        prisma_service_1.PrismaService,
        email_tracking_service_1.EmailTrackingService,
        sent_email_service_1.SentEmailService])
], WorkflowEmailService);
//# sourceMappingURL=workflow-email.service.js.map