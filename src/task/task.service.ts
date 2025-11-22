import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectService } from '../project/project.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(
    private prisma: PrismaService,
    private projectService: ProjectService,
  ) {}

  async getProjectTasks(userId: string, projectId: string) {
    // This will check permission
    await this.projectService.getProjectById(userId, projectId);

    return this.prisma.task.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTask(userId: string, dto: CreateTaskDto) {
    // This will check permission
    await this.projectService.getProjectById(userId, dto.projectId);

    const task = await this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        projectId: dto.projectId,
      },
    });

    this.logger.log(`Task created: ${task.id} by user: ${userId}`);
    return task;
  }

  async updateTask(userId: string, taskId: string, dto: UpdateTaskDto) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Check permission
    await this.projectService.getProjectById(userId, task.projectId);

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.isComplete !== undefined && { isComplete: dto.isComplete }),
      },
    });

    this.logger.log(`Task updated: ${taskId} by user: ${userId}`);
    return updated;
  }

  async deleteTask(userId: string, taskId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    await this.projectService.getProjectById(userId, task.projectId);

    await this.prisma.task.delete({
      where: { id: taskId },
    });

    this.logger.log(`Task deleted: ${taskId} by user: ${userId}`);
    return { message: 'Task deleted successfully' };
  }
}
