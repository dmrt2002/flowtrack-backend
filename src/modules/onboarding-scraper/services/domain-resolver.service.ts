/**
 * Domain Resolver Service
 *
 * Infers company website domains from company names using multi-strategy approach:
 * 1. Direct TLD testing (example.com, example.io, etc.)
 * 2. DNS validation
 * 3. HTTP accessibility check
 * 4. Google search fallback
 *
 * Architecture: Zero-cost, first-principles domain resolution
 */

import { Injectable, Logger } from '@nestjs/common';
import { promises as dns } from 'dns';
import axios from 'axios';
import * as cheerio from 'cheerio';
import {
  DomainInferenceResult,
  COMMON_TLDS,
  DEFAULT_SCRAPING_CONFIG,
} from '../types/scraper.types';

@Injectable()
export class DomainResolverService {
  private readonly logger = new Logger(DomainResolverService.name);

  /**
   * Infer company domain from company name
   * Tries multiple strategies in sequence until success
   */
  async inferDomain(companyName: string): Promise<DomainInferenceResult> {
    if (!companyName || companyName.trim().length === 0) {
      return {
        domain: null,
        confidence: 0,
        method: 'failed',
      };
    }

    this.logger.log(`Inferring domain for company: ${companyName}`);

    // Strategy 1: Direct TLD testing
    const directResult = await this.tryDirectTLDs(companyName);
    if (directResult.domain) {
      return directResult;
    }

    // Strategy 2: Google search fallback
    const googleResult = await this.searchGoogleForDomain(companyName);
    if (googleResult.domain) {
      return googleResult;
    }

    // All strategies failed
    return {
      domain: null,
      confidence: 0,
      method: 'failed',
      attemptedDomains: directResult.attemptedDomains,
    };
  }

  /**
   * Strategy 1: Try common TLDs with normalized company name
   */
  private async tryDirectTLDs(
    companyName: string,
  ): Promise<DomainInferenceResult> {
    const normalizedName = this.normalizeCompanyName(companyName);
    const attemptedDomains: string[] = [];

    for (const tld of COMMON_TLDS) {
      const domain = `${normalizedName}.${tld}`;
      attemptedDomains.push(domain);

      try {
        // Check 1: DNS resolution
        const dnsValid = await this.isDomainValidDNS(domain);
        if (!dnsValid) {
          continue;
        }

        // Check 2: HTTP accessibility
        const httpAccessible = await this.isDomainAccessible(domain);
        if (!httpAccessible) {
          continue;
        }

        // Check 3: Content validation (ensure it's not a parking page)
        const isRealSite = await this.validateRealWebsite(domain);
        if (!isRealSite) {
          continue;
        }

        // Success! Found valid domain
        this.logger.log(`Successfully resolved domain: ${domain}`);
        return {
          domain,
          confidence: this.calculateConfidence(domain, companyName, 'exact_match'),
          method: 'tld_variation',
          attemptedDomains,
        };
      } catch (error) {
        // Continue to next TLD
        continue;
      }
    }

    return {
      domain: null,
      confidence: 0,
      method: 'failed',
      attemptedDomains,
    };
  }

  /**
   * Strategy 2: Google search for official website
   */
  private async searchGoogleForDomain(
    companyName: string,
  ): Promise<DomainInferenceResult> {
    try {
      const query = encodeURIComponent(`${companyName} official website`);
      const url = `https://www.google.com/search?q=${query}`;

      const response = await axios.get(url, {
        timeout: DEFAULT_SCRAPING_CONFIG.timeout,
        headers: {
          'User-Agent': DEFAULT_SCRAPING_CONFIG.userAgent,
        },
      });

      const $ = cheerio.load(response.data);

      // Extract URLs from search results
      const urlPattern = /https?:\/\/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
      const matches = [...response.data.matchAll(urlPattern)];

      // Filter and validate domains
      for (const match of matches) {
        const fullUrl = match[0];
        const domain = match[1].replace(/^www\./, '');

        // Skip social media and common non-company domains
        if (this.isExcludedDomain(domain)) {
          continue;
        }

        // Check if domain name matches company name
        if (this.domainMatchesCompanyName(domain, companyName)) {
          // Validate it's accessible
          const accessible = await this.isDomainAccessible(domain);
          if (accessible) {
            this.logger.log(`Found domain via Google search: ${domain}`);
            return {
              domain,
              confidence: this.calculateConfidence(domain, companyName, 'google_search'),
              method: 'google_search',
            };
          }
        }
      }

      return {
        domain: null,
        confidence: 0,
        method: 'failed',
      };
    } catch (error) {
      this.logger.warn(`Google search failed: ${error.message}`);
      return {
        domain: null,
        confidence: 0,
        method: 'failed',
      };
    }
  }

  /**
   * Normalize company name for domain construction
   * Example: "WebKnot Technologies Inc." -> "webknottechnologies"
   */
  private normalizeCompanyName(companyName: string): string {
    return companyName
      .toLowerCase()
      .trim()
      // Remove common suffixes
      .replace(/\b(inc|llc|ltd|limited|corporation|corp|company|co|pvt|private)\b\.?/gi, '')
      // Remove special characters except hyphens
      .replace(/[^a-z0-9-]/g, '')
      // Remove multiple hyphens
      .replace(/-+/g, '-')
      // Remove leading/trailing hyphens
      .replace(/^-|-$/g, '')
      // Truncate if too long (domain labels max 63 chars)
      .substring(0, 63);
  }

  /**
   * Check if domain has valid DNS records
   */
  private async isDomainValidDNS(domain: string): Promise<boolean> {
    try {
      await dns.resolve(domain, 'A');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if domain is HTTP accessible
   */
  private async isDomainAccessible(domain: string): Promise<boolean> {
    try {
      const response = await axios.get(`https://${domain}`, {
        timeout: 5000,
        maxRedirects: 3,
        validateStatus: (status) => status < 500, // Accept all non-5xx
        headers: {
          'User-Agent': DEFAULT_SCRAPING_CONFIG.userAgent,
        },
      });

      return response.status >= 200 && response.status < 400;
    } catch (error) {
      // Try HTTP if HTTPS fails
      try {
        const response = await axios.get(`http://${domain}`, {
          timeout: 5000,
          maxRedirects: 3,
          validateStatus: (status) => status < 500,
          headers: {
            'User-Agent': DEFAULT_SCRAPING_CONFIG.userAgent,
          },
        });

        return response.status >= 200 && response.status < 400;
      } catch (httpError) {
        return false;
      }
    }
  }

  /**
   * Validate that website is not a parking page or template site
   */
  private async validateRealWebsite(domain: string): Promise<boolean> {
    try {
      const response = await axios.get(`https://${domain}`, {
        timeout: 5000,
        headers: {
          'User-Agent': DEFAULT_SCRAPING_CONFIG.userAgent,
        },
      });

      const $ = cheerio.load(response.data);
      const bodyText = $('body').text().toLowerCase();
      const title = $('title').text().toLowerCase();

      // Parking page indicators
      const parkingIndicators = [
        'this domain is for sale',
        'buy this domain',
        'domain parking',
        'coming soon',
        'under construction',
        'page not found',
        'default web site page',
        'website is under construction',
      ];

      for (const indicator of parkingIndicators) {
        if (bodyText.includes(indicator) || title.includes(indicator)) {
          return false;
        }
      }

      // Must have meaningful content (>500 chars)
      if (bodyText.length < 500) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if domain matches company name (fuzzy matching)
   */
  private domainMatchesCompanyName(
    domain: string,
    companyName: string,
  ): boolean {
    // Extract domain name without TLD
    const domainName = domain.split('.')[0].toLowerCase();
    const normalizedCompany = this.normalizeCompanyName(companyName);

    // Direct match
    if (domainName === normalizedCompany) {
      return true;
    }

    // Contains company name
    if (domainName.includes(normalizedCompany) || normalizedCompany.includes(domainName)) {
      return true;
    }

    // Fuzzy match: Check if >70% of characters match
    const similarity = this.calculateStringSimilarity(domainName, normalizedCompany);
    return similarity > 0.7;
  }

  /**
   * Calculate string similarity (Levenshtein-based)
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) {
      return 1.0;
    }

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Levenshtein distance algorithm
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Check if domain should be excluded from results
   */
  private isExcludedDomain(domain: string): boolean {
    const excludedDomains = [
      'google.com',
      'facebook.com',
      'linkedin.com',
      'twitter.com',
      'instagram.com',
      'youtube.com',
      'wikipedia.org',
      'amazon.com',
      'apple.com',
      'microsoft.com',
      'github.com',
    ];

    return excludedDomains.some((excluded) => domain.includes(excluded));
  }

  /**
   * Calculate confidence score based on resolution method and match quality
   */
  private calculateConfidence(
    domain: string,
    companyName: string,
    method: 'exact_match' | 'tld_variation' | 'google_search',
  ): number {
    let baseConfidence = 0.6;

    // Method-based confidence
    if (method === 'exact_match') {
      baseConfidence = 0.9;
    } else if (method === 'tld_variation') {
      baseConfidence = 0.85;
    } else if (method === 'google_search') {
      baseConfidence = 0.75;
    }

    // Bonus for domain match quality
    const domainName = domain.split('.')[0].toLowerCase();
    const normalizedCompany = this.normalizeCompanyName(companyName);
    const similarity = this.calculateStringSimilarity(domainName, normalizedCompany);

    // Boost confidence if names are very similar
    const finalConfidence = Math.min(baseConfidence + (similarity * 0.2), 1.0);

    return Math.round(finalConfidence * 100) / 100; // Round to 2 decimals
  }

  /**
   * Parse and validate user-provided URL
   */
  parseUserProvidedUrl(input: string): string | null {
    try {
      // Remove protocol if present
      let cleaned = input.trim().replace(/^https?:\/\//i, '');

      // Remove trailing slash
      cleaned = cleaned.replace(/\/$/, '');

      // Remove path
      cleaned = cleaned.split('/')[0];

      // Remove www prefix
      cleaned = cleaned.replace(/^www\./i, '');

      // Basic validation: must have at least one dot and valid TLD
      if (!cleaned.includes('.')) {
        return null;
      }

      const parts = cleaned.split('.');
      if (parts.length < 2 || parts[parts.length - 1].length < 2) {
        return null;
      }

      return cleaned;
    } catch (error) {
      return null;
    }
  }
}
