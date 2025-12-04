import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as dns from 'dns';
import { promisify } from 'util';
import * as net from 'net';
import axios from 'axios';
import * as cheerio from 'cheerio';
import {
  EnrichmentData,
  EnrichmentResult,
  CompanyEnrichment,
  PersonEnrichment,
  EmailEnrichment,
  DnsRecords,
  EmailProvider,
  MxRecord,
  WebsiteMetadata,
  TechStackDetails,
} from '../types/enrichment.types';
import {
  HEADER_PATTERNS,
  META_PATTERNS,
  META_ATTRIBUTE_PATTERNS,
  SCRIPT_PATTERNS,
  COOKIE_PATTERNS,
  URL_PATH_PATTERNS,
  DNS_TXT_PATTERNS,
  JS_VARIABLE_PATTERNS,
  TechPattern,
  TechCategory,
} from './tech-detection-patterns';

// Promisify DNS methods
const resolveMx = promisify(dns.resolveMx);
const resolveTxt = promisify(dns.resolveTxt);
const resolve4 = promisify(dns.resolve4);

@Injectable()
export class EnrichmentService {
  private readonly logger = new Logger(EnrichmentService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Main enrichment orchestrator
   * Runs all enrichment layers and aggregates results
   */
  async enrichLead(
    leadId: string,
    email: string,
    name?: string,
    companyName?: string,
  ): Promise<EnrichmentResult> {
    this.logger.log(`Starting enrichment for lead ${leadId} (${email})`);

    try {
      // Update status to PROCESSING
      await this.prisma.lead.update({
        where: { id: leadId },
        data: { enrichmentStatus: 'PROCESSING' },
      });

      // Extract domain from email
      let domain = this.extractDomain(email);
      if (!domain) {
        return this.skipEnrichment(
          leadId,
          'Invalid email format - no domain found',
        );
      }

      // HACK #1.6: Personal Email Fallback Logic
      // If personal email domain detected and companyName exists, search for company domain
      let usedFallback = false;
      let fallbackReason: string | undefined;
      const originalEmailDomain = domain;

      if (this.isPersonalEmailDomain(domain)) {
        this.logger.debug(
          `Personal email domain detected (${domain}) for lead ${leadId}`,
        );

        if (companyName) {
          this.logger.debug(
            `Attempting fallback: searching for company domain using name: ${companyName}`,
          );

          const companyDomain = await this.findCompanyDomainByName(companyName);

          if (companyDomain) {
            this.logger.log(
              `Fallback successful: ${originalEmailDomain} → ${companyDomain} for lead ${leadId}`,
            );
            domain = companyDomain;
            usedFallback = true;
            fallbackReason = `Personal email domain (${originalEmailDomain}) replaced with company domain`;
          } else {
            // CRITICAL: Skip enrichment if we can't find company domain
            return this.skipEnrichment(
              leadId,
              `Could not determine company domain for "${companyName}". Personal email domain (${originalEmailDomain}) detected but company domain lookup failed via both direct inference and Google search.`,
            );
          }
        } else {
          // Skip enrichment if personal email with no company name
          return this.skipEnrichment(
            leadId,
            `Personal email domain detected (${originalEmailDomain}) but no company name provided. Cannot enrich without company information.`,
          );
        }
      }

      // Layer 1: DNS Intelligence
      const dnsData = await this.getDnsIntelligence(domain);

      // Layer 2: Email Verification
      const emailData = await this.verifyEmail(email, dnsData);

      // Layer 3: Company Intelligence from Website (includes tech stack detection)
      const companyData = await this.scrapeCompanyWebsite(domain, companyName, dnsData);

      // Layer 4: Person Intelligence (LinkedIn search)
      const personData = await this.findPersonProfile(name, companyName || companyData?.name, email);

      // Aggregate enrichment data
      const enrichmentData: EnrichmentData = {
        enrichedAt: new Date().toISOString(),
        enrichmentVersion: '1.0',
        company: companyData,
        person: personData,
        email: emailData,
        rawData: {
          dns: dnsData,
          usedFallback,
          fallbackReason,
          originalEmailDomain,
          enrichedDomain: domain,
        },
      };

      // Save enrichment data
      await this.prisma.lead.update({
        where: { id: leadId },
        data: {
          enrichmentData: enrichmentData as any,
          enrichmentStatus: 'COMPLETED',
          enrichedAt: new Date(),
        },
      });

      this.logger.log(`Enrichment completed for lead ${leadId}`);

      return {
        success: true,
        data: enrichmentData,
      };
    } catch (error) {
      this.logger.error(
        `Enrichment failed for lead ${leadId}: ${error.message}`,
        error.stack,
      );

      await this.prisma.lead.update({
        where: { id: leadId },
        data: { enrichmentStatus: 'FAILED' },
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * HACK #1: Extract domain from email
   */
  private extractDomain(email: string): string | null {
    const match = email.match(/@(.+)$/);
    return match ? match[1].toLowerCase() : null;
  }

  /**
   * HACK #1.5: Detect personal email domains (Gmail, Yahoo, Outlook, etc.)
   * These domains won't provide useful company intelligence
   */
  private isPersonalEmailDomain(domain: string): boolean {
    const personalDomains = [
      // Google
      'gmail.com',
      'googlemail.com',
      // Yahoo
      'yahoo.com',
      'yahoo.co.uk',
      'yahoo.fr',
      'yahoo.in',
      'yahoo.co.jp',
      'yahoo.de',
      // Microsoft
      'outlook.com',
      'hotmail.com',
      'live.com',
      'msn.com',
      // Apple
      'icloud.com',
      'me.com',
      'mac.com',
      // Others
      'aol.com',
      'protonmail.com',
      'proton.me',
      'mail.com',
      'zoho.com',
      'yandex.com',
      'yandex.ru',
    ];
    return personalDomains.includes(domain.toLowerCase());
  }

  /**
   * HACK #2: DNS Intelligence - Free company fingerprinting
   * Extract MX records, TXT records, SPF, DMARC to identify company infrastructure
   */
  private async getDnsIntelligence(domain: string): Promise<DnsRecords> {
    this.logger.debug(`Fetching DNS records for ${domain}`);

    const dnsRecords: DnsRecords = {
      mx: [],
      txt: [],
    };

    try {
      // Get MX records
      const mxRecords = await resolveMx(domain);
      dnsRecords.mx = mxRecords
        .sort((a, b) => a.priority - b.priority)
        .map((record) => ({
          exchange: record.exchange,
          priority: record.priority,
        }));

      this.logger.debug(`Found ${mxRecords.length} MX records for ${domain}`);
    } catch (error) {
      this.logger.warn(`No MX records found for ${domain}: ${error.message}`);
    }

    try {
      // Get TXT records
      const txtRecords = await resolveTxt(domain);
      dnsRecords.txt = txtRecords.map((record) => record.join(''));

      // Extract SPF, DMARC, DKIM from TXT records
      for (const txt of dnsRecords.txt) {
        if (txt.startsWith('v=spf1')) {
          dnsRecords.spf = txt;
        }
        if (txt.startsWith('v=DMARC1')) {
          dnsRecords.dmarc = txt;
        }
      }

      this.logger.debug(`Found ${txtRecords.length} TXT records for ${domain}`);
    } catch (error) {
      this.logger.warn(`No TXT records found for ${domain}: ${error.message}`);
    }

    return dnsRecords;
  }

  /**
   * HACK #3: MX Record Fingerprinting - Identify email provider
   */
  private identifyEmailProvider(mxRecords: MxRecord[]): EmailProvider {
    if (!mxRecords || mxRecords.length === 0) {
      return EmailProvider.UNKNOWN;
    }

    const primaryMx = mxRecords[0].exchange.toLowerCase();

    // Google Workspace
    if (
      primaryMx.includes('google.com') ||
      primaryMx.includes('aspmx.l.google.com')
    ) {
      return EmailProvider.GOOGLE_WORKSPACE;
    }

    // Microsoft 365
    if (
      primaryMx.includes('outlook.com') ||
      primaryMx.includes('protection.outlook.com') ||
      primaryMx.includes('mail.protection.outlook.com')
    ) {
      return EmailProvider.MICROSOFT_365;
    }

    // Zoho
    if (primaryMx.includes('zoho.com') || primaryMx.includes('mx.zoho.com')) {
      return EmailProvider.ZOHO;
    }

    // ProtonMail
    if (primaryMx.includes('protonmail.ch') || primaryMx.includes('protonmail.com')) {
      return EmailProvider.PROTONMAIL;
    }

    // Mailgun
    if (primaryMx.includes('mailgun.org')) {
      return EmailProvider.MAILGUN;
    }

    // SendGrid
    if (primaryMx.includes('sendgrid.net')) {
      return EmailProvider.SENDGRID;
    }

    // Self-hosted (domain matches MX record)
    const domain = mxRecords[0].exchange.split('.').slice(-2).join('.');
    if (primaryMx.includes(domain)) {
      return EmailProvider.SELF_HOSTED;
    }

    return EmailProvider.UNKNOWN;
  }

  /**
   * HACK #4: SMTP Verification - Check if email exists without sending
   */
  private async verifyEmail(
    email: string,
    dnsData: DnsRecords,
  ): Promise<EmailEnrichment> {
    this.logger.debug(`Verifying email: ${email}`);

    const emailEnrichment: EmailEnrichment = {
      isValid: this.isValidEmailFormat(email),
      isDeliverable: false,
      isDisposable: this.isDisposableEmail(email),
      isCatchAll: false,
      isRoleAccount: this.isRoleAccount(email),
      provider: this.identifyEmailProvider(dnsData.mx),
      smtpVerified: false,
      mxRecords: dnsData.mx.map((mx) => mx.exchange),
    };

    // If no MX records, email is not deliverable
    if (!dnsData.mx || dnsData.mx.length === 0) {
      return emailEnrichment;
    }

    // SMTP verification (without sending)
    try {
      const smtpResult = await this.smtpVerify(email, dnsData.mx[0].exchange);
      emailEnrichment.smtpVerified = smtpResult.verified;
      emailEnrichment.isDeliverable = smtpResult.verified;
      emailEnrichment.isCatchAll = smtpResult.isCatchAll;
    } catch (error) {
      this.logger.warn(`SMTP verification failed for ${email}: ${error.message}`);
    }

    return emailEnrichment;
  }

  /**
   * Validate email format
   */
  private isValidEmailFormat(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Check if email is from disposable provider
   */
  private isDisposableEmail(email: string): boolean {
    const disposableDomains = [
      'tempmail.com',
      'guerrillamail.com',
      '10minutemail.com',
      'throwaway.email',
      'mailinator.com',
      'trashmail.com',
      'yopmail.com',
    ];

    const domain = this.extractDomain(email);
    return disposableDomains.some((d) => domain?.includes(d));
  }

  /**
   * Check if email is a role account (info@, support@, etc.)
   */
  private isRoleAccount(email: string): boolean {
    const roleAccounts = [
      'info',
      'support',
      'admin',
      'contact',
      'sales',
      'marketing',
      'hello',
      'team',
      'noreply',
      'no-reply',
    ];

    const localPart = email.split('@')[0].toLowerCase();
    return roleAccounts.includes(localPart);
  }

  /**
   * SMTP verification without sending email
   * Connects to SMTP server and checks if mailbox exists
   */
  private async smtpVerify(
    email: string,
    mxHost: string,
  ): Promise<{ verified: boolean; isCatchAll: boolean }> {
    return new Promise((resolve) => {
      const socket = net.createConnection(25, mxHost);
      let response = '';
      let step = 0;

      socket.setTimeout(10000); // 10 second timeout

      socket.on('data', (data) => {
        response += data.toString();

        if (response.includes('\n')) {
          const lines = response.split('\n');
          const lastLine = lines[lines.length - 2] || '';

          if (step === 0 && lastLine.startsWith('220')) {
            socket.write('HELO flowtrack.io\r\n');
            step = 1;
          } else if (step === 1 && lastLine.startsWith('250')) {
            socket.write('MAIL FROM:<verify@flowtrack.io>\r\n');
            step = 2;
          } else if (step === 2 && lastLine.startsWith('250')) {
            socket.write(`RCPT TO:<${email}>\r\n`);
            step = 3;
          } else if (step === 3) {
            const verified = lastLine.startsWith('250');
            socket.write('QUIT\r\n');
            socket.end();
            resolve({ verified, isCatchAll: false });
          }

          response = '';
        }
      });

      socket.on('error', () => {
        resolve({ verified: false, isCatchAll: false });
      });

      socket.on('timeout', () => {
        socket.end();
        resolve({ verified: false, isCatchAll: false });
      });
    });
  }

  /**
   * HACK #5: Scrape company website for metadata + tech stack detection
   */
  private async scrapeCompanyWebsite(
    domain: string,
    companyName?: string,
    dnsData?: DnsRecords,
  ): Promise<CompanyEnrichment | undefined> {
    this.logger.debug(`Scraping website for ${domain}`);

    try {
      const url = `https://${domain}`;
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const $ = cheerio.load(response.data);
      const metadata = this.extractWebsiteMetadata($);

      // Extract cookies from Set-Cookie headers
      const cookies = response.headers['set-cookie'] || [];

      // HACK #7: Detect tech stack from multiple signals
      const { techStack, techStackDetailed } = this.detectTechStack(
        response.headers,
        response.data,
        $,
        cookies,
        dnsData || { mx: [], txt: [] },
      );

      // Extract company logo using Clearbit's FREE logo API
      const logoUrl = `https://logo.clearbit.com/${domain}`;

      // Find social links
      const linkedinUrl = this.findSocialLink($, 'linkedin.com');
      const twitterUrl = this.findSocialLink($, 'twitter.com') || this.findSocialLink($, 'x.com');
      const facebookUrl = this.findSocialLink($, 'facebook.com');

      const companyEnrichment: CompanyEnrichment = {
        name: companyName || metadata.ogTitle || metadata.title || domain,
        domain,
        logo: logoUrl,
        description: metadata.ogDescription || metadata.description,
        website: url,
        linkedinUrl,
        twitterUrl,
        facebookUrl,
        techStack: techStack.length > 0 ? techStack : undefined,
        techStackDetailed: techStack.length > 0 ? techStackDetailed : undefined,
      };

      this.logger.log(
        `Detected ${techStack.length} technologies for ${domain}: ${techStack.join(', ')}`,
      );

      return companyEnrichment;
    } catch (error) {
      this.logger.warn(`Failed to scrape website ${domain}: ${error.message}`);
      return undefined;
    }
  }

  /**
   * Extract website metadata from HTML
   */
  private extractWebsiteMetadata($: cheerio.CheerioAPI): WebsiteMetadata {
    const metadata: WebsiteMetadata = {};

    // Basic meta tags
    metadata.title = $('title').text();
    metadata.description = $('meta[name="description"]').attr('content');
    metadata.keywords = $('meta[name="keywords"]')
      .attr('content')
      ?.split(',')
      .map((k) => k.trim());

    // Open Graph tags
    metadata.ogTitle = $('meta[property="og:title"]').attr('content');
    metadata.ogDescription = $('meta[property="og:description"]').attr('content');
    metadata.ogImage = $('meta[property="og:image"]').attr('content');

    // JSON-LD structured data
    const jsonLdScript = $('script[type="application/ld+json"]').first().html();
    if (jsonLdScript) {
      try {
        metadata.jsonLd = JSON.parse(jsonLdScript);
      } catch (error) {
        // Ignore parsing errors
      }
    }

    return metadata;
  }

  /**
   * Find social media link in webpage
   */
  private findSocialLink($: cheerio.CheerioAPI, platform: string): string | undefined {
    const link = $(`a[href*="${platform}"]`).first().attr('href');
    return link?.startsWith('http') ? link : undefined;
  }

  /**
   * HACK #6: Find person's LinkedIn profile via Google search
   */
  private async findPersonProfile(
    name?: string,
    companyName?: string,
    email?: string,
  ): Promise<PersonEnrichment | undefined> {
    if (!name) return undefined;

    this.logger.debug(`Finding profile for ${name} at ${companyName}`);

    try {
      // Construct search query
      const query = `site:linkedin.com/in ${name} ${companyName || ''}`;
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

      const response = await axios.get(searchUrl, {
        timeout: 10000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const $ = cheerio.load(response.data);

      // Extract first LinkedIn URL from search results
      const linkedinUrl = $('a[href*="linkedin.com/in/"]')
        .first()
        .attr('href');

      if (!linkedinUrl) {
        return undefined;
      }

      // Parse name
      const nameParts = name.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');

      return {
        firstName,
        lastName,
        fullName: name,
        linkedinUrl: linkedinUrl.split('&')[0], // Clean URL
      };
    } catch (error) {
      this.logger.warn(`Failed to find profile for ${name}: ${error.message}`);
      return undefined;
    }
  }

  /**
   * Validate if a domain exists using DNS lookup
   */
  private async isDomainValid(domain: string): Promise<boolean> {
    try {
      await resolve4(domain);
      return true;
    } catch (error) {
      this.logger.debug(`Domain ${domain} does not exist: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if company name appears in domain
   * Handles variations like: webknot -> webknot.in, webknot.com, etc.
   */
  private domainMatchesCompanyName(
    domain: string,
    companyName: string,
  ): boolean {
    // Normalize both strings: lowercase, remove spaces, hyphens, underscores
    const normalizedCompany = companyName
      .toLowerCase()
      .replace(/[\s\-_]/g, '');
    const normalizedDomain = domain
      .toLowerCase()
      .replace(/^www\./, '')
      .split('.')[0] // Get domain name without TLD
      .replace(/[\s\-_]/g, '');

    // Check if domain starts with or contains company name
    return (
      normalizedDomain === normalizedCompany ||
      normalizedDomain.includes(normalizedCompany) ||
      normalizedCompany.includes(normalizedDomain)
    );
  }

  /**
   * Check if domain has a working website (HTTP 200 response)
   */
  private async isDomainWebsiteAccessible(domain: string): Promise<boolean> {
    try {
      const response = await axios.get(`https://${domain}`, {
        timeout: 5000,
        maxRedirects: 5,
        validateStatus: (status) => status >= 200 && status < 400,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      // Check if response has meaningful content (not just a redirect page)
      const hasContent = response.data && response.data.length > 500;

      this.logger.debug(
        `Domain ${domain} is accessible: ${response.status}, has content: ${hasContent}`,
      );

      return hasContent;
    } catch (error) {
      this.logger.debug(
        `Domain ${domain} is not accessible: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * Try to infer company domain by testing common TLDs
   * Returns first valid domain that matches company name
   */
  private async inferCompanyDomain(
    companyName: string,
  ): Promise<string | null> {
    // Normalize company name for domain inference
    const baseCompanyName = companyName
      .toLowerCase()
      .replace(/[\s]/g, '') // Remove spaces
      .replace(/[^a-z0-9\-]/g, ''); // Keep only alphanumeric and hyphens

    // Try common TLDs in order of likelihood
    const tlds = [
      'com',
      'in', // India
      'io',
      'co',
      'ai',
      'net',
      'org',
      'co.in', // India country TLD
      'co.uk', // UK
      'de', // Germany
      'fr', // France
      'jp', // Japan
      'au', // Australia
    ];

    this.logger.debug(
      `Attempting direct domain inference for: ${companyName}`,
    );

    const validDomains: string[] = [];

    // First pass: Check DNS for all TLDs
    for (const tld of tlds) {
      const domain = `${baseCompanyName}.${tld}`;

      const isValid = await this.isDomainValid(domain);

      if (isValid) {
        validDomains.push(domain);
        this.logger.debug(`Found valid DNS for: ${domain}`);
      }
    }

    if (validDomains.length === 0) {
      this.logger.warn(
        `Could not infer domain for ${companyName} - no valid TLD variants found`,
      );
      return null;
    }

    // If only one domain found, return it
    if (validDomains.length === 1) {
      this.logger.log(
        `Successfully inferred domain: ${validDomains[0]} for ${companyName}`,
      );
      return validDomains[0];
    }

    // Multiple domains found - check which has a working website
    this.logger.debug(
      `Multiple valid domains found for ${companyName}: ${validDomains.join(', ')}. Checking website accessibility...`,
    );

    for (const domain of validDomains) {
      const isAccessible = await this.isDomainWebsiteAccessible(domain);

      if (isAccessible) {
        this.logger.log(
          `Successfully inferred domain with working website: ${domain} for ${companyName}`,
        );
        return domain;
      }
    }

    // If no accessible website found, return the first valid DNS domain
    this.logger.log(
      `No accessible website found, returning first valid domain: ${validDomains[0]} for ${companyName}`,
    );
    return validDomains[0];
  }

  /**
   * HACK #6.5: Find Company Domain from Company Name
   * When personal email domain detected (Gmail, Yahoo, etc.), use company name
   * to search Google and find the actual company domain for enrichment
   */
  private async findCompanyDomainByName(
    companyName: string,
  ): Promise<string | null> {
    // Strategy 1: Try direct domain inference first (faster and more reliable)
    this.logger.log(
      `[Strategy 1] Attempting direct domain inference for: ${companyName}`,
    );
    const inferredDomain = await this.inferCompanyDomain(companyName);
    if (inferredDomain) {
      return inferredDomain;
    }

    // Strategy 2: Fall back to Google search if inference fails
    this.logger.log(
      `[Strategy 2] Attempting Google search for: ${companyName}`,
    );
    try {
      const query = encodeURIComponent(`${companyName} official website`);
      const url = `https://www.google.com/search?q=${query}`;

      this.logger.debug(
        `Searching for company domain: ${companyName} via Google`,
      );

      const response = await axios.get(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        timeout: 5000,
      });

      // Extract domain from first organic search result
      // Look for URLs in the response HTML
      const urlPattern = /https?:\/\/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
      const matches = [...response.data.matchAll(urlPattern)];

      if (matches.length > 0) {
        // Filter and validate domains
        const excludeDomains = [
          'google.com',
          'linkedin.com',
          'facebook.com',
          'twitter.com',
          'youtube.com',
          'instagram.com',
          'wikipedia.org',
          'yelp.com',
          'glassdoor.com',
          'indeed.com',
          'crunchbase.com',
          'bloomberg.com',
        ];

        for (const match of matches) {
          let domain = match[1]
            .replace(/^www\./, '')
            .toLowerCase()
            .trim();

          // Skip excluded domains
          if (excludeDomains.some((d) => domain.includes(d))) {
            this.logger.debug(
              `Skipping excluded domain: ${domain}`,
            );
            continue;
          }

          // Skip if domain looks like a subdomain (but not country TLDs like co.uk)
          const parts = domain.split('.');
          if (parts.length > 2) {
            // Allow country TLDs like .co.uk, .co.in
            const lastTwoParts = parts.slice(-2).join('.');
            const countryTlds = ['co.uk', 'co.in', 'co.jp', 'co.au', 'com.au'];
            if (!countryTlds.includes(lastTwoParts)) {
              this.logger.debug(
                `Skipping subdomain: ${domain}`,
              );
              continue;
            }
          }

          // CRITICAL: Validate that domain contains company name
          if (!this.domainMatchesCompanyName(domain, companyName)) {
            this.logger.debug(
              `Skipping domain (no name match): ${domain} does not match ${companyName}`,
            );
            continue;
          }

          // Validate domain exists via DNS
          const isValid = await this.isDomainValid(domain);
          if (!isValid) {
            this.logger.debug(
              `Skipping domain (DNS failed): ${domain}`,
            );
            continue;
          }

          this.logger.log(
            `Found valid company domain via Google: ${domain} for ${companyName}`,
          );
          return domain;
        }
      }

      this.logger.warn(
        `Google search found no suitable company domain for: ${companyName}`,
      );
      return null;
    } catch (error) {
      this.logger.warn(
        `Google search failed for ${companyName}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * HACK #7: Tech Stack Detection from Multiple Signals
   * Detect technologies using HTTP headers, HTML, scripts, cookies, DNS
   */
  private detectTechStack(
    headers: any,
    html: string,
    $: cheerio.CheerioAPI,
    cookies: string[],
    dnsRecords: DnsRecords,
  ): { techStack: string[]; techStackDetailed: TechStackDetails } {
    const detectedTech = new Map<string, TechPattern>();

    // Layer 1: HTTP Headers
    this.detectFromHeaders(headers).forEach((tech) => {
      detectedTech.set(tech.name, tech);
    });

    // Layer 2: Meta Tags
    this.detectFromMeta($).forEach((tech) => {
      detectedTech.set(tech.name, tech);
    });

    // Layer 3: Script Sources
    this.detectFromScripts($).forEach((tech) => {
      detectedTech.set(tech.name, tech);
    });

    // Layer 4: Cookies
    this.detectFromCookies(cookies).forEach((tech) => {
      detectedTech.set(tech.name, tech);
    });

    // Layer 5: URL Patterns
    this.detectFromUrlPatterns(html).forEach((tech) => {
      detectedTech.set(tech.name, tech);
    });

    // Layer 6: DNS Records
    this.detectFromDns(dnsRecords).forEach((tech) => {
      detectedTech.set(tech.name, tech);
    });

    // Layer 7: JavaScript Variables (inline scripts)
    this.detectFromJsVariables(html).forEach((tech) => {
      detectedTech.set(tech.name, tech);
    });

    // Convert to arrays
    const technologies = Array.from(detectedTech.values());
    const techStack = technologies.map((t) => t.name);

    // Group by category
    const techStackDetailed: TechStackDetails = {
      crm: [],
      analytics: [],
      marketing: [],
      chat: [],
      cms: [],
      ecommerce: [],
      cdn: [],
      hosting: [],
      payment: [],
      development: [],
      other: [],
    };

    technologies.forEach((tech) => {
      techStackDetailed[tech.category].push(tech.name);
    });

    return { techStack, techStackDetailed };
  }

  /**
   * Detect tech from HTTP response headers
   */
  private detectFromHeaders(headers: any): TechPattern[] {
    const detected: TechPattern[] = [];

    // Check each header
    for (const [headerName, headerValue] of Object.entries(headers)) {
      const headerLower = headerName.toLowerCase();
      const valueLower = String(headerValue).toLowerCase();

      // Direct header match
      if (HEADER_PATTERNS[headerLower]) {
        for (const pattern of HEADER_PATTERNS[headerLower]) {
          if (valueLower.includes(pattern.name.toLowerCase())) {
            detected.push(pattern);
          }
        }
      }

      // Value-based matching (e.g., X-Powered-By: Express)
      if (headerLower === 'x-powered-by') {
        for (const tech of HEADER_PATTERNS['x-powered-by']) {
          if (valueLower.includes(tech.name.toLowerCase())) {
            detected.push(tech);
          }
        }
      }

      if (headerLower === 'server') {
        for (const tech of HEADER_PATTERNS.server) {
          if (valueLower.includes(tech.name.toLowerCase())) {
            detected.push(tech);
          }
        }
      }
    }

    return detected;
  }

  /**
   * Detect tech from HTML meta tags
   */
  private detectFromMeta($: cheerio.CheerioAPI): TechPattern[] {
    const detected: TechPattern[] = [];

    // Generator meta tag
    const generator = $('meta[name="generator"]').attr('content');
    if (generator) {
      for (const [key, tech] of Object.entries(META_PATTERNS.generator)) {
        if (generator.includes(key)) {
          detected.push(tech);
        }
      }
    }

    // Other meta attributes
    for (const [attrName, tech] of Object.entries(META_ATTRIBUTE_PATTERNS)) {
      if ($(`meta[name="${attrName}"]`).length > 0) {
        detected.push(tech);
      }
    }

    return detected;
  }

  /**
   * Detect tech from script source URLs
   */
  private detectFromScripts($: cheerio.CheerioAPI): TechPattern[] {
    const detected: TechPattern[] = [];
    const scripts: string[] = [];

    // Extract all script sources
    $('script[src]').each((i, el) => {
      const src = $(el).attr('src');
      if (src) {
        scripts.push(src);
      }
    });

    // Match against patterns
    for (const scriptSrc of scripts) {
      for (const { pattern, tech } of SCRIPT_PATTERNS) {
        if (pattern.test(scriptSrc)) {
          detected.push(tech);
        }
      }
    }

    return detected;
  }

  /**
   * Detect tech from cookies
   */
  private detectFromCookies(cookies: string[]): TechPattern[] {
    const detected: TechPattern[] = [];

    for (const cookie of cookies) {
      // Extract cookie name (before =)
      const cookieName = cookie.split('=')[0].trim();

      // Match against patterns
      for (const { pattern, tech } of COOKIE_PATTERNS) {
        if (pattern.test(cookieName)) {
          detected.push(tech);
        }
      }
    }

    return detected;
  }

  /**
   * Detect tech from URL path patterns
   */
  private detectFromUrlPatterns(html: string): TechPattern[] {
    const detected: TechPattern[] = [];

    // Match against patterns
    for (const { pattern, tech } of URL_PATH_PATTERNS) {
      if (pattern.test(html)) {
        detected.push(tech);
      }
    }

    return detected;
  }

  /**
   * Detect tech from DNS TXT records
   */
  private detectFromDns(dnsRecords: DnsRecords): TechPattern[] {
    const detected: TechPattern[] = [];

    if (!dnsRecords.txt) return detected;

    for (const txtRecord of dnsRecords.txt) {
      // Match against patterns
      for (const { pattern, tech } of DNS_TXT_PATTERNS) {
        if (pattern.test(txtRecord)) {
          detected.push(tech);
        }
      }
    }

    return detected;
  }

  /**
   * Detect tech from JavaScript window variables in inline scripts
   */
  private detectFromJsVariables(html: string): TechPattern[] {
    const detected: TechPattern[] = [];

    // Match against patterns
    for (const { pattern, tech } of JS_VARIABLE_PATTERNS) {
      if (pattern.test(html)) {
        detected.push(tech);
      }
    }

    return detected;
  }

  /**
   * Skip enrichment with reason
   */
  private async skipEnrichment(
    leadId: string,
    reason: string,
  ): Promise<EnrichmentResult> {
    this.logger.warn(`Skipping enrichment for lead ${leadId}: ${reason}`);

    await this.prisma.lead.update({
      where: { id: leadId },
      data: { enrichmentStatus: 'SKIPPED' },
    });

    return {
      success: false,
      skipped: true,
      skipReason: reason,
    };
  }

  /**
   * Re-enrich existing lead (manual trigger)
   */
  async reEnrichLead(leadId: string): Promise<EnrichmentResult> {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new Error(`Lead ${leadId} not found`);
    }

    return this.enrichLead(
      leadId,
      lead.email,
      lead.name || undefined,
      lead.companyName || undefined,
    );
  }
}
