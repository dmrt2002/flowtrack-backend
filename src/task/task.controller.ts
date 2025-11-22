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
import { TaskService } from './task.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { User } from '../auth/decorators/user.decorator';
import type { UserPayload } from '../auth/decorators/user.decorator';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { AuthService } from '../auth/auth.service';

@ApiTags('Tasks')
@ApiBearerAuth()
@Controller('api/task')
@UseGuards(ClerkAuthGuard)
export class TaskController {
  constructor(
    private readonly taskService: TaskService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all tasks for a project' })
  @ApiQuery({
    name: 'projectId',
    required: true,
    description: 'The project ID',
  })
  async getProjectTasks(
    @User() userPayload: UserPayload,
    @Query('projectId') projectId: string,
  ) {
    const user = await this.authService.getOrCreateUser(userPayload.authId);
    return this.taskService.getProjectTasks(user.id, projectId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  @HttpCode(HttpStatus.CREATED)
  async createTask(
    @User() userPayload: UserPayload,
    @Body() createTaskDto: CreateTaskDto,
  ) {
    const user = await this.authService.getOrCreateUser(userPayload.authId);
    return this.taskService.createTask(user.id, createTaskDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a task' })
  async updateTask(
    @User() userPayload: UserPayload,
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    const user = await this.authService.getOrCreateUser(userPayload.authId);
    return this.taskService.updateTask(user.id, id, updateTaskDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a task' })
  async deleteTask(
    @User() userPayload: UserPayload,
    @Param('id') id: string,
  ) {
    const user = await this.authService.getOrCreateUser(userPayload.authId);
    return this.taskService.deleteTask(user.id, id);
  }
}
