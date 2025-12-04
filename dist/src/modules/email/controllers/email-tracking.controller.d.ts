import { Queue } from 'bullmq';
import type { Request, Response } from 'express';
import { EmailTrackingService } from '../services/email-tracking.service';
import type { EmailTrackingAnalysisJob } from '../processors/email-tracking-analysis.processor';
export declare class EmailTrackingController {
    private emailTrackingService;
    private trackingQueue;
    private readonly logger;
    constructor(emailTrackingService: EmailTrackingService, trackingQueue: Queue<EmailTrackingAnalysisJob>);
    trackEmailOpen(token: string, req: Request, res: Response): Promise<void>;
    private extractClientIp;
}
