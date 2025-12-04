/**
 * Onboarding Company Scraper - Type Definitions
 *
 * Defines interfaces for website scraping and business intelligence extraction
 * during the onboarding flow.
 */

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
  // Core business intelligence
  summary: string;
  industry: string;
  businessModel: BusinessModel;
  companySize: CompanySize;

  // Website information
  website: string;
  companyName: string;
  logo?: string;

  // Confidence scoring
  confidence: number; // 0.0 - 1.0

  // Metadata
  scrapedAt: Date;
  source: 'user_provided' | 'inferred' | 'fallback';

  // Optional structured data
  structuredData?: WebsiteMetadata;
}

export interface WebsiteMetadata {
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;

  // Schema.org JSON-LD data
  jsonLd?: {
    '@type'?: string;
    name?: string;
    description?: string;
    logo?: string;
    address?: any;
    contactPoint?: any;
    sameAs?: string[]; // Social links
    numberOfEmployees?: string | number;
  };

  // Social media links
  socialLinks?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
  };

  // Technical metadata
  techStack?: string[];
}

export type BusinessModel =
  | 'B2B'
  | 'B2C'
  | 'B2B2C'
  | 'Marketplace'
  | 'Unknown';

export type CompanySize =
  | 'Startup'
  | 'SMB'
  | 'Mid-Market'
  | 'Enterprise'
  | 'Unknown';

export type Industry =
  | 'Technology'
  | 'SaaS'
  | 'E-commerce'
  | 'Finance'
  | 'Healthcare'
  | 'Education'
  | 'Real Estate'
  | 'Construction'
  | 'Manufacturing'
  | 'Retail'
  | 'Professional Services'
  | 'Marketing & Advertising'
  | 'Hospitality'
  | 'Nonprofit'
  | 'Other';

export type ScraperErrorCode =
  | 'INVALID_INPUT'
  | 'DOMAIN_NOT_FOUND'
  | 'WEBSITE_INACCESSIBLE'
  | 'SCRAPING_FAILED'
  | 'TIMEOUT'
  | 'NETWORK_ERROR'
  | 'PARSING_ERROR'
  | 'LOW_CONFIDENCE'
  | 'UNKNOWN_ERROR';

export interface DomainInferenceResult {
  domain: string | null;
  confidence: number;
  method: 'exact_match' | 'tld_variation' | 'google_search' | 'failed';
  attemptedDomains?: string[];
}

export interface BusinessClassificationSignals {
  // B2B indicators
  hasEnterpriseTerms: boolean;
  hasAPIDocumentation: boolean;
  hasTeamsPricing: boolean;
  hasIntegrations: boolean;

  // B2C indicators
  hasShoppingCart: boolean;
  hasConsumerPricing: boolean;
  hasCheckoutFlow: boolean;

  // Industry signals
  detectedKeywords: string[];
  primaryVertical?: Industry;

  // Company size signals
  employeeCount?: number;
  foundingYear?: number;
  hasCareersPage: boolean;
  hasMultipleOffices: boolean;

  // Confidence factors
  hasStructuredData: boolean;
  metaQuality: 'high' | 'medium' | 'low';
  contentDepth: number; // Characters of text analyzed
}

export interface ScrapingConfig {
  timeout: number; // milliseconds
  maxRetries: number;
  userAgent: string;
  followRedirects: boolean;
  validateSSL: boolean;
}

export const DEFAULT_SCRAPING_CONFIG: ScrapingConfig = {
  timeout: 10000, // 10 seconds
  maxRetries: 2,
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  followRedirects: true,
  validateSSL: true,
};

export interface SummaryTemplate {
  businessModel: BusinessModel;
  industry: string;
  description: string;
}

/**
 * Confidence threshold constants
 */
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.8,
  MEDIUM: 0.6,
  LOW: 0.4,
  MINIMUM: 0.3,
};

/**
 * Common TLDs for domain inference, ordered by priority
 */
export const COMMON_TLDS = [
  'com',
  'io',
  'ai',
  'co',
  'app',
  'net',
  'org',
  'in',
  'co.uk',
  'co.in',
  'us',
  'dev',
];
