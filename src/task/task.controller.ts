import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
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

@ApiTags('Tasks')
@ApiBearerAuth()
@Controller('api/task')
export class TaskController {
  constructor(
    private readonly taskService: TaskService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all tasks for a project' })
  @ApiQuery({
    name: 'projectId',
    required: true,
    description: 'The project ID',
  })
  async getProjectTasks(
    @User() user: UserPayload,
    @Query('projectId') projectId: string,
  ) {
    return this.taskService.getProjectTasks(user.id, projectId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  @HttpCode(HttpStatus.CREATED)
  async createTask(
    @User() user: UserPayload,
    @Body() createTaskDto: CreateTaskDto,
  ) {
    return this.taskService.createTask(user.id, createTaskDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a task' })
  async updateTask(
    @User() user: UserPayload,
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    return this.taskService.updateTask(user.id, id, updateTaskDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a task' })
  async deleteTask(
    @User() user: UserPayload,
    @Param('id') id: string,
  ) {
    return this.taskService.deleteTask(user.id, id);
  }
}
