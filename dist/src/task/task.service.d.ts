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
        updatedAt: Date;
        title: string;
        isComplete: boolean;
        projectId: string;
    }[]>;
    createTask(userId: string, dto: CreateTaskDto): Promise<{
        description: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        isComplete: boolean;
        projectId: string;
    }>;
    updateTask(userId: string, taskId: string, dto: UpdateTaskDto): Promise<{
        description: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        isComplete: boolean;
        projectId: string;
    }>;
    deleteTask(userId: string, taskId: string): Promise<{
        message: string;
    }>;
}
