import { UserService } from './user.service';
import { type UpdateProfileDto, type ChangePasswordDto } from './dto';
export declare class UserController {
    private readonly userService;
    constructor(userService: UserService);
    getProfile(req: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        firstName: string | null;
        lastName: string | null;
        avatarUrl: string | null;
        authProvider: import("@prisma/client").$Enums.AuthProvider;
        emailVerifiedAt: Date | null;
        hasCompletedOnboarding: boolean;
    }>;
    updateProfile(req: any, dto: UpdateProfileDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        firstName: string | null;
        lastName: string | null;
        avatarUrl: string | null;
        authProvider: import("@prisma/client").$Enums.AuthProvider;
        emailVerifiedAt: Date | null;
        hasCompletedOnboarding: boolean;
    }>;
    changePassword(req: any, dto: ChangePasswordDto): Promise<{
        success: boolean;
        message: string;
    }>;
    getConnectedAccounts(req: any): Promise<{
        id: string;
        providerType: import("@prisma/client").$Enums.OAuthProviderType;
        providerEmail: string | null;
        isActive: boolean;
        createdAt: Date;
    }[]>;
    disconnectOAuthAccount(req: any, credentialId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    deleteAccount(req: any): Promise<{
        success: boolean;
        message: string;
    }>;
}
