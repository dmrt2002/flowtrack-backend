export interface EnrichmentData {
    enrichedAt: string;
    enrichmentVersion: string;
    company?: CompanyEnrichment;
    person?: PersonEnrichment;
    email?: EmailEnrichment;
    intent?: IntentSignals;
    rawData?: {
        dns?: DnsRecords;
        website?: WebsiteMetadata;
        search?: SearchResults;
        usedFallback?: boolean;
        fallbackReason?: string;
        originalEmailDomain?: string;
        enrichedDomain?: string;
    };
}
export interface CompanyEnrichment {
    name: string;
    domain: string;
    logo?: string;
    description?: string;
    industry?: string;
    size?: string;
    location?: string;
    headquarters?: string;
    founded?: string;
    website?: string;
    linkedinUrl?: string;
    twitterUrl?: string;
    facebookUrl?: string;
    techStack?: string[];
    techStackDetailed?: TechStackDetails;
    emailProvider?: EmailProvider;
}
export interface TechStackDetails {
    crm: string[];
    analytics: string[];
    marketing: string[];
    chat: string[];
    cms: string[];
    ecommerce: string[];
    cdn: string[];
    hosting: string[];
    payment: string[];
    development: string[];
    other: string[];
}
export interface PersonEnrichment {
    firstName?: string;
    lastName?: string;
    fullName?: string;
    jobTitle?: string;
    seniority?: string;
    department?: string;
    linkedinUrl?: string;
    twitterUrl?: string;
    githubUrl?: string;
    photoUrl?: string;
}
export interface EmailEnrichment {
    isValid: boolean;
    isDeliverable: boolean;
    isDisposable: boolean;
    isCatchAll: boolean;
    isRoleAccount: boolean;
    provider: string;
    smtpVerified: boolean;
    mxRecords: string[];
}
export interface IntentSignals {
    recentNews?: string[];
    fundingRounds?: string[];
    jobPostings?: number;
    techChanges?: string[];
    companyGrowth?: string;
}
export interface DnsRecords {
    mx: MxRecord[];
    txt: string[];
    spf?: string;
    dmarc?: string;
    dkim?: string;
}
export interface MxRecord {
    exchange: string;
    priority: number;
}
export interface WebsiteMetadata {
    title?: string;
    description?: string;
    keywords?: string[];
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    jsonLd?: any;
    structuredData?: any;
}
export interface SearchResults {
    companyInfo?: any;
    linkedinProfile?: string;
    newsArticles?: string[];
}
export declare enum EmailProvider {
    GOOGLE_WORKSPACE = "Google Workspace",
    MICROSOFT_365 = "Microsoft 365",
    ZOHO = "Zoho Mail",
    PROTONMAIL = "ProtonMail",
    MAILGUN = "Mailgun",
    SENDGRID = "SendGrid",
    SELF_HOSTED = "Self-Hosted",
    UNKNOWN = "Unknown"
}
export interface EnrichmentJobData {
    leadId: string;
    workspaceId: string;
    email: string;
    name?: string;
    companyName?: string;
    retryCount?: number;
}
export interface EnrichmentResult {
    success: boolean;
    data?: EnrichmentData;
    error?: string;
    skipped?: boolean;
    skipReason?: string;
}
