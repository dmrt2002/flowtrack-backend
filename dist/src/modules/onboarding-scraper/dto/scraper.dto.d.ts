export declare class ScrapeCompanyRequestDto {
    companyName?: string;
    website?: string;
    workflowId: string;
    atLeastOne?: string;
}
export declare class EnrichedCompanyResponseDto {
    summary: string;
    industry: string;
    businessModel: string;
    companySize: string;
    website: string;
    companyName: string;
    logo?: string;
    confidence: number;
    scrapedAt: Date;
    source: string;
}
export declare class ScraperErrorResponseDto {
    code: string;
    message: string;
    details?: any;
}
export declare class ScrapeCompanyResponseDto {
    success: boolean;
    data?: EnrichedCompanyResponseDto;
    error?: ScraperErrorResponseDto;
}
export declare class GetEnrichmentStatusResponseDto {
    exists: boolean;
    data?: EnrichedCompanyResponseDto;
}
