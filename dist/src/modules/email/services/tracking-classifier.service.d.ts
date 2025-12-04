import { ConfigService } from '@nestjs/config';
import { EmailTrackingClassification } from '@prisma/client';
export declare class TrackingClassifierService {
    private readonly configService;
    private readonly logger;
    private readonly PREFETCH_WINDOW_SECONDS;
    constructor(configService: ConfigService);
    classify(isAppleProxy: boolean, sentAt: number, openedAt: number): {
        classification: EmailTrackingClassification;
        timeDeltaSeconds: number;
    };
    getClassificationReason(classification: EmailTrackingClassification, timeDeltaSeconds: number, isAppleProxy: boolean): string;
    getPrefetchWindowSeconds(): number;
}
