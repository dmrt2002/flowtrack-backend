import type { Response } from 'express';
import { OAuthService } from './oauth.service';
export declare class OAuthController {
    private readonly oauthService;
    constructor(oauthService: OAuthService);
    initiateGmailOAuth(user: any): {
        success: boolean;
        message: string;
        data: {
            authUrl: string;
        };
    };
    handleGmailCallback(code: string, user: any, res: Response): Promise<Response<any, Record<string, any>>>;
}
