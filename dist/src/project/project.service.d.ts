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
        id: string;
        workspaceId: string;
        name: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
    }[]>;
    createProject(userId: string, dto: CreateProjectDto): Promise<{
        id: string;
        workspaceId: string;
        name: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
    }>;
    getProjectById(userId: string, projectId: string): Promise<{
        workspace: {
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
        };
        tasks: {
            id: string;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            isComplete: boolean;
            title: string;
            projectId: string;
        }[];
    } & {
        id: string;
        workspaceId: string;
        name: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
    }>;
    updateProject(userId: string, projectId: string, dto: UpdateProjectDto): Promise<{
        id: string;
        workspaceId: string;
        name: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
    }>;
    deleteProject(userId: string, projectId: string): Promise<{
        message: string;
    }>;
}
