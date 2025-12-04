import { WorkspaceService } from './workspace.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import type { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import type { TransferOwnershipDto } from './dto/transfer-ownership.dto';
import type { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import type { UserPayload } from '../auth/decorators/user.decorator';
export declare class WorkspaceController {
    private readonly workspaceService;
    constructor(workspaceService: WorkspaceService);
    getUserWorkspaces(user: UserPayload): Promise<{
        role: import("@prisma/client").$Enums.WorkspaceMemberRole;
        membershipId: string;
        id: string;
        isActive: boolean;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        slug: string;
        intakeEmailId: string;
        ownerUserId: string;
        timezone: string;
        settings: import("@prisma/client/runtime/library").JsonValue;
    }[]>;
    createWorkspace(user: UserPayload, createWorkspaceDto: CreateWorkspaceDto): Promise<{
        id: string;
        isActive: boolean;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        slug: string;
        intakeEmailId: string;
        ownerUserId: string;
        timezone: string;
        settings: import("@prisma/client/runtime/library").JsonValue;
    }>;
    getWorkspaceById(user: UserPayload, id: string): Promise<{
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
            userId: string;
            workspaceId: string;
            isActive: boolean;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            role: import("@prisma/client").$Enums.WorkspaceMemberRole;
            permissions: import("@prisma/client/runtime/library").JsonValue;
            invitedByUserId: string | null;
            invitedAt: Date | null;
            joinedAt: Date | null;
        })[];
        id: string;
        isActive: boolean;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        slug: string;
        intakeEmailId: string;
        ownerUserId: string;
        timezone: string;
        settings: import("@prisma/client/runtime/library").JsonValue;
    }>;
    getWorkspaceMembers(user: UserPayload, id: string): Promise<{
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
    inviteUser(user: UserPayload, id: string, inviteUserDto: InviteUserDto): Promise<{
        message: string;
        inviteId: string;
    }>;
    updateMemberRole(user: UserPayload, workspaceId: string, memberId: string, dto: UpdateMemberRoleDto): Promise<{
        id: string;
        role: import("@prisma/client").$Enums.WorkspaceMemberRole;
        user: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
        };
        joinedAt: Date;
    }>;
    removeMember(user: UserPayload, workspaceId: string, memberId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    transferOwnership(user: UserPayload, workspaceId: string, dto: TransferOwnershipDto): Promise<{
        success: boolean;
        message: string;
    }>;
    leaveWorkspace(user: UserPayload, workspaceId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    updateWorkspace(user: UserPayload, workspaceId: string, dto: UpdateWorkspaceDto): Promise<{
        id: string;
        isActive: boolean;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        slug: string;
        intakeEmailId: string;
        ownerUserId: string;
        timezone: string;
        settings: import("@prisma/client/runtime/library").JsonValue;
    }>;
    deleteWorkspace(user: UserPayload, workspaceId: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
