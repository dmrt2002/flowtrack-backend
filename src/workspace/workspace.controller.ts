import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { WorkspaceService } from './workspace.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { User } from '../auth/decorators/user.decorator';
import type { UserPayload } from '../auth/decorators/user.decorator';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { AuthService } from '../auth/auth.service';

@ApiTags('Workspaces')
@ApiBearerAuth()
@Controller('api/workspace')
@UseGuards(ClerkAuthGuard)
export class WorkspaceController {
  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all workspaces for the current user' })
  @ApiResponse({
    status: 200,
    description: 'List of workspaces the user is a member of',
  })
  async getUserWorkspaces(@User() userPayload: UserPayload) {
    const user = await this.authService.getOrCreateUser(userPayload.authId);
    return this.workspaceService.getUserWorkspaces(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new workspace' })
  @ApiResponse({
    status: 201,
    description: 'Workspace created successfully',
  })
  @HttpCode(HttpStatus.CREATED)
  async createWorkspace(
    @User() userPayload: UserPayload,
    @Body() createWorkspaceDto: CreateWorkspaceDto,
  ) {
    const user = await this.authService.getOrCreateUser(userPayload.authId);
    return this.workspaceService.createWorkspace(user.id, createWorkspaceDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a workspace by ID' })
  @ApiResponse({
    status: 200,
    description: 'Workspace details',
  })
  @ApiResponse({
    status: 404,
    description: 'Workspace not found',
  })
  @ApiResponse({
    status: 403,
    description: 'User does not have access to this workspace',
  })
  async getWorkspaceById(
    @User() userPayload: UserPayload,
    @Param('id') id: string,
  ) {
    const user = await this.authService.getOrCreateUser(userPayload.authId);
    return this.workspaceService.getWorkspaceById(user.id, id);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Get all members of a workspace' })
  @ApiResponse({
    status: 200,
    description: 'List of workspace members',
  })
  async getWorkspaceMembers(
    @User() userPayload: UserPayload,
    @Param('id') id: string,
  ) {
    const user = await this.authService.getOrCreateUser(userPayload.authId);
    return this.workspaceService.getWorkspaceMembers(user.id, id);
  }

  @Post(':id/invite')
  @ApiOperation({ summary: 'Invite a user to the workspace' })
  @ApiResponse({
    status: 201,
    description: 'Invitation sent successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Only admins can invite users',
  })
  @HttpCode(HttpStatus.CREATED)
  async inviteUser(
    @User() userPayload: UserPayload,
    @Param('id') id: string,
    @Body() inviteUserDto: InviteUserDto,
  ) {
    const user = await this.authService.getOrCreateUser(userPayload.authId);
    return this.workspaceService.inviteUser(user.id, id, inviteUserDto);
  }
}
