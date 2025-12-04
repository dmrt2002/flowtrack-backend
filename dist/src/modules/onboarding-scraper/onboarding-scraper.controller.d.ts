import { OnboardingScraperService } from './services/onboarding-scraper.service';
import { ScrapeCompanyRequestDto, ScrapeCompanyResponseDto, GetEnrichmentStatusResponseDto } from './dto/scraper.dto';
export declare class OnboardingScraperController {
    private readonly scraperService;
    private readonly logger;
    constructor(scraperService: OnboardingScraperService);
    scrapeCompany(dto: ScrapeCompanyRequestDto): Promise<ScrapeCompanyResponseDto>;
    getEnrichmentStatus(workflowId: string): Promise<GetEnrichmentStatusResponseDto>;
    healthCheck(): Promise<{
        status: string;
        version: string;
        timestamp: Date;
    }>;
}
