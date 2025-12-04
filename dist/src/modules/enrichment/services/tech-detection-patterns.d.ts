export interface TechPattern {
    name: string;
    category: TechCategory;
    confidence: 'high' | 'medium' | 'low';
}
export type TechCategory = 'crm' | 'analytics' | 'marketing' | 'chat' | 'cms' | 'ecommerce' | 'cdn' | 'hosting' | 'payment' | 'development' | 'other';
export declare const HEADER_PATTERNS: Record<string, TechPattern[]>;
export declare const META_PATTERNS: Record<string, Record<string, TechPattern>>;
export declare const META_ATTRIBUTE_PATTERNS: Record<string, TechPattern>;
export declare const SCRIPT_PATTERNS: Array<{
    pattern: RegExp;
    tech: TechPattern;
}>;
export declare const COOKIE_PATTERNS: Array<{
    pattern: RegExp;
    tech: TechPattern;
}>;
export declare const URL_PATH_PATTERNS: Array<{
    pattern: RegExp;
    tech: TechPattern;
}>;
export declare const DNS_TXT_PATTERNS: Array<{
    pattern: RegExp;
    tech: TechPattern;
}>;
export declare const JS_VARIABLE_PATTERNS: Array<{
    pattern: RegExp;
    tech: TechPattern;
}>;
