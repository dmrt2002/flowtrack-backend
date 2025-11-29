import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
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
import type { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import type { TransferOwnershipDto } from './dto/transfer-ownership.dto';
import type { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  updateMemberRoleSchema,
  transferOwnershipSchema,
  updateWorkspaceSchema,
} from './dto';
import { User } from '../auth/decorators/user.decorator';
import type { UserPayload } from '../auth/decorators/user.decorator';

@ApiTags('Workspaces')
@ApiBearerAuth()
@Controller('api/workspace')
export class WorkspaceController {
  constructor(
    private readonly workspaceService: WorkspaceService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all workspaces for the current user' })
  @ApiResponse({
    status: 200,
    description: 'List of workspaces the user is a member of',
  })
  async getUserWorkspaces(@User() user: UserPayload) {
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
    @User() user: UserPayload,
    @Body() createWorkspaceDto: CreateWorkspaceDto,
  ) {
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
    @User() user: UserPayload,
    @Param('id') id: string,
  ) {
    return this.workspaceService.getWorkspaceById(user.id, id);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Get all members of a workspace' })
  @ApiResponse({
    status: 200,
    description: 'List of workspace members',
  })
  async getWorkspaceMembers(
    @User() user: UserPayload,
    @Param('id') id: string,
  ) {
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
    @User() user: UserPayload,
    @Param('id') id: string,
    @Body() inviteUserDto: InviteUserDto,
  ) {
    return this.workspaceService.inviteUser(user.id, id, inviteUserDto);
  }

  @Patch(':id/members/:memberId/role')
  @ApiOperation({ summary: 'Update a member\'s role' })
  @ApiResponse({
    status: 200,
    description: 'Member role updated successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Only admins and owners can change roles',
  })
  @HttpCode(HttpStatus.OK)
  async updateMemberRole(
    @User() user: UserPayload,
    @Param('id') workspaceId: string,
    @Param('memberId') memberId: string,
    @Body(new ZodValidationPipe(updateMemberRoleSchema)) dto: UpdateMemberRoleDto,
  ) {
    return this.workspaceService.updateMemberRole(user.id, workspaceId, memberId, dto);
  }

  @Delete(':id/members/:memberId')
  @ApiOperation({ summary: 'Remove a member from the workspace' })
  @ApiResponse({
    status: 200,
    description: 'Member removed successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Only admins and owners can remove members',
  })
  @HttpCode(HttpStatus.OK)
  async removeMember(
    @User() user: UserPayload,
    @Param('id') workspaceId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.workspaceService.removeMember(user.id, workspaceId, memberId);
  }

  @Post(':id/transfer-ownership')
  @ApiOperation({ summary: 'Transfer workspace ownership' })
  @ApiResponse({
    status: 200,
    description: 'Ownership transferred successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Only the owner can transfer ownership',
  })
  @HttpCode(HttpStatus.OK)
  async transferOwnership(
    @User() user: UserPayload,
    @Param('id') workspaceId: string,
    @Body(new ZodValidationPipe(transferOwnershipSchema)) dto: TransferOwnershipDto,
  ) {
    return this.workspaceService.transferOwnership(user.id, workspaceId, dto);
  }

  @Post(':id/leave')
  @ApiOperation({ summary: 'Leave the workspace' })
  @ApiResponse({
    status: 200,
    description: 'Left workspace successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Owners cannot leave (must transfer ownership first)',
  })
  @HttpCode(HttpStatus.OK)
  async leaveWorkspace(
    @User() user: UserPayload,
    @Param('id') workspaceId: string,
  ) {
    return this.workspaceService.leaveWorkspace(user.id, workspaceId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update workspace settings' })
  @ApiResponse({
    status: 200,
    description: 'Workspace updated successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Only admins and owners can update workspace',
  })
  @HttpCode(HttpStatus.OK)
  async updateWorkspace(
    @User() user: UserPayload,
    @Param('id') workspaceId: string,
    @Body(new ZodValidationPipe(updateWorkspaceSchema)) dto: UpdateWorkspaceDto,
  ) {
    return this.workspaceService.updateWorkspace(user.id, workspaceId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete workspace' })
  @ApiResponse({
    status: 200,
    description: 'Workspace deleted successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Only the owner can delete the workspace',
  })
  @HttpCode(HttpStatus.OK)
  async deleteWorkspace(
    @User() user: UserPayload,
    @Param('id') workspaceId: string,
  ) {
    return this.workspaceService.deleteWorkspace(user.id, workspaceId);
  }
}
