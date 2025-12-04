import { DomainInferenceResult } from '../types/scraper.types';
export declare class DomainResolverService {
    private readonly logger;
    inferDomain(companyName: string): Promise<DomainInferenceResult>;
    private tryDirectTLDs;
    private searchGoogleForDomain;
    private normalizeCompanyName;
    private isDomainValidDNS;
    private isDomainAccessible;
    private validateRealWebsite;
    private domainMatchesCompanyName;
    private calculateStringSimilarity;
    private levenshteinDistance;
    private isExcludedDomain;
    private calculateConfidence;
    parseUserProvidedUrl(input: string): string | null;
}
