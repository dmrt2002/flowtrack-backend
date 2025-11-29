import { PrismaService } from '../../../prisma/prisma.service';
export declare class AnalyticsAggregationService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    aggregateDailyStats(): Promise<void>;
    private aggregateFormViews;
    private aggregateFormSubmissions;
    private updateConversionRates;
    private aggregateLeadSources;
    backfillHistoricalData(startDate: Date, endDate: Date): Promise<void>;
}
