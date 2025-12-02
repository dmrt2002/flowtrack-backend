import type { Response } from 'express';
import { OAuthService } from './oauth.service';
import { ConfigService } from '@nestjs/config';
export declare class OAuthController {
    private readonly oauthService;
    private readonly configService;
    constructor(oauthService: OAuthService, configService: ConfigService);
    initiateGmailOAuth(user: any, workspaceId: string, res: Response): void | Response<any, Record<string, any>>;
    handleGmailCallback(code: string, state: string, user: any, res: Response): Promise<void | Response<any, Record<string, any>>>;
    getGmailConnectionStatus(workspaceId: string, user: any): Promise<{
        success: boolean;
        data: {
            connected: boolean;
            email: string | null;
            lastUsedAt: Date | null;
        };
    }>;
    private sendPopupError;
}
