import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
export declare class WorkspaceService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getUserWorkspaces(userId: string): Promise<{
        role: import("@prisma/client").$Enums.WorkspaceMemberRole;
        membershipId: string;
        id: string;
        name: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        settings: import("@prisma/client/runtime/library").JsonValue;
        slug: string;
        intakeEmailId: string;
        ownerUserId: string;
        timezone: string;
        isActive: boolean;
    }[]>;
    createWorkspace(userId: string, dto: CreateWorkspaceDto): Promise<{
        id: string;
        name: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        settings: import("@prisma/client/runtime/library").JsonValue;
        slug: string;
        intakeEmailId: string;
        ownerUserId: string;
        timezone: string;
        isActive: boolean;
    }>;
    getWorkspaceById(userId: string, workspaceId: string): Promise<{
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
            workspaceId: string;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            role: import("@prisma/client").$Enums.WorkspaceMemberRole;
            isActive: boolean;
            userId: string;
            permissions: import("@prisma/client/runtime/library").JsonValue;
            invitedByUserId: string | null;
            invitedAt: Date | null;
            joinedAt: Date | null;
        })[];
        id: string;
        name: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        settings: import("@prisma/client/runtime/library").JsonValue;
        slug: string;
        intakeEmailId: string;
        ownerUserId: string;
        timezone: string;
        isActive: boolean;
    }>;
    getWorkspaceMembers(userId: string, workspaceId: string): Promise<{
        id: string;
        role: import("@prisma/client").$Enums.WorkspaceMemberRole;
        user: {
            id: string;
            email: string;
            createdAt: Date;
            firstName: string | null;
            lastName: string | null;
        };
        joinedAt: Date;
    }[]>;
    inviteUser(userId: string, workspaceId: string, dto: InviteUserDto): Promise<{
        message: string;
        inviteId: string;
    }>;
    checkUserWorkspaceAccess(userId: string, workspaceId: string): Promise<void>;
    getUserRole(userId: string, workspaceId: string): Promise<string>;
    updateMemberRole(userId: string, workspaceId: string, memberId: string, dto: UpdateMemberRoleDto): Promise<{
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
    removeMember(userId: string, workspaceId: string, memberId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    transferOwnership(userId: string, workspaceId: string, dto: TransferOwnershipDto): Promise<{
        success: boolean;
        message: string;
    }>;
    leaveWorkspace(userId: string, workspaceId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    updateWorkspace(userId: string, workspaceId: string, dto: UpdateWorkspaceDto): Promise<{
        id: string;
        name: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        settings: import("@prisma/client/runtime/library").JsonValue;
        slug: string;
        intakeEmailId: string;
        ownerUserId: string;
        timezone: string;
        isActive: boolean;
    }>;
    deleteWorkspace(userId: string, workspaceId: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
