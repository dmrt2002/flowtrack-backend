"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMMON_TLDS = exports.CONFIDENCE_THRESHOLDS = exports.DEFAULT_SCRAPING_CONFIG = void 0;
exports.DEFAULT_SCRAPING_CONFIG = {
    timeout: 10000,
    maxRetries: 2,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    followRedirects: true,
    validateSSL: true,
};
exports.CONFIDENCE_THRESHOLDS = {
    HIGH: 0.8,
    MEDIUM: 0.6,
    LOW: 0.4,
    MINIMUM: 0.3,
};
exports.COMMON_TLDS = [
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
//# sourceMappingURL=scraper.types.js.map