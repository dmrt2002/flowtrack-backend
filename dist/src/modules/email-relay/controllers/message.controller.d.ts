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
            lead: {
                id: string;
                email: string;
                name: string | null;
            };
            id: string;
            createdAt: Date;
            leadId: string;
            direction: import("@prisma/client").$Enums.MessageDirection;
            fromEmail: string;
            fromName: string | null;
            toEmail: string;
            toName: string | null;
            subject: string;
            textBody: string;
            sentAt: Date | null;
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
            direction: import("@prisma/client").$Enums.MessageDirection;
            fromEmail: string;
            fromName: string | null;
            toEmail: string;
            toName: string | null;
            subject: string;
            htmlBody: string | null;
            textBody: string;
            inReplyTo: string | null;
            messageId: string | null;
            threadId: string | null;
            sentAt: Date | null;
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
