import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { MessageService } from './message.service';
import { SmtpConfig, EmailMessage } from '../types';

@Injectable()
export class RelayEmailService {
  private readonly logger = new Logger(RelayEmailService.name);
  private transporter: Transporter;

  constructor(
    private configService: ConfigService,
    private messageService: MessageService,
  ) {
    this.initializeTransporter();
  }

  /**
   * Initialize SMTP transporter with Gmail relay credentials
   */
  private initializeTransporter() {
    const config: SmtpConfig = {
      host: this.configService.get<string>('GMAIL_SMTP_HOST', 'smtp.gmail.com'),
      port: this.configService.get<number>('GMAIL_SMTP_PORT', 587),
      secure: false, // Use STARTTLS
      auth: {
        user: this.configService.get<string>('GMAIL_RELAY_EMAIL', ''),
        pass: this.configService.get<string>('GMAIL_RELAY_PASSWORD', ''),
      },
    };

    this.transporter = nodemailer.createTransport(config);

    // Verify transporter configuration
    this.transporter.verify((error, success) => {
      if (error) {
        this.logger.error('SMTP transporter verification failed', error);
      } else {
        this.logger.log('SMTP transporter is ready to send emails');
      }
    });
  }

  /**
   * Send email to lead with Reply-To containing lead ID for tracking
   */
  async sendEmailToLead(
    workspaceId: string,
    leadId: string,
    leadEmail: string,
    leadName: string | undefined,
    subject: string,
    textBody: string,
    htmlBody: string | undefined,
    senderName: string = 'FlowTrack',
  ): Promise<{ messageId: string }> {
    const relayEmail = this.configService.get<string>('GMAIL_RELAY_EMAIL', '');

    // Generate Reply-To with plus addressing: flowtrack.relay+{leadId}@gmail.com
    const [localPart, domain] = relayEmail.split('@');
    const replyToEmail = `${localPart}+${leadId}@${domain}`;

    const mailOptions = {
      from: `"${senderName} via FlowTrack" <${relayEmail}>`,
      replyTo: replyToEmail,
      to: leadName ? `"${leadName}" <${leadEmail}>` : leadEmail,
      subject,
      text: textBody,
      html: htmlBody || textBody,
    };

    try {
      this.logger.log(`Sending email to ${leadEmail} (Lead ID: ${leadId})`);

      const info = await this.transporter.sendMail(mailOptions);

      this.logger.log(`Email sent successfully: ${info.messageId}`);

      // Save outbound message to database
      const emailMessage: EmailMessage = {
        from: {
          email: relayEmail,
          name: `${senderName} via FlowTrack`,
        },
        to: {
          email: leadEmail,
          name: leadName,
        },
        subject,
        textBody,
        htmlBody,
        messageId: info.messageId,
      };

      await this.messageService.createOutboundMessage(
        workspaceId,
        leadId,
        emailMessage,
      );

      return { messageId: info.messageId };
    } catch (error) {
      this.logger.error(`Failed to send email to ${leadEmail}`, error);
      throw error;
    }
  }

  /**
   * Send email with template variable substitution
   */
  async sendTemplatedEmail(
    workspaceId: string,
    leadId: string,
    leadEmail: string,
    leadName: string | undefined,
    subject: string,
    template: string,
    variables: Record<string, string>,
    senderName: string = 'FlowTrack',
  ): Promise<{ messageId: string }> {
    // Replace template variables
    let processedTemplate = template;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      processedTemplate = processedTemplate.replace(regex, value);
    });

    return this.sendEmailToLead(
      workspaceId,
      leadId,
      leadEmail,
      leadName,
      subject,
      processedTemplate,
      undefined,
      senderName,
    );
  }
}
