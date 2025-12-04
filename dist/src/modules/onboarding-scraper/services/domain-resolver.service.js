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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var DomainResolverService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DomainResolverService = void 0;
const common_1 = require("@nestjs/common");
const dns_1 = require("dns");
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const scraper_types_1 = require("../types/scraper.types");
let DomainResolverService = DomainResolverService_1 = class DomainResolverService {
    logger = new common_1.Logger(DomainResolverService_1.name);
    async inferDomain(companyName) {
        if (!companyName || companyName.trim().length === 0) {
            return {
                domain: null,
                confidence: 0,
                method: 'failed',
            };
        }
        this.logger.log(`Inferring domain for company: ${companyName}`);
        const directResult = await this.tryDirectTLDs(companyName);
        if (directResult.domain) {
            return directResult;
        }
        const googleResult = await this.searchGoogleForDomain(companyName);
        if (googleResult.domain) {
            return googleResult;
        }
        return {
            domain: null,
            confidence: 0,
            method: 'failed',
            attemptedDomains: directResult.attemptedDomains,
        };
    }
    async tryDirectTLDs(companyName) {
        const normalizedName = this.normalizeCompanyName(companyName);
        const attemptedDomains = [];
        for (const tld of scraper_types_1.COMMON_TLDS) {
            const domain = `${normalizedName}.${tld}`;
            attemptedDomains.push(domain);
            try {
                const dnsValid = await this.isDomainValidDNS(domain);
                if (!dnsValid) {
                    continue;
                }
                const httpAccessible = await this.isDomainAccessible(domain);
                if (!httpAccessible) {
                    continue;
                }
                const isRealSite = await this.validateRealWebsite(domain);
                if (!isRealSite) {
                    continue;
                }
                this.logger.log(`Successfully resolved domain: ${domain}`);
                return {
                    domain,
                    confidence: this.calculateConfidence(domain, companyName, 'exact_match'),
                    method: 'tld_variation',
                    attemptedDomains,
                };
            }
            catch (error) {
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
    async searchGoogleForDomain(companyName) {
        try {
            const query = encodeURIComponent(`${companyName} official website`);
            const url = `https://www.google.com/search?q=${query}`;
            const response = await axios_1.default.get(url, {
                timeout: scraper_types_1.DEFAULT_SCRAPING_CONFIG.timeout,
                headers: {
                    'User-Agent': scraper_types_1.DEFAULT_SCRAPING_CONFIG.userAgent,
                },
            });
            const $ = cheerio.load(response.data);
            const urlPattern = /https?:\/\/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
            const matches = [...response.data.matchAll(urlPattern)];
            for (const match of matches) {
                const fullUrl = match[0];
                const domain = match[1].replace(/^www\./, '');
                if (this.isExcludedDomain(domain)) {
                    continue;
                }
                if (this.domainMatchesCompanyName(domain, companyName)) {
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
        }
        catch (error) {
            this.logger.warn(`Google search failed: ${error.message}`);
            return {
                domain: null,
                confidence: 0,
                method: 'failed',
            };
        }
    }
    normalizeCompanyName(companyName) {
        return companyName
            .toLowerCase()
            .trim()
            .replace(/\b(inc|llc|ltd|limited|corporation|corp|company|co|pvt|private)\b\.?/gi, '')
            .replace(/[^a-z0-9-]/g, '')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 63);
    }
    async isDomainValidDNS(domain) {
        try {
            await dns_1.promises.resolve(domain, 'A');
            return true;
        }
        catch (error) {
            return false;
        }
    }
    async isDomainAccessible(domain) {
        try {
            const response = await axios_1.default.get(`https://${domain}`, {
                timeout: 5000,
                maxRedirects: 3,
                validateStatus: (status) => status < 500,
                headers: {
                    'User-Agent': scraper_types_1.DEFAULT_SCRAPING_CONFIG.userAgent,
                },
            });
            return response.status >= 200 && response.status < 400;
        }
        catch (error) {
            try {
                const response = await axios_1.default.get(`http://${domain}`, {
                    timeout: 5000,
                    maxRedirects: 3,
                    validateStatus: (status) => status < 500,
                    headers: {
                        'User-Agent': scraper_types_1.DEFAULT_SCRAPING_CONFIG.userAgent,
                    },
                });
                return response.status >= 200 && response.status < 400;
            }
            catch (httpError) {
                return false;
            }
        }
    }
    async validateRealWebsite(domain) {
        try {
            const response = await axios_1.default.get(`https://${domain}`, {
                timeout: 5000,
                headers: {
                    'User-Agent': scraper_types_1.DEFAULT_SCRAPING_CONFIG.userAgent,
                },
            });
            const $ = cheerio.load(response.data);
            const bodyText = $('body').text().toLowerCase();
            const title = $('title').text().toLowerCase();
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
            if (bodyText.length < 500) {
                return false;
            }
            return true;
        }
        catch (error) {
            return false;
        }
    }
    domainMatchesCompanyName(domain, companyName) {
        const domainName = domain.split('.')[0].toLowerCase();
        const normalizedCompany = this.normalizeCompanyName(companyName);
        if (domainName === normalizedCompany) {
            return true;
        }
        if (domainName.includes(normalizedCompany) || normalizedCompany.includes(domainName)) {
            return true;
        }
        const similarity = this.calculateStringSimilarity(domainName, normalizedCompany);
        return similarity > 0.7;
    }
    calculateStringSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        if (longer.length === 0) {
            return 1.0;
        }
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }
    levenshteinDistance(str1, str2) {
        const matrix = [];
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
                }
                else {
                    matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
                }
            }
        }
        return matrix[str2.length][str1.length];
    }
    isExcludedDomain(domain) {
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
    calculateConfidence(domain, companyName, method) {
        let baseConfidence = 0.6;
        if (method === 'exact_match') {
            baseConfidence = 0.9;
        }
        else if (method === 'tld_variation') {
            baseConfidence = 0.85;
        }
        else if (method === 'google_search') {
            baseConfidence = 0.75;
        }
        const domainName = domain.split('.')[0].toLowerCase();
        const normalizedCompany = this.normalizeCompanyName(companyName);
        const similarity = this.calculateStringSimilarity(domainName, normalizedCompany);
        const finalConfidence = Math.min(baseConfidence + (similarity * 0.2), 1.0);
        return Math.round(finalConfidence * 100) / 100;
    }
    parseUserProvidedUrl(input) {
        try {
            let cleaned = input.trim().replace(/^https?:\/\//i, '');
            cleaned = cleaned.replace(/\/$/, '');
            cleaned = cleaned.split('/')[0];
            cleaned = cleaned.replace(/^www\./i, '');
            if (!cleaned.includes('.')) {
                return null;
            }
            const parts = cleaned.split('.');
            if (parts.length < 2 || parts[parts.length - 1].length < 2) {
                return null;
            }
            return cleaned;
        }
        catch (error) {
            return null;
        }
    }
};
exports.DomainResolverService = DomainResolverService;
exports.DomainResolverService = DomainResolverService = DomainResolverService_1 = __decorate([
    (0, common_1.Injectable)()
], DomainResolverService);
//# sourceMappingURL=domain-resolver.service.js.map