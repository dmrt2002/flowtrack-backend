import { WorkspaceService } from './workspace.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import type { UserPayload } from '../auth/decorators/user.decorator';
import { AuthService } from '../auth/auth.service';
export declare class WorkspaceController {
    private readonly workspaceService;
    private readonly authService;
    constructor(workspaceService: WorkspaceService, authService: AuthService);
    getUserWorkspaces(userPayload: UserPayload): Promise<{
        role: import("@prisma/client").$Enums.WorkspaceMemberRole;
        membershipId: string;
        id: string;
        createdAt: Date;
        name: string;
        isActive: boolean;
        deletedAt: Date | null;
        updatedAt: Date;
        slug: string;
        intakeEmailId: string;
        ownerUserId: string;
        timezone: string;
        settings: import("@prisma/client/runtime/library").JsonValue;
    }[]>;
    createWorkspace(userPayload: UserPayload, createWorkspaceDto: CreateWorkspaceDto): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        isActive: boolean;
        deletedAt: Date | null;
        updatedAt: Date;
        slug: string;
        intakeEmailId: string;
        ownerUserId: string;
        timezone: string;
        settings: import("@prisma/client/runtime/library").JsonValue;
    }>;
    getWorkspaceById(userPayload: UserPayload, id: string): Promise<{
        role: import("@prisma/client").$Enums.WorkspaceMemberRole;
        members: ({
            user: {
                id: string;
                email: string;
                firstName: string | null;
                lastName: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            userId: string;
            isActive: boolean;
            deletedAt: Date | null;
            updatedAt: Date;
            role: import("@prisma/client").$Enums.WorkspaceMemberRole;
            workspaceId: string;
            permissions: import("@prisma/client/runtime/library").JsonValue;
            invitedByUserId: string | null;
            invitedAt: Date | null;
            joinedAt: Date | null;
        })[];
        id: string;
        createdAt: Date;
        name: string;
        isActive: boolean;
        deletedAt: Date | null;
        updatedAt: Date;
        slug: string;
        intakeEmailId: string;
        ownerUserId: string;
        timezone: string;
        settings: import("@prisma/client/runtime/library").JsonValue;
    }>;
    getWorkspaceMembers(userPayload: UserPayload, id: string): Promise<{
        id: string;
        role: import("@prisma/client").$Enums.WorkspaceMemberRole;
        user: {
            id: string;
            createdAt: Date;
            email: string;
            firstName: string | null;
            lastName: string | null;
        };
        joinedAt: Date;
    }[]>;
    inviteUser(userPayload: UserPayload, id: string, inviteUserDto: InviteUserDto): Promise<{
        message: string;
        inviteId: string;
    }>;
}
