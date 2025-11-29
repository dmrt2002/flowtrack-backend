import type { Response } from 'express';
import { EmailTrackingService } from '../services/email-tracking.service';
export declare class EmailTrackingController {
    private emailTrackingService;
    constructor(emailTrackingService: EmailTrackingService);
    trackEmailOpen(token: string, res: Response): Promise<void>;
}
