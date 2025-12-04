export interface ScraperRequest {
    companyName?: string;
    website?: string;
    workflowId: string;
    workspaceId: string;
}
export interface ScraperResponse {
    success: boolean;
    data?: EnrichedCompanyData;
    error?: {
        code: ScraperErrorCode;
        message: string;
        details?: any;
    };
}
export interface EnrichedCompanyData {
    summary: string;
    industry: string;
    businessModel: BusinessModel;
    companySize: CompanySize;
    website: string;
    companyName: string;
    logo?: string;
    confidence: number;
    scrapedAt: Date;
    source: 'user_provided' | 'inferred' | 'fallback';
    structuredData?: WebsiteMetadata;
}
export interface WebsiteMetadata {
    title?: string;
    description?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    jsonLd?: {
        '@type'?: string;
        name?: string;
        description?: string;
        logo?: string;
        address?: any;
        contactPoint?: any;
        sameAs?: string[];
        numberOfEmployees?: string | number;
    };
    socialLinks?: {
        linkedin?: string;
        twitter?: string;
        facebook?: string;
    };
    techStack?: string[];
}
export type BusinessModel = 'B2B' | 'B2C' | 'B2B2C' | 'Marketplace' | 'Unknown';
export type CompanySize = 'Startup' | 'SMB' | 'Mid-Market' | 'Enterprise' | 'Unknown';
export type Industry = 'Technology' | 'SaaS' | 'E-commerce' | 'Finance' | 'Healthcare' | 'Education' | 'Real Estate' | 'Construction' | 'Manufacturing' | 'Retail' | 'Professional Services' | 'Marketing & Advertising' | 'Hospitality' | 'Nonprofit' | 'Other';
export type ScraperErrorCode = 'INVALID_INPUT' | 'DOMAIN_NOT_FOUND' | 'WEBSITE_INACCESSIBLE' | 'SCRAPING_FAILED' | 'TIMEOUT' | 'NETWORK_ERROR' | 'PARSING_ERROR' | 'LOW_CONFIDENCE' | 'UNKNOWN_ERROR';
export interface DomainInferenceResult {
    domain: string | null;
    confidence: number;
    method: 'exact_match' | 'tld_variation' | 'google_search' | 'failed';
    attemptedDomains?: string[];
}
export interface BusinessClassificationSignals {
    hasEnterpriseTerms: boolean;
    hasAPIDocumentation: boolean;
    hasTeamsPricing: boolean;
    hasIntegrations: boolean;
    hasShoppingCart: boolean;
    hasConsumerPricing: boolean;
    hasCheckoutFlow: boolean;
    detectedKeywords: string[];
    primaryVertical?: Industry;
    employeeCount?: number;
    foundingYear?: number;
    hasCareersPage: boolean;
    hasMultipleOffices: boolean;
    hasStructuredData: boolean;
    metaQuality: 'high' | 'medium' | 'low';
    contentDepth: number;
}
export interface ScrapingConfig {
    timeout: number;
    maxRetries: number;
    userAgent: string;
    followRedirects: boolean;
    validateSSL: boolean;
}
export declare const DEFAULT_SCRAPING_CONFIG: ScrapingConfig;
export interface SummaryTemplate {
    businessModel: BusinessModel;
    industry: string;
    description: string;
}
export declare const CONFIDENCE_THRESHOLDS: {
    HIGH: number;
    MEDIUM: number;
    LOW: number;
    MINIMUM: number;
};
export declare const COMMON_TLDS: string[];
