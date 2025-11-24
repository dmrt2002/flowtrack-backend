import { ConfigService } from '@nestjs/config';
import { OAuthService } from '../oauth/oauth.service';
import { PrismaService } from '../../prisma/prisma.service';
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
    private readonly logger;
    private systemTransporter;
    constructor(oauthService: OAuthService, configService: ConfigService, prisma: PrismaService);
    private initializeSystemTransporter;
    sendWorkflowEmail(workspaceId: string, emailData: SendWorkflowEmailDto): Promise<void>;
    private sendViaGmailAPI;
    private sendViaSystemSMTP;
    renderTemplate(template: string, variables: EmailTemplateVariables): string;
    insertCalendlyLink(template: string, calendlyLink: string | null): string;
    insertMeetLink(template: string, meetLink: string | null): string;
    insertSchedulingLink(template: string, schedulingLink: string | null, linkType: 'CALENDLY' | 'GOOGLE_MEET'): string;
    buildEmailFromTemplate(workspaceId: string, workflowId: string, template: string, variables: EmailTemplateVariables, meetLink?: string | null): Promise<string>;
    verifySystemConnection(): Promise<boolean>;
}
