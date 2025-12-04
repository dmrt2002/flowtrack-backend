/**
 * Tech Stack Detection Patterns
 * Zero-cost technology detection using HTTP headers, HTML, scripts, cookies, DNS
 */

export interface TechPattern {
  name: string;
  category: TechCategory;
  confidence: 'high' | 'medium' | 'low';
}

export type TechCategory =
  | 'crm'
  | 'analytics'
  | 'marketing'
  | 'chat'
  | 'cms'
  | 'ecommerce'
  | 'cdn'
  | 'hosting'
  | 'payment'
  | 'development'
  | 'other';

/**
 * HTTP Header Detection Patterns
 */
export const HEADER_PATTERNS: Record<string, TechPattern[]> = {
  // Powered-By headers
  'x-powered-by': [
    { name: 'Express.js', category: 'development', confidence: 'high' },
    { name: 'ASP.NET', category: 'development', confidence: 'high' },
    { name: 'PHP', category: 'development', confidence: 'high' },
    { name: 'Next.js', category: 'development', confidence: 'high' },
  ],

  // Server headers
  server: [
    { name: 'Cloudflare', category: 'cdn', confidence: 'high' },
    { name: 'Nginx', category: 'hosting', confidence: 'high' },
    { name: 'Apache', category: 'hosting', confidence: 'high' },
    { name: 'Microsoft-IIS', category: 'hosting', confidence: 'high' },
  ],

  // Platform-specific headers
  'cf-ray': [{ name: 'Cloudflare', category: 'cdn', confidence: 'high' }],
  'x-shopify-stage': [
    { name: 'Shopify', category: 'ecommerce', confidence: 'high' },
  ],
  'x-wix-renderer-server': [
    { name: 'Wix', category: 'cms', confidence: 'high' },
  ],
  'x-vercel-id': [{ name: 'Vercel', category: 'hosting', confidence: 'high' }],
  'x-amz-cf-id': [
    { name: 'AWS CloudFront', category: 'cdn', confidence: 'high' },
  ],
  'x-nf-request-id': [
    { name: 'Netlify', category: 'hosting', confidence: 'high' },
  ],
};

/**
 * Meta Tag Detection Patterns
 */
export const META_PATTERNS: Record<string, Record<string, TechPattern>> = {
  generator: {
    WordPress: { name: 'WordPress', category: 'cms', confidence: 'high' },
    Drupal: { name: 'Drupal', category: 'cms', confidence: 'high' },
    Joomla: { name: 'Joomla', category: 'cms', confidence: 'high' },
    Shopify: { name: 'Shopify', category: 'ecommerce', confidence: 'high' },
    Wix: { name: 'Wix', category: 'cms', confidence: 'high' },
    Squarespace: {
      name: 'Squarespace',
      category: 'cms',
      confidence: 'high',
    },
    Webflow: { name: 'Webflow', category: 'cms', confidence: 'high' },
    Ghost: { name: 'Ghost', category: 'cms', confidence: 'high' },
    Hugo: { name: 'Hugo', category: 'cms', confidence: 'high' },
    Jekyll: { name: 'Jekyll', category: 'cms', confidence: 'high' },
    Contentful: { name: 'Contentful', category: 'cms', confidence: 'high' },
  },
};

export const META_ATTRIBUTE_PATTERNS: Record<string, TechPattern> = {
  'shopify-checkout-api-token': {
    name: 'Shopify',
    category: 'ecommerce',
    confidence: 'high',
  },
  'google-site-verification': {
    name: 'Google Services',
    category: 'other',
    confidence: 'medium',
  },
};

/**
 * Script Source URL Detection Patterns
 */
export const SCRIPT_PATTERNS: Array<{
  pattern: RegExp;
  tech: TechPattern;
}> = [
  // Analytics
  {
    pattern: /google-analytics\.com\/analytics\.js/,
    tech: {
      name: 'Google Analytics (Universal)',
      category: 'analytics',
      confidence: 'high',
    },
  },
  {
    pattern: /googletagmanager\.com\/gtag\/js/,
    tech: { name: 'Google Analytics 4', category: 'analytics', confidence: 'high' },
  },
  {
    pattern: /googletagmanager\.com\/gtm\.js/,
    tech: {
      name: 'Google Tag Manager',
      category: 'analytics',
      confidence: 'high',
    },
  },
  {
    pattern: /cdn\.segment\.(com|io)/,
    tech: { name: 'Segment', category: 'analytics', confidence: 'high' },
  },
  {
    pattern: /cdn\.mxpnl\.com/,
    tech: { name: 'Mixpanel', category: 'analytics', confidence: 'high' },
  },
  {
    pattern: /cdn\.amplitude\.com/,
    tech: { name: 'Amplitude', category: 'analytics', confidence: 'high' },
  },
  {
    pattern: /static\.hotjar\.com/,
    tech: { name: 'Hotjar', category: 'analytics', confidence: 'high' },
  },
  {
    pattern: /cdn\.heapanalytics\.com/,
    tech: { name: 'Heap Analytics', category: 'analytics', confidence: 'high' },
  },

  // Chat/Support
  {
    pattern: /widget\.intercom\.io/,
    tech: { name: 'Intercom', category: 'chat', confidence: 'high' },
  },
  {
    pattern: /js\.driftt\.com/,
    tech: { name: 'Drift', category: 'chat', confidence: 'high' },
  },
  {
    pattern: /static\.zdassets\.com/,
    tech: { name: 'Zendesk', category: 'chat', confidence: 'high' },
  },
  {
    pattern: /client\.crisp\.chat/,
    tech: { name: 'Crisp', category: 'chat', confidence: 'high' },
  },
  {
    pattern: /code\.tidio\.co/,
    tech: { name: 'Tidio', category: 'chat', confidence: 'high' },
  },
  {
    pattern: /cdn\.livechatinc\.com/,
    tech: { name: 'LiveChat', category: 'chat', confidence: 'high' },
  },

  // CRM/Marketing
  {
    pattern: /js\.hs-(scripts|analytics)\.net/,
    tech: { name: 'HubSpot', category: 'crm', confidence: 'high' },
  },
  {
    pattern: /js\.hs-scripts\.com/,
    tech: { name: 'HubSpot', category: 'crm', confidence: 'high' },
  },
  {
    pattern: /pi\.pardot\.com/,
    tech: {
      name: 'Salesforce Pardot',
      category: 'marketing',
      confidence: 'high',
    },
  },
  {
    pattern: /mktdns\.com/,
    tech: { name: 'Marketo', category: 'marketing', confidence: 'high' },
  },
  {
    pattern: /assets\.calendly\.com/,
    tech: { name: 'Calendly', category: 'marketing', confidence: 'high' },
  },

  // CDN/Infrastructure
  {
    pattern: /cloudflare\.com/,
    tech: { name: 'Cloudflare', category: 'cdn', confidence: 'medium' },
  },
  {
    pattern: /fastly\.net/,
    tech: { name: 'Fastly', category: 'cdn', confidence: 'high' },
  },
  {
    pattern: /akamai\.net/,
    tech: { name: 'Akamai', category: 'cdn', confidence: 'high' },
  },

  // Payment
  {
    pattern: /js\.stripe\.com/,
    tech: { name: 'Stripe', category: 'payment', confidence: 'high' },
  },
  {
    pattern: /paypal\.com\/sdk/,
    tech: { name: 'PayPal', category: 'payment', confidence: 'high' },
  },
  {
    pattern: /square\.com\/v2\/square\.js/,
    tech: { name: 'Square', category: 'payment', confidence: 'high' },
  },

  // Error Tracking
  {
    pattern: /browser\.sentry-cdn\.com/,
    tech: { name: 'Sentry', category: 'development', confidence: 'high' },
  },
  {
    pattern: /d2wy8f7a9ursnm\.cloudfront\.net/,
    tech: { name: 'Bugsnag', category: 'development', confidence: 'high' },
  },
];

/**
 * Cookie Name Detection Patterns
 */
export const COOKIE_PATTERNS: Array<{
  pattern: RegExp;
  tech: TechPattern;
}> = [
  // HubSpot
  {
    pattern: /^__hs(sc|tc|src|fp)/,
    tech: { name: 'HubSpot', category: 'crm', confidence: 'high' },
  },
  {
    pattern: /^hubspotutk$/,
    tech: { name: 'HubSpot', category: 'crm', confidence: 'high' },
  },

  // Google Analytics
  {
    pattern: /^_ga(_.*)?$/,
    tech: { name: 'Google Analytics', category: 'analytics', confidence: 'high' },
  },
  {
    pattern: /^_gid$/,
    tech: { name: 'Google Analytics', category: 'analytics', confidence: 'high' },
  },

  // Salesforce/Pardot
  {
    pattern: /^visitor_id\d+$/,
    tech: {
      name: 'Salesforce Pardot',
      category: 'marketing',
      confidence: 'high',
    },
  },
  {
    pattern: /^pardot$/,
    tech: {
      name: 'Salesforce Pardot',
      category: 'marketing',
      confidence: 'high',
    },
  },

  // WordPress
  {
    pattern: /^wordpress_/,
    tech: { name: 'WordPress', category: 'cms', confidence: 'high' },
  },
  {
    pattern: /^wp-settings-/,
    tech: { name: 'WordPress', category: 'cms', confidence: 'high' },
  },

  // Shopify
  {
    pattern: /^_shopify_/,
    tech: { name: 'Shopify', category: 'ecommerce', confidence: 'high' },
  },
  {
    pattern: /^cart$/,
    tech: { name: 'Shopify', category: 'ecommerce', confidence: 'medium' },
  },

  // Marketo
  {
    pattern: /^_mkto_trk$/,
    tech: { name: 'Marketo', category: 'marketing', confidence: 'high' },
  },

  // Cloudflare
  {
    pattern: /^__cf(duid|_bm)$/,
    tech: { name: 'Cloudflare', category: 'cdn', confidence: 'high' },
  },

  // Intercom
  {
    pattern: /^intercom-/,
    tech: { name: 'Intercom', category: 'chat', confidence: 'high' },
  },
];

/**
 * URL Path Detection Patterns
 */
export const URL_PATH_PATTERNS: Array<{
  pattern: RegExp;
  tech: TechPattern;
}> = [
  // WordPress
  {
    pattern: /\/wp-(content|includes|admin|json)\//,
    tech: { name: 'WordPress', category: 'cms', confidence: 'high' },
  },

  // Drupal
  {
    pattern: /\/(sites\/default|modules)\//,
    tech: { name: 'Drupal', category: 'cms', confidence: 'medium' },
  },

  // Joomla
  {
    pattern: /\/administrator\//,
    tech: { name: 'Joomla', category: 'cms', confidence: 'medium' },
  },

  // E-commerce
  {
    pattern: /\/wc-ajax\//,
    tech: { name: 'WooCommerce', category: 'ecommerce', confidence: 'high' },
  },
  {
    pattern: /\/magento\//,
    tech: { name: 'Magento', category: 'ecommerce', confidence: 'high' },
  },

  // Frameworks
  {
    pattern: /\/_next\//,
    tech: { name: 'Next.js', category: 'development', confidence: 'high' },
  },
  {
    pattern: /\/_nuxt\//,
    tech: { name: 'Nuxt.js', category: 'development', confidence: 'high' },
  },
  {
    pattern: /\/___gatsby\//,
    tech: { name: 'Gatsby', category: 'development', confidence: 'high' },
  },

  // CDN
  {
    pattern: /\.cloudfront\.net/,
    tech: { name: 'AWS CloudFront', category: 'cdn', confidence: 'high' },
  },
  {
    pattern: /\.fastly\.net/,
    tech: { name: 'Fastly', category: 'cdn', confidence: 'high' },
  },
];

/**
 * DNS TXT Record Detection Patterns
 */
export const DNS_TXT_PATTERNS: Array<{
  pattern: RegExp;
  tech: TechPattern;
}> = [
  // Verification tokens
  {
    pattern: /hubspot-developer-verification/,
    tech: { name: 'HubSpot', category: 'crm', confidence: 'high' },
  },
  {
    pattern: /pardot/,
    tech: {
      name: 'Salesforce Pardot',
      category: 'marketing',
      confidence: 'high',
    },
  },
  {
    pattern: /salesforce-site-verification/,
    tech: { name: 'Salesforce', category: 'crm', confidence: 'high' },
  },
  {
    pattern: /zoho-verification/,
    tech: { name: 'Zoho CRM', category: 'crm', confidence: 'high' },
  },
  {
    pattern: /marketo-verification/,
    tech: { name: 'Marketo', category: 'marketing', confidence: 'high' },
  },
  {
    pattern: /mixpanel-domain-verify/,
    tech: { name: 'Mixpanel', category: 'analytics', confidence: 'high' },
  },
  {
    pattern: /stripe-verification/,
    tech: { name: 'Stripe', category: 'payment', confidence: 'high' },
  },
  {
    pattern: /docker-verification/,
    tech: { name: 'Docker', category: 'development', confidence: 'high' },
  },

  // SPF includes
  {
    pattern: /include:_spf\.salesforce\.com/,
    tech: {
      name: 'Salesforce Marketing Cloud',
      category: 'marketing',
      confidence: 'high',
    },
  },
  {
    pattern: /include:servers\.mcsv\.net/,
    tech: { name: 'MailChimp', category: 'marketing', confidence: 'high' },
  },
  {
    pattern: /include:sendgrid\.net/,
    tech: { name: 'SendGrid', category: 'marketing', confidence: 'high' },
  },
  {
    pattern: /include:spf\.mtasv\.net/,
    tech: { name: 'MailerSend', category: 'marketing', confidence: 'high' },
  },
  {
    pattern: /include:_spf\.sendinblue\.com/,
    tech: { name: 'Sendinblue', category: 'marketing', confidence: 'high' },
  },
  {
    pattern: /include:amazonses\.com/,
    tech: { name: 'AWS SES', category: 'marketing', confidence: 'high' },
  },
  {
    pattern: /include:_spf\.google\.com/,
    tech: {
      name: 'Google Workspace',
      category: 'other',
      confidence: 'high',
    },
  },
  {
    pattern: /include:spf\.protection\.outlook\.com/,
    tech: { name: 'Microsoft 365', category: 'other', confidence: 'high' },
  },
];

/**
 * Window/JavaScript Variable Patterns (detectable via inline script search)
 */
export const JS_VARIABLE_PATTERNS: Array<{
  pattern: RegExp;
  tech: TechPattern;
}> = [
  // Analytics
  {
    pattern: /window\.(ga|_gaq)\s*=/,
    tech: { name: 'Google Analytics', category: 'analytics', confidence: 'high' },
  },
  {
    pattern: /window\.gtag\s*=/,
    tech: { name: 'Google Analytics 4', category: 'analytics', confidence: 'high' },
  },
  {
    pattern: /window\.analytics\s*=/,
    tech: { name: 'Segment', category: 'analytics', confidence: 'high' },
  },
  {
    pattern: /window\.mixpanel\s*=/,
    tech: { name: 'Mixpanel', category: 'analytics', confidence: 'high' },
  },
  {
    pattern: /window\.amplitude\s*=/,
    tech: { name: 'Amplitude', category: 'analytics', confidence: 'high' },
  },

  // Chat
  {
    pattern: /window\.Intercom\s*=/,
    tech: { name: 'Intercom', category: 'chat', confidence: 'high' },
  },
  {
    pattern: /window\.drift\s*=/,
    tech: { name: 'Drift', category: 'chat', confidence: 'high' },
  },
  {
    pattern: /window\.zE\s*=/,
    tech: { name: 'Zendesk', category: 'chat', confidence: 'high' },
  },

  // CRM/Marketing
  {
    pattern: /window\._hsq\s*=/,
    tech: { name: 'HubSpot', category: 'crm', confidence: 'high' },
  },
  {
    pattern: /window\.Calendly\s*=/,
    tech: { name: 'Calendly', category: 'marketing', confidence: 'high' },
  },

  // E-commerce
  {
    pattern: /window\.Shopify\s*=/,
    tech: { name: 'Shopify', category: 'ecommerce', confidence: 'high' },
  },
  {
    pattern: /window\.dataLayer\s*=/,
    tech: {
      name: 'Google Tag Manager',
      category: 'analytics',
      confidence: 'high',
    },
  },
];
