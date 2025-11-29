import { OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
export declare class PollingQueueService implements OnModuleInit {
    private pollingQueue;
    private config;
    private readonly logger;
    constructor(pollingQueue: Queue, config: ConfigService);
    onModuleInit(): Promise<void>;
    schedulePolling(): Promise<void>;
    triggerManualPolling(): Promise<void>;
    getQueueStats(): Promise<{
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
    }>;
    getRecentJobs(limit?: number): Promise<{
        id: string | undefined;
        name: string;
        data: any;
        timestamp: number;
        processedOn: number | undefined;
        finishedOn: number | undefined;
        failedReason: string;
        returnvalue: any;
    }[]>;
    pauseQueue(): Promise<void>;
    resumeQueue(): Promise<void>;
    cleanupOldJobs(): Promise<void>;
}
