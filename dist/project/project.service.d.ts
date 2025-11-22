import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceService } from '../workspace/workspace.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
export declare class ProjectService {
    private prisma;
    private workspaceService;
    private readonly logger;
    constructor(prisma: PrismaService, workspaceService: WorkspaceService);
    getWorkspaceProjects(userId: string, workspaceId: string): Promise<{
        taskCount: number;
        _count: {
            tasks: number;
        };
        description: string | null;
        id: string;
        createdAt: Date;
        name: string;
        deletedAt: Date | null;
        updatedAt: Date;
        workspaceId: string;
    }[]>;
    createProject(userId: string, dto: CreateProjectDto): Promise<{
        description: string | null;
        id: string;
        createdAt: Date;
        name: string;
        deletedAt: Date | null;
        updatedAt: Date;
        workspaceId: string;
    }>;
    getProjectById(userId: string, projectId: string): Promise<{
        workspace: {
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
        };
        tasks: {
            description: string | null;
            id: string;
            createdAt: Date;
            deletedAt: Date | null;
            updatedAt: Date;
            title: string;
            projectId: string;
            isComplete: boolean;
        }[];
    } & {
        description: string | null;
        id: string;
        createdAt: Date;
        name: string;
        deletedAt: Date | null;
        updatedAt: Date;
        workspaceId: string;
    }>;
    updateProject(userId: string, projectId: string, dto: UpdateProjectDto): Promise<{
        description: string | null;
        id: string;
        createdAt: Date;
        name: string;
        deletedAt: Date | null;
        updatedAt: Date;
        workspaceId: string;
    }>;
    deleteProject(userId: string, projectId: string): Promise<{
        message: string;
    }>;
}
