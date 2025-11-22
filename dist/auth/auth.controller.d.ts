import { AuthService } from './auth.service';
import { type RegisterDto, type ForgotPasswordDto, type ResetPasswordDto, type VerifyEmailDto, type RefreshTokenDto, type ResendVerificationDto } from './dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto, req: any): Promise<{
        user: any;
        accessToken: string;
        refreshToken: string;
        expiresAt: Date;
        message: string;
    }>;
    login(req: any): Promise<{
        user: any;
        accessToken: string;
        refreshToken: string;
        expiresAt: Date;
    }>;
    refresh(dto: RefreshTokenDto, req: any): Promise<{
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
    logout(dto: RefreshTokenDto): Promise<{
        message: string;
    }>;
    logoutAll(req: any): Promise<{
        message: string;
    }>;
    getMe(req: any): Promise<any>;
    private getIpAddress;
}
