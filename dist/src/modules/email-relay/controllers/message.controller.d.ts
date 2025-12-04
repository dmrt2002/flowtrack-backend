import { MessageService } from '../services/message.service';
import { RelayEmailService } from '../services/relay-email.service';
import { PrismaService } from '../../../prisma/prisma.service';
import type { SendRelayEmailDto } from '../dto/send-relay-email.dto';
import type { GetMessagesQueryDto } from '../dto/get-messages.dto';
export declare class MessageController {
    private messageService;
    private relayEmailService;
    private prisma;
    constructor(messageService: MessageService, relayEmailService: RelayEmailService, prisma: PrismaService);
    getWorkspaceMessages(workspaceId: string, query: GetMessagesQueryDto): Promise<{
        data: {
            id: string;
            createdAt: Date;
            lead: {
                id: string;
                name: string | null;
                email: string;
            };
            subject: string;
            leadId: string;
            sentAt: Date | null;
            textBody: string;
            direction: import("@prisma/client").$Enums.MessageDirection;
            fromEmail: string;
            fromName: string | null;
            toEmail: string;
            toName: string | null;
            receivedAt: Date | null;
        }[];
        total: number;
        limit: number;
        offset: number;
    }>;
    getLeadMessages(workspaceId: string, leadId: string, query: GetMessagesQueryDto): Promise<{
        data: {
            id: string;
            createdAt: Date;
            inReplyTo: string | null;
            subject: string;
            messageId: string | null;
            sentAt: Date | null;
            htmlBody: string | null;
            textBody: string;
            threadId: string | null;
            direction: import("@prisma/client").$Enums.MessageDirection;
            fromEmail: string;
            fromName: string | null;
            toEmail: string;
            toName: string | null;
            receivedAt: Date | null;
        }[];
        total: number;
        limit: number;
        offset: number;
    }>;
    sendEmailToLead(workspaceId: string, leadId: string, dto: SendRelayEmailDto): Promise<{
        success: boolean;
        messageId: string;
        message: string;
    }>;
}
