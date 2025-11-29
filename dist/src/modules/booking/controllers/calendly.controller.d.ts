import { CalendlyService } from '../services/calendly.service';
import { OAuthStateManagerService } from '../services/oauth-state-manager.service';
import type { Response } from 'express';
export declare class CalendlyController {
    private calendlyService;
    private oauthStateManager;
    constructor(calendlyService: CalendlyService, oauthStateManager: OAuthStateManagerService);
    authorize(workspaceId: string, req: any, res: Response): void;
    callback(code: string, userId: string, res: Response): Promise<void>;
    webhook(credentialId: string, signature: string, payload: any): Promise<{
        message: string;
    }>;
    poll(credentialId: string): Promise<{
        eventsFetched: number;
        eventsCreated: number;
        eventsUpdated: number;
    }>;
    getConnectionStatus(workspaceId: string): Promise<{
        success: boolean;
        data: {
            connected: boolean;
            email?: undefined;
            plan?: undefined;
            webhookEnabled?: undefined;
            pollingEnabled?: undefined;
        };
    } | {
        success: boolean;
        data: {
            connected: boolean;
            email: string | null;
            plan: string | null;
            webhookEnabled: boolean;
            pollingEnabled: boolean;
        };
    }>;
    disconnect(workspaceId: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
