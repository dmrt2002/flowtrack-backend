import { ConfigService } from '@nestjs/config';
import { OAuthService } from '../oauth/oauth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailTrackingService } from './services/email-tracking.service';
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
export declare class WorkflowEmailService {
    private oauthService;
    private configService;
    private prisma;
    private emailTrackingService;
    private readonly logger;
    private systemTransporter;
    constructor(oauthService: OAuthService, configService: ConfigService, prisma: PrismaService, emailTrackingService: EmailTrackingService);
    private initializeSystemTransporter;
    sendWorkflowEmail(workspaceId: string, emailData: SendWorkflowEmailDto): Promise<void>;
    private sendViaGmailAPI;
    private sendViaSystemSMTP;
    renderTemplate(template: string, variables: EmailTemplateVariables): string;
    insertCalendlyLink(template: string, calendlyLink: string | null): string;
    insertMeetLink(template: string, meetLink: string | null): string;
    insertSchedulingLink(template: string, schedulingLink: string | null, linkType: 'CALENDLY' | 'GOOGLE_MEET'): string;
    buildEmailFromTemplate(workspaceId: string, workflowId: string, leadId: string, template: string, variables: EmailTemplateVariables, meetLink?: string | null): Promise<string>;
    private generateCalendlyLinkWithAttribution;
    injectTrackingPixel(htmlBody: string, leadId: string, workflowExecutionId: string, emailType: 'welcome' | 'thank_you' | 'follow_up'): string;
    verifySystemConnection(): Promise<boolean>;
}
