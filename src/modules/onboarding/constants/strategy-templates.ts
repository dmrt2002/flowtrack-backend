/**
 * Unified Workflow Configuration Schema
 *
 * This defines the single unified workflow that all users configure.
 * The workflow is: Form submission → Send email → If no reply for X days, send follow-up → If no booking after Y days, lead fails.
 * Budget qualification is optional and only applies if a numeric field exists.
 */

export interface ConfigFieldValidation {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
}

export interface ConfigField {
  id: string;
  type: 'text' | 'number' | 'textarea' | 'select' | 'checkbox' | 'condition';
  label: string;
  placeholder?: string;
  required: boolean;
  validation?: ConfigFieldValidation;
  options?: Array<{ value: string; label: string }>;
  suffix?: string;
  variables?: string[];
  rows?: number;
  helpText?: string;
  conditionMetadata?: {
    availableFields: string[];
    operators: string[];
    defaultField?: string;
    defaultOperator?: string;
    defaultValue?: number;
    defaultCurrency?: 'USD' | 'INR';
  };
}

export interface ConfigSchema {
  fields: ConfigField[];
}

/**
 * Unified workflow blueprint
 * All users follow the same workflow structure
 */
export const UNIFIED_WORKFLOW_BLUEPRINT = {
  triggerType: 'form_submission',
  steps: [
    {
      nodeType: 'trigger_form',
      action: 'Form submitted',
      description: 'Lead submits intake form',
    },
    {
      nodeType: 'condition',
      action: 'Check qualification (if numeric field exists)',
      description: 'Optional: Check if lead meets qualification criteria',
    },
    {
      nodeType: 'send_email',
      action: 'Send initial email',
      description: 'Send personalized email with booking link',
    },
    {
      nodeType: 'delay',
      action: 'Wait for reply',
      description: 'Monitor for reply for X days',
    },
    {
      nodeType: 'condition',
      action: 'Did they reply?',
      description: 'Check if lead replied to email',
    },
    {
      nodeType: 'send_followup',
      action: 'Send follow-up email',
      description: 'Send follow-up if no reply after X days',
    },
    {
      nodeType: 'delay',
      action: 'Wait for booking',
      description: 'Monitor for booking for Y days',
    },
    {
      nodeType: 'condition',
      action: 'Did they book?',
      description: 'Check if lead booked a meeting',
    },
    {
      nodeType: 'mark_failed',
      action: 'Mark lead as failed',
      description: 'Lead failed if no booking after Y days',
    },
  ],
};

/**
 * Unified configuration schema
 * This is the single schema used for all workflows
 */
export const UNIFIED_CONFIG_SCHEMA: ConfigSchema = {
  fields: [
    {
      id: 'emailTemplate',
      type: 'textarea',
      label: 'What should the first email say?',
      placeholder:
        "Hi {firstName},\n\nThanks for reaching out! I noticed you're interested in [topic]. I'd love to learn more about what you're looking for.\n\nCan you tell me a bit about your current challenges?\n\nBest,\n[Your Name]",
      required: true,
      rows: 8,
      validation: { minLength: 50, maxLength: 1000 },
      variables: ['{firstName}', '{companyName}', '{email}'],
      helpText: 'Keep it conversational and ask an engaging question',
    },
    {
      id: 'qualificationCriteria',
      type: 'condition',
      label: 'What makes a lead qualified? (optional)',
      required: false,
      helpText:
        'Only applies if you have a numeric field in your form (e.g., budget). Leave empty to skip qualification.',
      conditionMetadata: {
        availableFields: [], // Will be populated dynamically from form fields
        operators: ['>', '<', '>=', '<=', '==', '!='],
        defaultField: 'budget',
        defaultOperator: '>',
        defaultValue: 1000,
        defaultCurrency: 'USD',
      },
    },
    {
      id: 'followUpDelayDays',
      type: 'number',
      label: 'Days to wait before sending follow-up',
      placeholder: '3',
      suffix: 'days',
      required: true,
      validation: { min: 1, max: 30 },
      helpText: 'Number of days from last sent email before sending follow-up',
    },
    {
      id: 'followUpTemplate',
      type: 'textarea',
      label: 'Follow-up email template',
      placeholder:
        "Hi {firstName},\n\nI wanted to follow up on my previous email. Are you still interested in learning more about how we can help?\n\nIf so, I'd love to schedule a quick call to discuss your needs and see if we're a good fit.\n\nBest,\n[Your Name]",
      required: true,
      rows: 6,
      validation: { minLength: 30, maxLength: 500 },
      variables: ['{firstName}', '{companyName}'],
      helpText: 'Keep it brief and friendly',
    },
    {
      id: 'bookingDeadlineDays',
      type: 'number',
      label: 'Days before marking lead as failed',
      placeholder: '7',
      suffix: 'days',
      required: true,
      validation: { min: 1, max: 90 },
      helpText:
        'If no booking after this many days, lead will be marked as failed',
    },
  ],
};

/**
 * Legacy strategy templates - kept for backward compatibility
 * New unified workflow uses UNIFIED_CONFIG_SCHEMA and UNIFIED_WORKFLOW_BLUEPRINT
 */
export interface StrategyTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  templateId: string;
  estimatedSetupTime: number;
  features: string[];
  configSchema: ConfigSchema;
  workflowBlueprint: {
    triggerType: string;
    steps: Array<{
      nodeType: string;
      action: string;
      description: string;
    }>;
  };
}

// Legacy templates - deprecated, use UNIFIED_CONFIG_SCHEMA instead
const INBOUND_LEADS_TEMPLATE: StrategyTemplate = {
  id: 'inbound-leads',
  name: 'Inbound Lead Automation',
  description:
    'Automatically respond to leads from your contact form, qualify them, and add to your CRM',
  icon: 'inbox',
  color: '#3B82F6',
  templateId: 'tmpl_inbound_001',
  estimatedSetupTime: 8,
  features: [
    'Auto-respond within minutes',
    'Lead qualification scoring',
    'CRM integration',
    'Email templates',
  ],
  configSchema: {
    fields: [
      {
        id: 'responseTime',
        type: 'number',
        label: 'How quickly should we respond? (minutes)',
        placeholder: '5',
        suffix: 'minutes',
        required: false,
        validation: { min: 1, max: 1440 },
        helpText:
          'Recommended: 5-10 minutes for best conversion rates. Default: 5 minutes',
      },
      {
        id: 'emailSubject',
        type: 'text',
        label: 'Email subject line',
        placeholder: 'Thanks for reaching out {name}',
        required: false,
        validation: { minLength: 5, maxLength: 100 },
        variables: ['{firstName}', '{companyName}'],
        helpText: 'You can use variables like {firstName} to personalize',
      },
      {
        id: 'emailTemplate',
        type: 'textarea',
        label: 'What should the first email say?',
        placeholder:
          "Hi {firstName},\n\nThanks for reaching out! I noticed you're interested in [topic]. I'd love to learn more about what you're looking for.\n\nCan you tell me a bit about your current challenges?\n\nBest,\n[Your Name]",
        required: true,
        rows: 8,
        validation: { minLength: 50, maxLength: 1000 },
        variables: ['{firstName}', '{companyName}', '{email}'],
        helpText: 'Keep it conversational and ask an engaging question',
      },
      {
        id: 'qualificationCriteria',
        type: 'condition',
        label: 'What makes a lead qualified?',
        required: true,
        helpText: 'Qualified leads get priority treatment',
        conditionMetadata: {
          availableFields: ['budget'], // Will be populated dynamically from form fields
          operators: ['>', '<', '>=', '<=', '==', '!='],
          defaultField: 'budget',
          defaultOperator: '>',
          defaultValue: 1000,
          defaultCurrency: 'USD',
        },
      },
    ],
  },
  workflowBlueprint: {
    triggerType: 'form_submission',
    steps: [
      {
        nodeType: 'trigger_form',
        action: 'Monitor contact form submissions',
        description: 'Watch for new leads from your intake email or form',
      },
      {
        nodeType: 'delay',
        action: 'Wait {responseTime} minutes',
        description: 'Brief delay to appear natural, not automated',
      },
      {
        nodeType: 'send_email',
        action: 'Send personalized email',
        description: 'Auto-respond with the template you configured',
      },
      {
        nodeType: 'qualify_lead',
        action: 'Score and qualify lead',
        description: 'Apply qualification criteria and assign score',
      },
      {
        nodeType: 'crm_sync',
        action: 'Add to CRM',
        description: 'Create or update contact in your CRM',
      },
    ],
  },
};

/**
 * STRATEGY 2: Outbound Sales Automation
 * For proactive outreach to prospects and cold email campaigns
 */
const OUTBOUND_SALES_TEMPLATE: StrategyTemplate = {
  id: 'outbound-sales',
  name: 'Outbound Sales Automation',
  description:
    'Reach out to prospects automatically with personalized emails and smart follow-ups',
  icon: 'send',
  color: '#10B981',
  templateId: 'tmpl_outbound_001',
  estimatedSetupTime: 10,
  features: [
    'Personalized outreach',
    'Smart follow-up sequences',
    'Open/click tracking',
    'A/B testing',
  ],
  configSchema: {
    fields: [
      {
        id: 'targetAudience',
        type: 'textarea',
        label: 'Describe your ideal customer profile',
        placeholder:
          'e.g., B2B SaaS companies with 10-50 employees, annual revenue $1M-$10M, using Salesforce',
        required: true,
        rows: 4,
        validation: { minLength: 20, maxLength: 500 },
        helpText: 'This helps tailor your messaging',
      },
      {
        id: 'valueProposition',
        type: 'text',
        label: 'What problem do you solve for them?',
        placeholder: 'e.g., Reduce customer support tickets by 40%',
        required: true,
        validation: { minLength: 10, maxLength: 200 },
        helpText: 'One clear benefit, not a list of features',
      },
      {
        id: 'outreachSubject',
        type: 'text',
        label: 'Email subject line',
        placeholder: "Quick question about {companyName}'s support process",
        required: true,
        validation: { minLength: 5, maxLength: 100 },
        variables: ['{firstName}', '{companyName}', '{industry}'],
        helpText: 'Avoid sales-y words like "free", "opportunity", "demo"',
      },
      {
        id: 'outreachBody',
        type: 'textarea',
        label: 'First outreach email',
        placeholder:
          "Hi {firstName},\n\nI noticed {companyName} is in the {industry} space. I'm curious - how does your team currently handle [specific problem]?\n\nWe help similar companies [value proposition]. Would it make sense to chat for 10 minutes?\n\nBest,\n[Your Name]",
        required: true,
        rows: 8,
        validation: { minLength: 50, maxLength: 800 },
        variables: ['{firstName}', '{companyName}', '{industry}', '{role}'],
        helpText: 'Keep under 150 words, ask a specific question',
      },
      {
        id: 'followUpDelay',
        type: 'number',
        label: 'Days to wait before follow-up',
        placeholder: '3',
        suffix: 'days',
        required: true,
        validation: { min: 1, max: 14 },
        helpText: 'Recommended: 3-4 days',
      },
      {
        id: 'followUpTemplate',
        type: 'textarea',
        label: 'Follow-up email if no response',
        placeholder:
          "Hi {firstName},\n\nI know you're busy! Just wanted to bump this up in your inbox.\n\nStill curious about your approach to [problem]. Worth a quick call?\n\nCheers,\n[Your Name]",
        required: true,
        rows: 6,
        validation: { minLength: 30, maxLength: 500 },
        variables: ['{firstName}', '{companyName}'],
        helpText: 'Keep it brief and friendly, not pushy',
      },
      {
        id: 'maxFollowUps',
        type: 'number',
        label: 'Maximum follow-ups before stopping',
        placeholder: '2',
        suffix: 'follow-ups',
        required: true,
        validation: { min: 0, max: 5 },
        helpText: "Don't be annoying - 2-3 is usually enough",
      },
    ],
  },
  workflowBlueprint: {
    triggerType: 'prospect_added',
    steps: [
      {
        nodeType: 'trigger_prospect',
        action: 'New prospect added to list',
        description: 'Trigger when you add a prospect manually or via import',
      },
      {
        nodeType: 'enrich_prospect',
        action: 'Enrich with company data',
        description: 'Fetch company info (industry, size, etc.)',
      },
      {
        nodeType: 'send_email',
        action: 'Send initial outreach',
        description: 'Personalized first touch with your template',
      },
      {
        nodeType: 'wait_for_reply',
        action: 'Wait for reply',
        description: 'Monitor inbox for {followUpDelay} days',
      },
      {
        nodeType: 'condition',
        action: 'Did they reply?',
        description: 'Branch based on response',
      },
      {
        nodeType: 'send_followup',
        action: 'Send follow-up (if no reply)',
        description: 'Automatic follow-up sequence',
      },
      {
        nodeType: 'notify',
        action: 'Alert you of replies',
        description: 'Notification when prospect responds',
      },
    ],
  },
};

/**
 * STRATEGY 3: Customer Nurture Automation
 * For existing customers - onboarding, engagement, upsells
 */
const CUSTOMER_NURTURE_TEMPLATE: StrategyTemplate = {
  id: 'customer-nurture',
  name: 'Customer Nurture Automation',
  description:
    'Keep customers engaged with automated check-ins, onboarding sequences, and upsell opportunities',
  icon: 'users',
  color: '#8B5CF6',
  templateId: 'tmpl_nurture_001',
  estimatedSetupTime: 9,
  features: [
    'Automated onboarding',
    'Usage-based triggers',
    'Smart upsells',
    'Churn prevention',
  ],
  configSchema: {
    fields: [
      {
        id: 'checkInFrequency',
        type: 'number',
        label: 'Days between check-in emails',
        placeholder: '7',
        suffix: 'days',
        required: true,
        validation: { min: 1, max: 90 },
        helpText: 'Weekly (7 days) is common for new customers',
      },
      {
        id: 'checkInTemplate',
        type: 'textarea',
        label: 'Check-in email template',
        placeholder:
          "Hey {firstName}!\n\nHow are things going with {productName}? I noticed you haven't [specific action] yet.\n\nNeed any help getting started? I'm here if you have questions!\n\nCheers,\n[Your Name]",
        required: true,
        rows: 7,
        validation: { minLength: 50, maxLength: 800 },
        variables: [
          '{firstName}',
          '{companyName}',
          '{daysSinceSignup}',
          '{productName}',
        ],
        helpText: 'Be helpful, not sales-y',
      },
      {
        id: 'upsellTrigger',
        type: 'select',
        label: 'When should we suggest an upgrade?',
        options: [
          { value: 'never', label: "Don't upsell automatically" },
          { value: 'usage', label: 'When they hit usage limits' },
          { value: 'time', label: 'After X days of active use' },
          { value: 'milestone', label: 'When they achieve a milestone' },
        ],
        required: false,
        helpText: 'Timing matters - upsell when they see value',
      },
      {
        id: 'churnSignals',
        type: 'textarea',
        label: 'What signals that a customer might churn?',
        placeholder:
          'e.g., No login in 14 days, dropped below 50% of usual activity, support ticket complaints',
        required: false,
        rows: 4,
        validation: { maxLength: 300 },
        helpText: "We'll monitor these and alert you",
      },
      {
        id: 'winbackTemplate',
        type: 'textarea',
        label: 'Win-back email for inactive customers',
        placeholder:
          "Hi {firstName},\n\nI noticed you haven't been using {productName} lately. Everything okay?\n\nIf there's something we can improve or if you're stuck, I'd love to help.\n\nBest,\n[Your Name]",
        required: false,
        rows: 6,
        validation: { maxLength: 700 },
        variables: ['{firstName}', '{daysSinceLastLogin}', '{productName}'],
        helpText: "Genuine concern, offer help, don't guilt trip",
      },
    ],
  },
  workflowBlueprint: {
    triggerType: 'customer_lifecycle',
    steps: [
      {
        nodeType: 'trigger_customer',
        action: 'Customer enters segment',
        description: 'Trigger on signup, trial start, or segment change',
      },
      {
        nodeType: 'delay',
        action: 'Wait for onboarding period',
        description: 'Give them time to explore (e.g., 24 hours)',
      },
      {
        nodeType: 'check_activity',
        action: 'Did they complete onboarding goal?',
        description: 'Check if they achieved the key milestone',
      },
      {
        nodeType: 'condition',
        action: 'Branch based on completion',
        description: 'Different paths for active vs. inactive',
      },
      {
        nodeType: 'send_email',
        action: 'Send check-in or reminder',
        description: 'Personalized message based on their behavior',
      },
      {
        nodeType: 'monitor_usage',
        action: 'Track usage patterns',
        description: 'Watch for upsell triggers or churn signals',
      },
      {
        nodeType: 'smart_action',
        action: 'Upsell or win-back',
        description: 'Automatic upgrade offer or retention outreach',
      },
    ],
  },
};

/**
 * STRATEGY 4: The Gatekeeper (Filter & Qualify)
 * For filtering low-budget leads and scheduling high-value ones
 */
const GATEKEEPER_TEMPLATE: StrategyTemplate = {
  id: 'gatekeeper',
  name: 'The Gatekeeper',
  description: 'Reject low budgets. Schedule high-value leads.',
  icon: 'shield',
  color: '#3b82f6',
  templateId: 'tmpl_gatekeeper_001',
  estimatedSetupTime: 5,
  features: [
    'Saves 10 hours/week on unqualified calls',
    '80% increase in meeting quality',
    'One-click budget threshold setup',
  ],
  configSchema: {
    fields: [
      {
        id: 'budgetThreshold',
        type: 'number',
        label: 'Minimum budget threshold',
        placeholder: '2000',
        suffix: 'USD',
        required: true,
        validation: { min: 0 },
        helpText: 'Leads below this amount will receive a polite decline',
      },
      {
        id: 'declineEmailSubject',
        type: 'text',
        label: 'Decline email subject',
        placeholder: 'Thank you for your interest',
        required: true,
        validation: { minLength: 5, maxLength: 100 },
      },
      {
        id: 'declineEmailBody',
        type: 'textarea',
        label: 'Polite decline email',
        placeholder:
          'Thank you for reaching out. Unfortunately, we focus on projects with budgets of $X or higher...',
        required: true,
        rows: 6,
        validation: { minLength: 50, maxLength: 500 },
      },
      {
        id: 'bookingUrl',
        type: 'text',
        label: 'Calendly booking link',
        placeholder: 'https://calendly.com/your-link',
        required: true,
        validation: { pattern: '^https?://.*' },
        helpText: 'High-value leads will be sent here',
      },
    ],
  },
  workflowBlueprint: {
    triggerType: 'form_submission',
    steps: [
      {
        nodeType: 'trigger_form',
        action: 'Form submitted',
        description: 'Lead submits intake form',
      },
      {
        nodeType: 'condition',
        action: 'Budget ≥ $X?',
        description: 'Check if budget meets threshold',
      },
      {
        nodeType: 'send_email',
        action: 'Send booking link (if qualified)',
        description: 'Send Calendly link to high-value leads',
      },
      {
        nodeType: 'send_email',
        action: 'Send polite decline (if not qualified)',
        description: 'Send decline email to low-budget leads',
      },
    ],
  },
};

/**
 * STRATEGY 5: The Nurturer (Long-Term Follow Up)
 * 5-email drip sequence for warm leads
 */
const NURTURER_TEMPLATE: StrategyTemplate = {
  id: 'nurturer',
  name: 'The Nurturer',
  description: '5-email drip sequence for warm leads.',
  icon: 'sprout',
  color: '#10b981',
  templateId: 'tmpl_nurturer_001',
  estimatedSetupTime: 8,
  features: [
    'Automates relationship-building',
    '3× higher conversion over 30 days',
    'Template emails included',
  ],
  configSchema: {
    fields: [
      {
        id: 'firstEmailDelay',
        type: 'number',
        label: 'Days before first email',
        placeholder: '3',
        suffix: 'days',
        required: true,
        validation: { min: 1, max: 30 },
      },
      {
        id: 'emailSequence',
        type: 'textarea',
        label: 'Email sequence overview',
        placeholder:
          'Email 1: Welcome, Email 2: Value prop, Email 3: Case study...',
        required: true,
        rows: 6,
        validation: { minLength: 50 },
        helpText: 'Describe your 5-email sequence',
      },
    ],
  },
  workflowBlueprint: {
    triggerType: 'form_submission',
    steps: [
      {
        nodeType: 'trigger_form',
        action: 'Form submitted',
        description: 'Lead submits intake form',
      },
      {
        nodeType: 'delay',
        action: 'Wait 3 days',
        description: 'Initial delay before first email',
      },
      {
        nodeType: 'send_email',
        action: 'Send Email 1',
        description: 'First email in sequence',
      },
      {
        nodeType: 'delay',
        action: 'Wait 3 days',
        description: 'Delay before next email',
      },
      {
        nodeType: 'send_email',
        action: 'Send Email 2',
        description: 'Second email in sequence',
      },
      {
        nodeType: 'delay',
        action: 'Wait 3 days',
        description: 'Continue sequence...',
      },
      {
        nodeType: 'send_email',
        action: 'Send Email 3-5',
        description: 'Remaining emails in sequence',
      },
    ],
  },
};

/**
 * STRATEGY 6: The Closer (Speed to Call)
 * Direct booking focus, strike while hot
 */
const CLOSER_TEMPLATE: StrategyTemplate = {
  id: 'closer',
  name: 'The Closer',
  description: 'Direct booking focus. Strike while hot.',
  icon: 'lightning',
  color: '#8b5cf6',
  templateId: 'tmpl_closer_001',
  estimatedSetupTime: 5,
  features: [
    'Books calls within 5 minutes',
    '90% show-up rate',
    'Instant Calendly integration',
  ],
  configSchema: {
    fields: [
      {
        id: 'bookingUrl',
        type: 'text',
        label: 'Calendly booking link',
        placeholder: 'https://calendly.com/your-link',
        required: true,
        validation: { pattern: '^https?://.*' },
      },
      {
        id: 'reminderEmailSubject',
        type: 'text',
        label: 'Reminder email subject',
        placeholder: 'Reminder: Your call tomorrow',
        required: true,
        validation: { minLength: 5, maxLength: 100 },
      },
      {
        id: 'reminderEmailBody',
        type: 'textarea',
        label: 'Reminder email template',
        placeholder:
          'Hi {firstName}, just a reminder about our call tomorrow at {time}...',
        required: true,
        rows: 6,
        validation: { minLength: 50, maxLength: 500 },
      },
    ],
  },
  workflowBlueprint: {
    triggerType: 'form_submission',
    steps: [
      {
        nodeType: 'trigger_form',
        action: 'Form submitted',
        description: 'Lead submits intake form',
      },
      {
        nodeType: 'send_email',
        action: 'Send Calendly link',
        description: 'Immediately send booking link',
      },
      {
        nodeType: 'delay',
        action: 'Wait 1 day before call',
        description: 'Delay before reminder',
      },
      {
        nodeType: 'send_email',
        action: 'Send reminder email',
        description: 'Remind about upcoming call',
      },
    ],
  },
};

/**
 * Exported map of all strategy templates
 */
export const STRATEGY_TEMPLATES: Record<string, StrategyTemplate> = {
  'inbound-leads': INBOUND_LEADS_TEMPLATE,
  'outbound-sales': OUTBOUND_SALES_TEMPLATE,
  'customer-nurture': CUSTOMER_NURTURE_TEMPLATE,
  gatekeeper: GATEKEEPER_TEMPLATE,
  nurturer: NURTURER_TEMPLATE,
  closer: CLOSER_TEMPLATE,
};

/**
 * Valid strategy IDs
 */
export type StrategyId =
  | 'inbound-leads'
  | 'outbound-sales'
  | 'customer-nurture'
  | 'gatekeeper'
  | 'nurturer'
  | 'closer';

/**
 * Helper to get template by ID
 */
export function getStrategyTemplate(id: string): StrategyTemplate | null {
  return STRATEGY_TEMPLATES[id] || null;
}

/**
 * Helper to get all templates as array
 */
export function getAllStrategyTemplates(): StrategyTemplate[] {
  return Object.values(STRATEGY_TEMPLATES);
}

/**
 * Validate strategy ID
 */
export function isValidStrategyId(id: string): id is StrategyId {
  return id in STRATEGY_TEMPLATES;
}
