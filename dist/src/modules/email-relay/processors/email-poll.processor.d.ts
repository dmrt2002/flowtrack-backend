import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ImapPollerService } from '../services/imap-poller.service';
export declare class EmailPollProcessor extends WorkerHost {
    private imapPollerService;
    private readonly logger;
    constructor(imapPollerService: ImapPollerService);
    process(job: Job<any>): Promise<any>;
}
