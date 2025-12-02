import { ConfigService } from '@nestjs/config';
import { MessageService } from './message.service';
export declare class ImapPollerService {
    private configService;
    private messageService;
    private readonly logger;
    private readonly LEAD_ID_REGEX;
    constructor(configService: ConfigService, messageService: MessageService);
    pollInbox(): Promise<void>;
    private processMessages;
    private handleInboundEmail;
    private markMessageAsSeen;
    private getImapConfig;
}
