import { PrismaService } from '../prisma/prisma.service';
import { ProjectService } from '../project/project.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
export declare class TaskService {
    private prisma;
    private projectService;
    private readonly logger;
    constructor(prisma: PrismaService, projectService: ProjectService);
    getProjectTasks(userId: string, projectId: string): Promise<{
        description: string | null;
        id: string;
        createdAt: Date;
        deletedAt: Date | null;
        updatedAt: Date;
        title: string;
        projectId: string;
        isComplete: boolean;
    }[]>;
    createTask(userId: string, dto: CreateTaskDto): Promise<{
        description: string | null;
        id: string;
        createdAt: Date;
        deletedAt: Date | null;
        updatedAt: Date;
        title: string;
        projectId: string;
        isComplete: boolean;
    }>;
    updateTask(userId: string, taskId: string, dto: UpdateTaskDto): Promise<{
        description: string | null;
        id: string;
        createdAt: Date;
        deletedAt: Date | null;
        updatedAt: Date;
        title: string;
        projectId: string;
        isComplete: boolean;
    }>;
    deleteTask(userId: string, taskId: string): Promise<{
        message: string;
    }>;
}
