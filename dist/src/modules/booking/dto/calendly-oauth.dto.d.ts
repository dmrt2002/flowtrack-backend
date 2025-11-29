export declare class CalendlyOAuthCallbackDto {
    code: string;
    state: string;
}
export declare class CalendlyWebhookDto {
    event: string;
    payload: {
        event: string;
        time: string;
        uri: string;
        event_type: {
            uuid: string;
            name: string;
            duration: number;
            slug: string;
        };
        invitee: {
            uuid: string;
            email: string;
            name: string;
            timezone: string;
            uri: string;
            created_at: string;
            updated_at: string;
            reschedule_url?: string;
            cancel_url?: string;
        };
        questions_and_answers?: Array<{
            question: string;
            answer: string;
            position: number;
        }>;
        tracking?: {
            utm_campaign?: string;
            utm_source?: string;
            utm_medium?: string;
            utm_content?: string;
            utm_term?: string;
            salesforce_uuid?: string;
        };
        cancellation?: {
            canceled_by: string;
            reason?: string;
        };
    };
}
