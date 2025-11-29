import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuthService } from '../oauth/oauth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailTrackingService } from './services/email-tracking.service';
import { google } from 'googleapis';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { EmailTrackingPayload } from './dto/email-tracking.dto';

export interface SendWorkflowEmailDto {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  replyTo?: string;
}

export interface EmailTemplateVariables {
  [key: string]: string | number | boolean | null | undefined;
}

@Injectable()
export class WorkflowEmailService {
  private readonly logger = new Logger(WorkflowEmailService.name);
  private systemTransporter: Transporter;

  constructor(
    private oauthService: OAuthService,
    private configService: ConfigService,
    private prisma: PrismaService,
    private emailTrackingService: EmailTrackingService,
  ) {
    this.initializeSystemTransporter();
  }

  /**
   * Initialize system SMTP transporter for fallback email sending
   */
  private initializeSystemTransporter(): void {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpPort = this.configService.get<number>('SMTP_PORT');
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      this.logger.warn(
        'SMTP configuration incomplete. System email fallback will not work.',
      );
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

    this.logger.log(
      `📧 System email transporter initialized: ${smtpHost}:${smtpPort}`,
    );
  }

  /**
   * Send workflow automation email
   * Automatically selects Gmail API or system SMTP based on workspace configuration
   */
  async sendWorkflowEmail(
    workspaceId: string,
    emailData: SendWorkflowEmailDto,
  ): Promise<void> {
    const provider = await this.oauthService.getEmailProvider(workspaceId);

    if (provider.type === 'GMAIL') {
      this.logger.log(
        `Sending email via Gmail API to: ${emailData.to} (Workspace: ${workspaceId})`,
      );
      await this.sendViaGmailAPI(provider.credentials, emailData);
    } else {
      this.logger.log(
        `Sending email via System SMTP to: ${emailData.to} (Workspace: ${workspaceId})`,
      );
      await this.sendViaSystemSMTP(emailData);
    }
  }

  /**
   * Send email using Gmail API with OAuth credentials
   */
  private async sendViaGmailAPI(
    credentials: any,
    emailData: SendWorkflowEmailDto,
  ): Promise<void> {
    try {
      // Initialize OAuth2 client with credentials
      const oauth2Client = new google.auth.OAuth2(
        this.configService.get('GOOGLE_CLIENT_ID'),
        this.configService.get('GOOGLE_CLIENT_SECRET'),
        this.configService.get('GOOGLE_REDIRECT_URI'),
      );

      oauth2Client.setCredentials({
        access_token: credentials.accessToken,
        refresh_token: credentials.refreshToken,
      });

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // Construct RFC 2822 formatted email
      const emailLines = [
        `To: ${emailData.to}`,
        `From: ${credentials.providerEmail}`,
        `Subject: ${emailData.subject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=utf-8',
        '',
        emailData.htmlBody,
      ];

      if (emailData.replyTo) {
        emailLines.splice(3, 0, `Reply-To: ${emailData.replyTo}`);
      }

      const message = emailLines.join('\n');

      // Encode to base64url
      const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // Send via Gmail API
      await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      });

      this.logger.log(
        `✅ Email sent successfully via Gmail API to: ${emailData.to}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to send email via Gmail API: ${error.message}`,
      );
      throw new Error(`Gmail API send failed: ${error.message}`);
    }
  }

  /**
   * Send email using system SMTP (fallback when Gmail not connected)
   */
  private async sendViaSystemSMTP(
    emailData: SendWorkflowEmailDto,
  ): Promise<void> {
    if (!this.systemTransporter) {
      this.logger.error(
        'System email transporter not initialized. Cannot send email.',
      );
      throw new Error('System email service is not configured');
    }

    const fromEmail = this.configService.get<string>(
      'SMTP_FROM_EMAIL',
      'noreply@flowtrack.app',
    );
    const fromName = this.configService.get<string>(
      'SMTP_FROM_NAME',
      'FlowTrack',
    );

    try {
      await this.systemTransporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.htmlBody,
        text: emailData.textBody,
        replyTo: emailData.replyTo,
      });

      this.logger.log(
        `✅ Email sent successfully via System SMTP to: ${emailData.to}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to send email via System SMTP: ${error.message}`,
      );
      throw new Error(`System SMTP send failed: ${error.message}`);
    }
  }

  /**
   * Render email template with variable substitution
   * Replaces {variableName} placeholders with actual values
   */
  renderTemplate(
    template: string,
    variables: EmailTemplateVariables,
  ): string {
    let rendered = template;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = new RegExp(`\\{${key}\\}`, 'g');
      rendered = rendered.replace(placeholder, String(value ?? ''));
    }

    return rendered;
  }

  /**
   * Insert Calendly link into email template
   * Looks for {calendlyLink} placeholder and replaces with formatted link
   */
  insertCalendlyLink(template: string, calendlyLink: string | null): string {
    if (!calendlyLink) {
      // Remove calendly placeholder if no link provided
      return template
        .replace(/\{calendlyLink\}/g, '')
        .replace(/\{bookingUrl\}/g, '');
    }

    // Replace placeholder with formatted link
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

  /**
   * Insert Google Meet link into email template
   * Looks for {meetLink} or {calendlyLink} placeholder and replaces with formatted link
   */
  insertMeetLink(template: string, meetLink: string | null): string {
    if (!meetLink) {
      // Remove meet link placeholders if no link provided
      return template
        .replace(/\{meetLink\}/g, '')
        .replace(/\{calendlyLink\}/g, '')
        .replace(/\{bookingUrl\}/g, '');
    }

    // Replace placeholder with formatted link
    const meetHtml = `
      <div style="margin: 20px 0; padding: 15px; background-color: #F3F4F6; border-radius: 8px;">
        <p style="margin: 0 0 10px 0; font-weight: 600;">📅 Join Meeting</p>
        <a href="${meetLink}" style="display: inline-block; padding: 10px 20px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">
          Join Google Meet
        </a>
      </div>
    `;

    // Replace both {meetLink} and {calendlyLink} for backward compatibility
    return template
      .replace(/\{meetLink\}/g, meetHtml)
      .replace(/\{calendlyLink\}/g, meetHtml)
      .replace(/\{bookingUrl\}/g, meetHtml);
  }

  /**
   * Insert scheduling link (Calendly or Google Meet) based on workflow preference
   * Looks for {calendlyLink} or {meetLink} placeholder
   */
  insertSchedulingLink(
    template: string,
    schedulingLink: string | null,
    linkType: 'CALENDLY' | 'GOOGLE_MEET',
  ): string {
    if (!schedulingLink) {
      // Remove all scheduling placeholders if no link provided
      return template
        .replace(/\{calendlyLink\}/g, '')
        .replace(/\{meetLink\}/g, '')
        .replace(/\{bookingUrl\}/g, '');
    }

    if (linkType === 'GOOGLE_MEET') {
      return this.insertMeetLink(template, schedulingLink);
    } else {
      return this.insertCalendlyLink(template, schedulingLink);
    }
  }

  /**
   * Build complete email from template with all substitutions
   * Supports Calendly and Google Meet scheduling links with attribution
   */
  async buildEmailFromTemplate(
    workspaceId: string,
    workflowId: string,
    leadId: string, // NEW: Required for attribution
    template: string,
    variables: EmailTemplateVariables,
    meetLink?: string | null, // Optional: Google Meet link if already created
  ): Promise<string> {
    // Get workflow to check scheduling type
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: workflowId },
      select: { schedulingType: true },
    });

    let schedulingLink: string | null = null;
    let linkType: 'CALENDLY' | 'GOOGLE_MEET' = 'CALENDLY';

    if (workflow?.schedulingType === 'GOOGLE_MEET' && meetLink) {
      // Use provided Google Meet link
      schedulingLink = meetLink;
      linkType = 'GOOGLE_MEET';
    } else if (workflow?.schedulingType === 'GOOGLE_MEET') {
      // Google Meet selected but no link provided - remove placeholder
      schedulingLink = null;
      linkType = 'GOOGLE_MEET';
    } else {
      // Default to Calendly with attribution
      schedulingLink = await this.generateCalendlyLinkWithAttribution(
        leadId,
        workspaceId,
      );
      linkType = 'CALENDLY';
    }

    // Insert scheduling link first
    let emailBody = this.insertSchedulingLink(
      template,
      schedulingLink,
      linkType as any,
    );

    // Then substitute other variables
    emailBody = this.renderTemplate(emailBody, variables);

    return emailBody;
  }

  /**
   * Generate Calendly link with attribution (UTM parameter)
   */
  private async generateCalendlyLinkWithAttribution(
    leadId: string,
    workspaceId: string,
  ): Promise<string | null> {
    const baseLink = await this.oauthService.getCalendlyLink(workspaceId);

    if (!baseLink) {
      return null;
    }

    try {
      const url = new URL(baseLink);
      url.searchParams.set('utm_content', `lead_${leadId}`);
      return url.toString();
    } catch (error) {
      this.logger.error('Failed to generate Calendly link with attribution:', error);
      return baseLink; // Fallback to base link
    }
  }


  /**
   * Inject tracking pixel into HTML email
   */
  injectTrackingPixel(
    htmlBody: string,
    leadId: string,
    workflowExecutionId: string,
    emailType: 'welcome' | 'thank_you' | 'follow_up',
  ): string {
    // Generate tracking token
    const trackingPayload: EmailTrackingPayload = {
      leadId,
      workflowExecutionId,
      emailType,
      sentAt: Date.now(),
    };

    const trackingToken = this.emailTrackingService.generateTrackingToken(trackingPayload);
    const backendUrl = this.configService.get<string>('BACKEND_URL', 'http://localhost:3000');
    const trackingPixelUrl = `${backendUrl}/api/v1/email/track/${trackingToken}`;

    // Inject tracking pixel at the end of the HTML body
    // The pixel is a 1x1 transparent image
    const trackingPixelHtml = `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />`;

    // Try to inject before closing </body> tag, otherwise append to end
    if (htmlBody.includes('</body>')) {
      return htmlBody.replace('</body>', `${trackingPixelHtml}</body>`);
    } else {
      return `${htmlBody}${trackingPixelHtml}`;
    }
  }

  /**
   * Verify system SMTP connection (useful for health checks)
   */
  async verifySystemConnection(): Promise<boolean> {
    if (!this.systemTransporter) {
      return false;
    }

    try {
      await this.systemTransporter.verify();
      return true;
    } catch (error) {
      this.logger.error(
        `System SMTP connection verification failed: ${error.message}`,
      );
      return false;
    }
  }
}
