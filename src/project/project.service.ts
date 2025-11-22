import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceService } from '../workspace/workspace.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectService {
  private readonly logger = new Logger(ProjectService.name);

  constructor(
    private prisma: PrismaService,
    private workspaceService: WorkspaceService,
  ) {}

  /**
   * Get all projects for a workspace
   */
  async getWorkspaceProjects(userId: string, workspaceId: string) {
    // Check permission
    await this.workspaceService.checkUserWorkspaceAccess(userId, workspaceId);

    const projects = await this.prisma.project.findMany({
      where: { workspaceId },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return projects.map((project) => ({
      ...project,
      taskCount: project._count.tasks,
    }));
  }

  /**
   * Create a new project
   */
  async createProject(userId: string, dto: CreateProjectDto) {
    // Check permission
    await this.workspaceService.checkUserWorkspaceAccess(
      userId,
      dto.workspaceId,
    );

    const project = await this.prisma.project.create({
      data: {
        name: dto.name,
        description: dto.description,
        workspaceId: dto.workspaceId,
      },
    });

    this.logger.log(`Project created: ${project.id} by user: ${userId}`);
    return project;
  }

  /**
   * Get a single project by ID (with permission check)
   */
  async getProjectById(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        workspace: true,
        tasks: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Check permission
    await this.workspaceService.checkUserWorkspaceAccess(
      userId,
      project.workspaceId,
    );

    return project;
  }

  /**
   * Update a project
   */
  async updateProject(userId: string, projectId: string, dto: UpdateProjectDto) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Check permission
    await this.workspaceService.checkUserWorkspaceAccess(
      userId,
      project.workspaceId,
    );

    const updatedProject = await this.prisma.project.update({
      where: { id: projectId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });

    this.logger.log(`Project updated: ${projectId} by user: ${userId}`);
    return updatedProject;
  }

  /**
   * Delete a project
   */
  async deleteProject(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Check permission - only admins can delete
    const role = await this.workspaceService.getUserRole(
      userId,
      project.workspaceId,
    );

    if (role !== 'admin') {
      throw new ForbiddenException('Only admins can delete projects');
    }

    await this.prisma.project.delete({
      where: { id: projectId },
    });

    this.logger.log(`Project deleted: ${projectId} by user: ${userId}`);
    return { message: 'Project deleted successfully' };
  }
}
