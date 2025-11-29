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
        name: string;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        workspaceId: string;
        description: string | null;
    }[]>;
    createProject(userId: string, dto: CreateProjectDto): Promise<{
        name: string;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        workspaceId: string;
        description: string | null;
    }>;
    getProjectById(userId: string, projectId: string): Promise<{
        workspace: {
            name: string;
            id: string;
            slug: string;
            intakeEmailId: string;
            ownerUserId: string;
            timezone: string;
            settings: import("@prisma/client/runtime/library").JsonValue;
            isActive: boolean;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
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
        name: string;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        workspaceId: string;
        description: string | null;
    }>;
    updateProject(userId: string, projectId: string, dto: UpdateProjectDto): Promise<{
        name: string;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        workspaceId: string;
        description: string | null;
    }>;
    deleteProject(userId: string, projectId: string): Promise<{
        message: string;
    }>;
}
