import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { User } from '../auth/decorators/user.decorator';
import type { UserPayload } from '../auth/decorators/user.decorator';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { AuthService } from '../auth/auth.service';

@ApiTags('Projects')
@ApiBearerAuth()
@Controller('api/project')
@UseGuards(ClerkAuthGuard)
export class ProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all projects for a workspace' })
  @ApiQuery({
    name: 'workspaceId',
    required: true,
    description: 'The workspace ID',
  })
  @ApiResponse({
    status: 200,
    description: 'List of projects',
  })
  async getWorkspaceProjects(
    @User() userPayload: UserPayload,
    @Query('workspaceId') workspaceId: string,
  ) {
    const user = await this.authService.getOrCreateUser(userPayload.authId);
    return this.projectService.getWorkspaceProjects(user.id, workspaceId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  @ApiResponse({
    status: 201,
    description: 'Project created successfully',
  })
  @HttpCode(HttpStatus.CREATED)
  async createProject(
    @User() userPayload: UserPayload,
    @Body() createProjectDto: CreateProjectDto,
  ) {
    const user = await this.authService.getOrCreateUser(userPayload.authId);
    return this.projectService.createProject(user.id, createProjectDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a project by ID' })
  @ApiResponse({
    status: 200,
    description: 'Project details with tasks',
  })
  @ApiResponse({
    status: 404,
    description: 'Project not found',
  })
  async getProjectById(
    @User() userPayload: UserPayload,
    @Param('id') id: string,
  ) {
    const user = await this.authService.getOrCreateUser(userPayload.authId);
    return this.projectService.getProjectById(user.id, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a project' })
  @ApiResponse({
    status: 200,
    description: 'Project updated successfully',
  })
  async updateProject(
    @User() userPayload: UserPayload,
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    const user = await this.authService.getOrCreateUser(userPayload.authId);
    return this.projectService.updateProject(user.id, id, updateProjectDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a project (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Project deleted successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Only admins can delete projects',
  })
  @HttpCode(HttpStatus.OK)
  async deleteProject(
    @User() userPayload: UserPayload,
    @Param('id') id: string,
  ) {
    const user = await this.authService.getOrCreateUser(userPayload.authId);
    return this.projectService.deleteProject(user.id, id);
  }
}
