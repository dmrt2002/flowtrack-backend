import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { DnsResolverService } from '../services/dns-resolver.service';
import { TrackingClassifierService } from '../services/tracking-classifier.service';
import { EmailTrackingService } from '../services/email-tracking.service';
export interface EmailTrackingAnalysisJob {
    clientIp: string;
    userAgent: string | null;
    sentAt: number;
    leadId: string;
    workflowExecutionId: string;
    emailType: string;
}
export declare class EmailTrackingAnalysisProcessor extends WorkerHost {
    private readonly dnsResolver;
    private readonly classifier;
    private readonly emailTracking;
    private readonly logger;
    constructor(dnsResolver: DnsResolverService, classifier: TrackingClassifierService, emailTracking: EmailTrackingService);
    process(job: Job<EmailTrackingAnalysisJob>): Promise<void>;
}
