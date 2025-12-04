import type { CheerioAPI } from 'cheerio';
import { BusinessModel, CompanySize, Industry, WebsiteMetadata } from '../types/scraper.types';
export declare class BusinessIntelligenceService {
    private readonly logger;
    detectBusinessModel($: CheerioAPI, metadata: WebsiteMetadata): {
        model: BusinessModel;
        confidence: number;
    };
    detectIndustry($: CheerioAPI, metadata: WebsiteMetadata): {
        industry: Industry;
        confidence: number;
    };
    detectCompanySize($: CheerioAPI, metadata: WebsiteMetadata): {
        size: CompanySize;
        confidence: number;
    };
    generateBusinessSummary(businessModel: BusinessModel, industry: Industry, metadata: WebsiteMetadata, $: CheerioAPI): string;
    private extractBusinessModelSignals;
    private calculateB2BScore;
    private calculateB2CScore;
    private calculateMarketplaceScore;
    private extractTextContent;
    private extractMainHeading;
    private extractKeywords;
    private extractEmployeeCount;
    private extractFoundingYear;
    private assessMetaQuality;
    private containsAny;
    private cleanDescription;
    private buildSummaryTemplate;
    private extractCompanySizeSignals;
}
