import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import type { UserPayload } from '../auth/decorators/user.decorator';
import { AuthService } from '../auth/auth.service';
export declare class ProjectController {
    private readonly projectService;
    private readonly authService;
    constructor(projectService: ProjectService, authService: AuthService);
    getWorkspaceProjects(userPayload: UserPayload, workspaceId: string): Promise<{
        taskCount: number;
        _count: {
            tasks: number;
        };
        description: string | null;
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        workspaceId: string;
    }[]>;
    createProject(userPayload: UserPayload, createProjectDto: CreateProjectDto): Promise<{
        description: string | null;
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        workspaceId: string;
    }>;
    getProjectById(userPayload: UserPayload, id: string): Promise<{
        workspace: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            slug: string;
        };
        tasks: {
            description: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            isComplete: boolean;
            projectId: string;
        }[];
    } & {
        description: string | null;
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        workspaceId: string;
    }>;
    updateProject(userPayload: UserPayload, id: string, updateProjectDto: UpdateProjectDto): Promise<{
        description: string | null;
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        workspaceId: string;
    }>;
    deleteProject(userPayload: UserPayload, id: string): Promise<{
        message: string;
    }>;
}
