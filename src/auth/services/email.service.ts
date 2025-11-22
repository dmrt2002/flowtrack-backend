import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  /**
   * Initialize nodemailer transporter with SMTP configuration
   */
  private initializeTransporter(): void {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpPort = this.configService.get<number>('SMTP_PORT');
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      this.logger.warn(
        'SMTP configuration incomplete. Email functionality will not work.',
      );
      return;
    }

    // Mailtrap configuration - exactly as per their nodemailer example
    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    this.logger.log(`Email service initialized with SMTP: ${smtpHost}:${smtpPort}`);
  }

  /**
   * Send email verification email
   */
  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const appUrl = this.configService.get<string>('APP_URL');
    const verificationUrl = `${appUrl}/auth/verify-email?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background-color: #4F46E5;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              margin: 20px 0;
            }
            .footer { margin-top: 40px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Verify Your Email Address</h1>
            <p>Thank you for signing up for FlowTrack! Please verify your email address by clicking the button below:</p>
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #4F46E5;">${verificationUrl}</p>
            <p>This link will expire in 24 hours.</p>
            <div class="footer">
              <p>If you didn't create an account with FlowTrack, you can safely ignore this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail(email, 'Verify Your Email Address - FlowTrack', html);
    this.logger.log(`Verification email sent to: ${email}`);
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const appUrl = this.configService.get<string>('APP_URL');
    const resetUrl = `${appUrl}/auth/reset-password?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background-color: #4F46E5;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              margin: 20px 0;
            }
            .warning {
              background-color: #FEF3C7;
              border-left: 4px solid #F59E0B;
              padding: 12px;
              margin: 20px 0;
            }
            .footer { margin-top: 40px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Reset Your Password</h1>
            <p>We received a request to reset your password for your FlowTrack account.</p>
            <a href="${resetUrl}" class="button">Reset Password</a>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #4F46E5;">${resetUrl}</p>
            <p>This link will expire in 1 hour.</p>
            <div class="warning">
              <strong>Security Notice:</strong> If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
            </div>
            <div class="footer">
              <p>For security reasons, this link can only be used once.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail(email, 'Reset Your Password - FlowTrack', html);
    this.logger.log(`Password reset email sent to: ${email}`);
    this.logger.log(`🔗 Reset URL: ${resetUrl}`);
  }

  /**
   * Send welcome email after successful registration
   */
  async sendWelcomeEmail(email: string, name: string | null): Promise<void> {
    const appUrl = this.configService.get<string>('APP_URL');
    const displayName = name || 'there';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background-color: #4F46E5;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              margin: 20px 0;
            }
            .feature-list {
              background-color: #F3F4F6;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .footer { margin-top: 40px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Welcome to FlowTrack, ${displayName}!</h1>
            <p>Your account has been successfully created and verified. You're now ready to start managing your workflows efficiently.</p>

            <div class="feature-list">
              <h3>What you can do with FlowTrack:</h3>
              <ul>
                <li>Create and manage custom workflows</li>
                <li>Track submissions with advanced analytics</li>
                <li>Collaborate with your team in real-time</li>
                <li>Generate dynamic forms with custom fields</li>
              </ul>
            </div>

            <a href="${appUrl}/dashboard" class="button">Go to Dashboard</a>

            <div class="footer">
              <p>Need help getting started? Check out our <a href="${appUrl}/docs">documentation</a> or contact support.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail(email, 'Welcome to FlowTrack!', html);
    this.logger.log(`Welcome email sent to: ${email}`);
  }

  /**
   * Send generic email (internal helper)
   */
  private async sendEmail(
    to: string,
    subject: string,
    html: string,
  ): Promise<void> {
    if (!this.transporter) {
      this.logger.error(
        'Email transporter not initialized. Cannot send email.',
      );
      throw new Error('Email service is not configured');
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
      await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject,
        html,
      });
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`);
      throw new Error('Failed to send email');
    }
  }

  /**
   * Verify SMTP connection (useful for health checks)
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      this.logger.error(`SMTP connection verification failed: ${error.message}`);
      return false;
    }
  }
}
