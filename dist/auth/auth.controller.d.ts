import type { Response } from 'express';
import { AuthService } from './auth.service';
import { type RegisterDto, type LoginDto, type ForgotPasswordDto, type ResetPasswordDto, type VerifyEmailDto, type ResendVerificationDto } from './dto';
export declare class AuthController {
    private authService;
    private readonly logger;
    constructor(authService: AuthService);
    register(dto: RegisterDto, req: any, response: Response): Promise<{
        user: any;
        accessToken: string;
        refreshToken: string;
        expiresAt: Date;
        message: string;
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
    verifyEmail(query: VerifyEmailDto): Promise<{
        message: string;
    }>;
    resendVerification(dto: ResendVerificationDto): Promise<{
        message: string;
    }>;
    logout(req: any, response: Response): Promise<{
        message: string;
    }>;
    logoutAll(req: any, response: Response): Promise<{
        message: string;
    }>;
    getMe(req: any): Promise<any>;
    private getIpAddress;
}
