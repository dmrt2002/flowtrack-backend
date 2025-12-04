"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var EnrichmentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnrichmentService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
const dns = __importStar(require("dns"));
const util_1 = require("util");
const net = __importStar(require("net"));
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const enrichment_types_1 = require("../types/enrichment.types");
const tech_detection_patterns_1 = require("./tech-detection-patterns");
const resolveMx = (0, util_1.promisify)(dns.resolveMx);
const resolveTxt = (0, util_1.promisify)(dns.resolveTxt);
const resolve4 = (0, util_1.promisify)(dns.resolve4);
let EnrichmentService = EnrichmentService_1 = class EnrichmentService {
    prisma;
    logger = new common_1.Logger(EnrichmentService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async enrichLead(leadId, email, name, companyName) {
        this.logger.log(`Starting enrichment for lead ${leadId} (${email})`);
        try {
            await this.prisma.lead.update({
                where: { id: leadId },
                data: { enrichmentStatus: 'PROCESSING' },
            });
            let domain = this.extractDomain(email);
            if (!domain) {
                return this.skipEnrichment(leadId, 'Invalid email format - no domain found');
            }
            let usedFallback = false;
            let fallbackReason;
            const originalEmailDomain = domain;
            if (this.isPersonalEmailDomain(domain)) {
                this.logger.debug(`Personal email domain detected (${domain}) for lead ${leadId}`);
                if (companyName) {
                    this.logger.debug(`Attempting fallback: searching for company domain using name: ${companyName}`);
                    const companyDomain = await this.findCompanyDomainByName(companyName);
                    if (companyDomain) {
                        this.logger.log(`Fallback successful: ${originalEmailDomain} → ${companyDomain} for lead ${leadId}`);
                        domain = companyDomain;
                        usedFallback = true;
                        fallbackReason = `Personal email domain (${originalEmailDomain}) replaced with company domain`;
                    }
                    else {
                        return this.skipEnrichment(leadId, `Could not determine company domain for "${companyName}". Personal email domain (${originalEmailDomain}) detected but company domain lookup failed via both direct inference and Google search.`);
                    }
                }
                else {
                    return this.skipEnrichment(leadId, `Personal email domain detected (${originalEmailDomain}) but no company name provided. Cannot enrich without company information.`);
                }
            }
            const dnsData = await this.getDnsIntelligence(domain);
            const emailData = await this.verifyEmail(email, dnsData);
            const companyData = await this.scrapeCompanyWebsite(domain, companyName, dnsData);
            const personData = await this.findPersonProfile(name, companyName || companyData?.name, email);
            const enrichmentData = {
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
            await this.prisma.lead.update({
                where: { id: leadId },
                data: {
                    enrichmentData: enrichmentData,
                    enrichmentStatus: 'COMPLETED',
                    enrichedAt: new Date(),
                },
            });
            this.logger.log(`Enrichment completed for lead ${leadId}`);
            return {
                success: true,
                data: enrichmentData,
            };
        }
        catch (error) {
            this.logger.error(`Enrichment failed for lead ${leadId}: ${error.message}`, error.stack);
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
    extractDomain(email) {
        const match = email.match(/@(.+)$/);
        return match ? match[1].toLowerCase() : null;
    }
    isPersonalEmailDomain(domain) {
        const personalDomains = [
            'gmail.com',
            'googlemail.com',
            'yahoo.com',
            'yahoo.co.uk',
            'yahoo.fr',
            'yahoo.in',
            'yahoo.co.jp',
            'yahoo.de',
            'outlook.com',
            'hotmail.com',
            'live.com',
            'msn.com',
            'icloud.com',
            'me.com',
            'mac.com',
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
    async getDnsIntelligence(domain) {
        this.logger.debug(`Fetching DNS records for ${domain}`);
        const dnsRecords = {
            mx: [],
            txt: [],
        };
        try {
            const mxRecords = await resolveMx(domain);
            dnsRecords.mx = mxRecords
                .sort((a, b) => a.priority - b.priority)
                .map((record) => ({
                exchange: record.exchange,
                priority: record.priority,
            }));
            this.logger.debug(`Found ${mxRecords.length} MX records for ${domain}`);
        }
        catch (error) {
            this.logger.warn(`No MX records found for ${domain}: ${error.message}`);
        }
        try {
            const txtRecords = await resolveTxt(domain);
            dnsRecords.txt = txtRecords.map((record) => record.join(''));
            for (const txt of dnsRecords.txt) {
                if (txt.startsWith('v=spf1')) {
                    dnsRecords.spf = txt;
                }
                if (txt.startsWith('v=DMARC1')) {
                    dnsRecords.dmarc = txt;
                }
            }
            this.logger.debug(`Found ${txtRecords.length} TXT records for ${domain}`);
        }
        catch (error) {
            this.logger.warn(`No TXT records found for ${domain}: ${error.message}`);
        }
        return dnsRecords;
    }
    identifyEmailProvider(mxRecords) {
        if (!mxRecords || mxRecords.length === 0) {
            return enrichment_types_1.EmailProvider.UNKNOWN;
        }
        const primaryMx = mxRecords[0].exchange.toLowerCase();
        if (primaryMx.includes('google.com') ||
            primaryMx.includes('aspmx.l.google.com')) {
            return enrichment_types_1.EmailProvider.GOOGLE_WORKSPACE;
        }
        if (primaryMx.includes('outlook.com') ||
            primaryMx.includes('protection.outlook.com') ||
            primaryMx.includes('mail.protection.outlook.com')) {
            return enrichment_types_1.EmailProvider.MICROSOFT_365;
        }
        if (primaryMx.includes('zoho.com') || primaryMx.includes('mx.zoho.com')) {
            return enrichment_types_1.EmailProvider.ZOHO;
        }
        if (primaryMx.includes('protonmail.ch') || primaryMx.includes('protonmail.com')) {
            return enrichment_types_1.EmailProvider.PROTONMAIL;
        }
        if (primaryMx.includes('mailgun.org')) {
            return enrichment_types_1.EmailProvider.MAILGUN;
        }
        if (primaryMx.includes('sendgrid.net')) {
            return enrichment_types_1.EmailProvider.SENDGRID;
        }
        const domain = mxRecords[0].exchange.split('.').slice(-2).join('.');
        if (primaryMx.includes(domain)) {
            return enrichment_types_1.EmailProvider.SELF_HOSTED;
        }
        return enrichment_types_1.EmailProvider.UNKNOWN;
    }
    async verifyEmail(email, dnsData) {
        this.logger.debug(`Verifying email: ${email}`);
        const emailEnrichment = {
            isValid: this.isValidEmailFormat(email),
            isDeliverable: false,
            isDisposable: this.isDisposableEmail(email),
            isCatchAll: false,
            isRoleAccount: this.isRoleAccount(email),
            provider: this.identifyEmailProvider(dnsData.mx),
            smtpVerified: false,
            mxRecords: dnsData.mx.map((mx) => mx.exchange),
        };
        if (!dnsData.mx || dnsData.mx.length === 0) {
            return emailEnrichment;
        }
        try {
            const smtpResult = await this.smtpVerify(email, dnsData.mx[0].exchange);
            emailEnrichment.smtpVerified = smtpResult.verified;
            emailEnrichment.isDeliverable = smtpResult.verified;
            emailEnrichment.isCatchAll = smtpResult.isCatchAll;
        }
        catch (error) {
            this.logger.warn(`SMTP verification failed for ${email}: ${error.message}`);
        }
        return emailEnrichment;
    }
    isValidEmailFormat(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    isDisposableEmail(email) {
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
    isRoleAccount(email) {
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
    async smtpVerify(email, mxHost) {
        return new Promise((resolve) => {
            const socket = net.createConnection(25, mxHost);
            let response = '';
            let step = 0;
            socket.setTimeout(10000);
            socket.on('data', (data) => {
                response += data.toString();
                if (response.includes('\n')) {
                    const lines = response.split('\n');
                    const lastLine = lines[lines.length - 2] || '';
                    if (step === 0 && lastLine.startsWith('220')) {
                        socket.write('HELO flowtrack.io\r\n');
                        step = 1;
                    }
                    else if (step === 1 && lastLine.startsWith('250')) {
                        socket.write('MAIL FROM:<verify@flowtrack.io>\r\n');
                        step = 2;
                    }
                    else if (step === 2 && lastLine.startsWith('250')) {
                        socket.write(`RCPT TO:<${email}>\r\n`);
                        step = 3;
                    }
                    else if (step === 3) {
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
    async scrapeCompanyWebsite(domain, companyName, dnsData) {
        this.logger.debug(`Scraping website for ${domain}`);
        try {
            const url = `https://${domain}`;
            const response = await axios_1.default.get(url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
            });
            const $ = cheerio.load(response.data);
            const metadata = this.extractWebsiteMetadata($);
            const cookies = response.headers['set-cookie'] || [];
            const { techStack, techStackDetailed } = this.detectTechStack(response.headers, response.data, $, cookies, dnsData || { mx: [], txt: [] });
            const logoUrl = `https://logo.clearbit.com/${domain}`;
            const linkedinUrl = this.findSocialLink($, 'linkedin.com');
            const twitterUrl = this.findSocialLink($, 'twitter.com') || this.findSocialLink($, 'x.com');
            const facebookUrl = this.findSocialLink($, 'facebook.com');
            const companyEnrichment = {
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
            this.logger.log(`Detected ${techStack.length} technologies for ${domain}: ${techStack.join(', ')}`);
            return companyEnrichment;
        }
        catch (error) {
            this.logger.warn(`Failed to scrape website ${domain}: ${error.message}`);
            return undefined;
        }
    }
    extractWebsiteMetadata($) {
        const metadata = {};
        metadata.title = $('title').text();
        metadata.description = $('meta[name="description"]').attr('content');
        metadata.keywords = $('meta[name="keywords"]')
            .attr('content')
            ?.split(',')
            .map((k) => k.trim());
        metadata.ogTitle = $('meta[property="og:title"]').attr('content');
        metadata.ogDescription = $('meta[property="og:description"]').attr('content');
        metadata.ogImage = $('meta[property="og:image"]').attr('content');
        const jsonLdScript = $('script[type="application/ld+json"]').first().html();
        if (jsonLdScript) {
            try {
                metadata.jsonLd = JSON.parse(jsonLdScript);
            }
            catch (error) {
            }
        }
        return metadata;
    }
    findSocialLink($, platform) {
        const link = $(`a[href*="${platform}"]`).first().attr('href');
        return link?.startsWith('http') ? link : undefined;
    }
    async findPersonProfile(name, companyName, email) {
        if (!name)
            return undefined;
        this.logger.debug(`Finding profile for ${name} at ${companyName}`);
        try {
            const query = `site:linkedin.com/in ${name} ${companyName || ''}`;
            const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
            const response = await axios_1.default.get(searchUrl, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
            });
            const $ = cheerio.load(response.data);
            const linkedinUrl = $('a[href*="linkedin.com/in/"]')
                .first()
                .attr('href');
            if (!linkedinUrl) {
                return undefined;
            }
            const nameParts = name.split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(' ');
            return {
                firstName,
                lastName,
                fullName: name,
                linkedinUrl: linkedinUrl.split('&')[0],
            };
        }
        catch (error) {
            this.logger.warn(`Failed to find profile for ${name}: ${error.message}`);
            return undefined;
        }
    }
    async isDomainValid(domain) {
        try {
            await resolve4(domain);
            return true;
        }
        catch (error) {
            this.logger.debug(`Domain ${domain} does not exist: ${error.message}`);
            return false;
        }
    }
    domainMatchesCompanyName(domain, companyName) {
        const normalizedCompany = companyName
            .toLowerCase()
            .replace(/[\s\-_]/g, '');
        const normalizedDomain = domain
            .toLowerCase()
            .replace(/^www\./, '')
            .split('.')[0]
            .replace(/[\s\-_]/g, '');
        return (normalizedDomain === normalizedCompany ||
            normalizedDomain.includes(normalizedCompany) ||
            normalizedCompany.includes(normalizedDomain));
    }
    async isDomainWebsiteAccessible(domain) {
        try {
            const response = await axios_1.default.get(`https://${domain}`, {
                timeout: 5000,
                maxRedirects: 5,
                validateStatus: (status) => status >= 200 && status < 400,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
            });
            const hasContent = response.data && response.data.length > 500;
            this.logger.debug(`Domain ${domain} is accessible: ${response.status}, has content: ${hasContent}`);
            return hasContent;
        }
        catch (error) {
            this.logger.debug(`Domain ${domain} is not accessible: ${error.message}`);
            return false;
        }
    }
    async inferCompanyDomain(companyName) {
        const baseCompanyName = companyName
            .toLowerCase()
            .replace(/[\s]/g, '')
            .replace(/[^a-z0-9\-]/g, '');
        const tlds = [
            'com',
            'in',
            'io',
            'co',
            'ai',
            'net',
            'org',
            'co.in',
            'co.uk',
            'de',
            'fr',
            'jp',
            'au',
        ];
        this.logger.debug(`Attempting direct domain inference for: ${companyName}`);
        const validDomains = [];
        for (const tld of tlds) {
            const domain = `${baseCompanyName}.${tld}`;
            const isValid = await this.isDomainValid(domain);
            if (isValid) {
                validDomains.push(domain);
                this.logger.debug(`Found valid DNS for: ${domain}`);
            }
        }
        if (validDomains.length === 0) {
            this.logger.warn(`Could not infer domain for ${companyName} - no valid TLD variants found`);
            return null;
        }
        if (validDomains.length === 1) {
            this.logger.log(`Successfully inferred domain: ${validDomains[0]} for ${companyName}`);
            return validDomains[0];
        }
        this.logger.debug(`Multiple valid domains found for ${companyName}: ${validDomains.join(', ')}. Checking website accessibility...`);
        for (const domain of validDomains) {
            const isAccessible = await this.isDomainWebsiteAccessible(domain);
            if (isAccessible) {
                this.logger.log(`Successfully inferred domain with working website: ${domain} for ${companyName}`);
                return domain;
            }
        }
        this.logger.log(`No accessible website found, returning first valid domain: ${validDomains[0]} for ${companyName}`);
        return validDomains[0];
    }
    async findCompanyDomainByName(companyName) {
        this.logger.log(`[Strategy 1] Attempting direct domain inference for: ${companyName}`);
        const inferredDomain = await this.inferCompanyDomain(companyName);
        if (inferredDomain) {
            return inferredDomain;
        }
        this.logger.log(`[Strategy 2] Attempting Google search for: ${companyName}`);
        try {
            const query = encodeURIComponent(`${companyName} official website`);
            const url = `https://www.google.com/search?q=${query}`;
            this.logger.debug(`Searching for company domain: ${companyName} via Google`);
            const response = await axios_1.default.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                },
                timeout: 5000,
            });
            const urlPattern = /https?:\/\/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
            const matches = [...response.data.matchAll(urlPattern)];
            if (matches.length > 0) {
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
                    if (excludeDomains.some((d) => domain.includes(d))) {
                        this.logger.debug(`Skipping excluded domain: ${domain}`);
                        continue;
                    }
                    const parts = domain.split('.');
                    if (parts.length > 2) {
                        const lastTwoParts = parts.slice(-2).join('.');
                        const countryTlds = ['co.uk', 'co.in', 'co.jp', 'co.au', 'com.au'];
                        if (!countryTlds.includes(lastTwoParts)) {
                            this.logger.debug(`Skipping subdomain: ${domain}`);
                            continue;
                        }
                    }
                    if (!this.domainMatchesCompanyName(domain, companyName)) {
                        this.logger.debug(`Skipping domain (no name match): ${domain} does not match ${companyName}`);
                        continue;
                    }
                    const isValid = await this.isDomainValid(domain);
                    if (!isValid) {
                        this.logger.debug(`Skipping domain (DNS failed): ${domain}`);
                        continue;
                    }
                    this.logger.log(`Found valid company domain via Google: ${domain} for ${companyName}`);
                    return domain;
                }
            }
            this.logger.warn(`Google search found no suitable company domain for: ${companyName}`);
            return null;
        }
        catch (error) {
            this.logger.warn(`Google search failed for ${companyName}: ${error.message}`);
            return null;
        }
    }
    detectTechStack(headers, html, $, cookies, dnsRecords) {
        const detectedTech = new Map();
        this.detectFromHeaders(headers).forEach((tech) => {
            detectedTech.set(tech.name, tech);
        });
        this.detectFromMeta($).forEach((tech) => {
            detectedTech.set(tech.name, tech);
        });
        this.detectFromScripts($).forEach((tech) => {
            detectedTech.set(tech.name, tech);
        });
        this.detectFromCookies(cookies).forEach((tech) => {
            detectedTech.set(tech.name, tech);
        });
        this.detectFromUrlPatterns(html).forEach((tech) => {
            detectedTech.set(tech.name, tech);
        });
        this.detectFromDns(dnsRecords).forEach((tech) => {
            detectedTech.set(tech.name, tech);
        });
        this.detectFromJsVariables(html).forEach((tech) => {
            detectedTech.set(tech.name, tech);
        });
        const technologies = Array.from(detectedTech.values());
        const techStack = technologies.map((t) => t.name);
        const techStackDetailed = {
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
    detectFromHeaders(headers) {
        const detected = [];
        for (const [headerName, headerValue] of Object.entries(headers)) {
            const headerLower = headerName.toLowerCase();
            const valueLower = String(headerValue).toLowerCase();
            if (tech_detection_patterns_1.HEADER_PATTERNS[headerLower]) {
                for (const pattern of tech_detection_patterns_1.HEADER_PATTERNS[headerLower]) {
                    if (valueLower.includes(pattern.name.toLowerCase())) {
                        detected.push(pattern);
                    }
                }
            }
            if (headerLower === 'x-powered-by') {
                for (const tech of tech_detection_patterns_1.HEADER_PATTERNS['x-powered-by']) {
                    if (valueLower.includes(tech.name.toLowerCase())) {
                        detected.push(tech);
                    }
                }
            }
            if (headerLower === 'server') {
                for (const tech of tech_detection_patterns_1.HEADER_PATTERNS.server) {
                    if (valueLower.includes(tech.name.toLowerCase())) {
                        detected.push(tech);
                    }
                }
            }
        }
        return detected;
    }
    detectFromMeta($) {
        const detected = [];
        const generator = $('meta[name="generator"]').attr('content');
        if (generator) {
            for (const [key, tech] of Object.entries(tech_detection_patterns_1.META_PATTERNS.generator)) {
                if (generator.includes(key)) {
                    detected.push(tech);
                }
            }
        }
        for (const [attrName, tech] of Object.entries(tech_detection_patterns_1.META_ATTRIBUTE_PATTERNS)) {
            if ($(`meta[name="${attrName}"]`).length > 0) {
                detected.push(tech);
            }
        }
        return detected;
    }
    detectFromScripts($) {
        const detected = [];
        const scripts = [];
        $('script[src]').each((i, el) => {
            const src = $(el).attr('src');
            if (src) {
                scripts.push(src);
            }
        });
        for (const scriptSrc of scripts) {
            for (const { pattern, tech } of tech_detection_patterns_1.SCRIPT_PATTERNS) {
                if (pattern.test(scriptSrc)) {
                    detected.push(tech);
                }
            }
        }
        return detected;
    }
    detectFromCookies(cookies) {
        const detected = [];
        for (const cookie of cookies) {
            const cookieName = cookie.split('=')[0].trim();
            for (const { pattern, tech } of tech_detection_patterns_1.COOKIE_PATTERNS) {
                if (pattern.test(cookieName)) {
                    detected.push(tech);
                }
            }
        }
        return detected;
    }
    detectFromUrlPatterns(html) {
        const detected = [];
        for (const { pattern, tech } of tech_detection_patterns_1.URL_PATH_PATTERNS) {
            if (pattern.test(html)) {
                detected.push(tech);
            }
        }
        return detected;
    }
    detectFromDns(dnsRecords) {
        const detected = [];
        if (!dnsRecords.txt)
            return detected;
        for (const txtRecord of dnsRecords.txt) {
            for (const { pattern, tech } of tech_detection_patterns_1.DNS_TXT_PATTERNS) {
                if (pattern.test(txtRecord)) {
                    detected.push(tech);
                }
            }
        }
        return detected;
    }
    detectFromJsVariables(html) {
        const detected = [];
        for (const { pattern, tech } of tech_detection_patterns_1.JS_VARIABLE_PATTERNS) {
            if (pattern.test(html)) {
                detected.push(tech);
            }
        }
        return detected;
    }
    async skipEnrichment(leadId, reason) {
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
    async reEnrichLead(leadId) {
        const lead = await this.prisma.lead.findUnique({
            where: { id: leadId },
        });
        if (!lead) {
            throw new Error(`Lead ${leadId} not found`);
        }
        return this.enrichLead(leadId, lead.email, lead.name || undefined, lead.companyName || undefined);
    }
};
exports.EnrichmentService = EnrichmentService;
exports.EnrichmentService = EnrichmentService = EnrichmentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EnrichmentService);
//# sourceMappingURL=enrichment.service.js.map