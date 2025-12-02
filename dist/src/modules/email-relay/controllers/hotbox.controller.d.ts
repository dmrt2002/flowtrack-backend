import { MessageService } from '../services/message.service';
import type { GetHotboxConversationsDto } from '../dto/hotbox.dto';
export declare class HotboxController {
    private messageService;
    constructor(messageService: MessageService);
    getConversationsNeedingReply(workspaceId: string, query: GetHotboxConversationsDto): Promise<{
        data: any[];
        total: number;
        limit: number;
        offset: number;
    }>;
    getConversationsSentOnly(workspaceId: string, query: GetHotboxConversationsDto): Promise<{
        data: any[];
        total: number;
        limit: number;
        offset: number;
    }>;
}
