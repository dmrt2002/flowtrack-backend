import { ConfigService } from '@nestjs/config';
import { MessageService } from './message.service';
export declare class RelayEmailService {
    private configService;
    private messageService;
    private readonly logger;
    private transporter;
    constructor(configService: ConfigService, messageService: MessageService);
    private initializeTransporter;
    sendEmailToLead(workspaceId: string, leadId: string, leadEmail: string, leadName: string | undefined, subject: string, textBody: string, htmlBody: string | undefined, senderName?: string): Promise<{
        messageId: string;
    }>;
    sendTemplatedEmail(workspaceId: string, leadId: string, leadEmail: string, leadName: string | undefined, subject: string, template: string, variables: Record<string, string>, senderName?: string): Promise<{
        messageId: string;
    }>;
}
