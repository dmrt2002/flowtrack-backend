import { OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
export declare class EmailPollQueueService implements OnModuleInit {
    private emailPollQueue;
    private config;
    private readonly logger;
    constructor(emailPollQueue: Queue, config: ConfigService);
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
    clearQueue(): Promise<void>;
}
