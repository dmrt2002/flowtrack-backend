import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { type RegisterDto, type LoginDto, type ForgotPasswordDto, type ResetPasswordDto, type VerifyEmailDto, type ResendVerificationDto } from './dto';
export declare class AuthController {
    private authService;
    private configService;
    private readonly logger;
    constructor(authService: AuthService, configService: ConfigService);
    register(dto: RegisterDto, req: any, response: Response): Promise<{
        message: string;
        email: string;
    }>;
    login(dto: LoginDto, req: any, response: Response): Promise<{
        user: any;
        accessToken: string;
        refreshToken: string;
        expiresAt: Date;
    }>;
    forgotPassword(dto: ForgotPasswordDto): Promise<{
        message: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
    verifyEmail(query: VerifyEmailDto, req: any, response: Response): Promise<void>;
    resendVerification(dto: ResendVerificationDto): Promise<{
        message: string;
    }>;
    logout(req: any, response: Response): Promise<{
        message: string;
    }>;
    logoutAll(req: any, response: Response): Promise<{
        message: string;
    }>;
    googleRedirect(): Promise<void>;
    googleCallback(req: any, response: Response): Promise<void>;
    getMe(req: any, response: Response): Promise<any>;
    private getIpAddress;
}
