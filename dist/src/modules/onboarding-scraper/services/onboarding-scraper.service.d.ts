import { PrismaService } from '../../../prisma/prisma.service';
import { DomainResolverService } from './domain-resolver.service';
import { BusinessIntelligenceService } from './business-intelligence.service';
import { ScraperRequest, ScraperResponse, EnrichedCompanyData } from '../types/scraper.types';
export declare class OnboardingScraperService {
    private readonly prisma;
    private readonly domainResolver;
    private readonly businessIntel;
    private readonly logger;
    constructor(prisma: PrismaService, domainResolver: DomainResolverService, businessIntel: BusinessIntelligenceService);
    scrapeCompany(request: ScraperRequest): Promise<ScraperResponse>;
    private resolveDomain;
    private scrapeWebsite;
    private extractMetadata;
    private extractSocialLink;
    private detectBasicTechStack;
    private getCompanyLogo;
    private calculateOverallConfidence;
    private storeEnrichedData;
    getEnrichedData(workflowId: string): Promise<EnrichedCompanyData | null>;
    isEnrichmentComplete(workflowId: string): Promise<boolean>;
}
