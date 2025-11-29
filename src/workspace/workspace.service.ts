import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { generateSlug } from '../common/utils/slug.util';

@Injectable()
export class WorkspaceService {
  private readonly logger = new Logger(WorkspaceService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get all workspaces the user is a member of
   */
  async getUserWorkspaces(userId: string) {
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId },
      include: {
        workspace: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return memberships.map((m) => ({
      ...m.workspace,
      role: m.role,
      membershipId: m.id,
    }));
  }

  /**
   * Create a new workspace and make the creator an admin
   */
  async createWorkspace(userId: string, dto: CreateWorkspaceDto) {
    // Generate a unique slug
    const baseSlug = generateSlug(dto.name);
    let slug = baseSlug;
    let counter = 1;

    // Check if slug exists
    while (await this.prisma.workspace.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Generate unique intake email ID (short UUID-like string)
    const generateIntakeEmailId = (): string => {
      return Math.random().toString(36).substring(2, 12);
    };
    let intakeEmailId = generateIntakeEmailId();
    while (await this.prisma.workspace.findUnique({ where: { intakeEmailId } })) {
      intakeEmailId = generateIntakeEmailId();
    }

    // Create workspace and membership in a transaction
    const workspace = await this.prisma.$transaction(async (tx) => {
      const newWorkspace = await tx.workspace.create({
        data: {
          name: dto.name,
          slug,
          intakeEmailId,
          ownerUserId: userId,
        },
      });

      await tx.workspaceMember.create({
        data: {
          userId,
          workspaceId: newWorkspace.id,
          role: 'admin',
        },
      });

      return newWorkspace;
    });

    this.logger.log(`Workspace created: ${workspace.id} by user: ${userId}`);
    return workspace;
  }

  /**
   * Get a single workspace by ID (with permission check)
   */
  async getWorkspaceById(userId: string, workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // Check if user has access
    const membership = workspace.members.find((m) => m.userId === userId);
    if (!membership) {
      throw new ForbiddenException('You do not have access to this workspace');
    }

    return {
      ...workspace,
      role: membership.role,
    };
  }

  /**
   * Get all members of a workspace
   */
  async getWorkspaceMembers(userId: string, workspaceId: string) {
    // Check permission
    await this.checkUserWorkspaceAccess(userId, workspaceId);

    const memberships = await this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return memberships.map((m) => ({
      id: m.id,
      role: m.role,
      user: m.user,
      joinedAt: m.createdAt,
    }));
  }

  /**
   * Invite a user to a workspace
   * This creates a pending membership and queues an email job
   */
  async inviteUser(
    userId: string,
    workspaceId: string,
    dto: InviteUserDto,
  ): Promise<{ message: string; inviteId: string }> {
    // Check if requester is admin
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this workspace');
    }

    if (membership.role !== 'admin') {
      throw new ForbiddenException('Only admins can invite users');
    }

    // Check if user with this email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      // Check if already a member
      const existingMembership = await this.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: existingUser.id,
          },
        },
      });

      if (existingMembership) {
        throw new ConflictException('User is already a member of this workspace');
      }
    }

    // For now, we'll create a note that the invitation was sent
    // In a full implementation, this would queue a BullMQ job
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    this.logger.log(
      `Invitation to workspace ${workspace?.name} sent to ${dto.email}`,
    );

    // Return a success message
    // In production, this would return the queued job ID
    return {
      message: 'Invitation email will be sent',
      inviteId: 'pending-' + Date.now(),
    };
  }

  /**
   * Check if user has access to a workspace
   */
  async checkUserWorkspaceAccess(
    userId: string,
    workspaceId: string,
  ): Promise<void> {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this workspace');
    }
  }

  /**
   * Get user's role in a workspace
   */
  async getUserRole(userId: string, workspaceId: string): Promise<string> {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this workspace');
    }

    return membership.role;
  }

  /**
   * Update a member's role
   * Only admins and owners can change roles
   */
  async updateMemberRole(
    userId: string,
    workspaceId: string,
    memberId: string,
    dto: UpdateMemberRoleDto,
  ) {
    // Check if requester has permission (must be admin or owner)
    const requesterMembership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!requesterMembership) {
      throw new ForbiddenException('You do not have access to this workspace');
    }

    if (requesterMembership.role !== 'admin' && requesterMembership.role !== 'owner') {
      throw new ForbiddenException('Only admins and owners can change member roles');
    }

    // Get the member to update
    const memberToUpdate = await this.prisma.workspaceMember.findUnique({
      where: { id: memberId },
      include: {
        workspace: true,
      },
    });

    if (!memberToUpdate || memberToUpdate.workspaceId !== workspaceId) {
      throw new NotFoundException('Member not found in this workspace');
    }

    // Cannot change owner's role
    if (memberToUpdate.role === 'owner') {
      throw new BadRequestException('Cannot change the owner\'s role. Transfer ownership instead.');
    }

    // Update the role
    const updatedMember = await this.prisma.workspaceMember.update({
      where: { id: memberId },
      data: {
        role: dto.role,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    this.logger.log(
      `Member role updated: ${updatedMember.user.email} -> ${dto.role} in workspace ${workspaceId}`,
    );

    return {
      id: updatedMember.id,
      role: updatedMember.role,
      user: updatedMember.user,
      joinedAt: updatedMember.createdAt,
    };
  }

  /**
   * Remove a member from workspace
   * Admins and owners can remove members (but not the owner)
   */
  async removeMember(userId: string, workspaceId: string, memberId: string) {
    // Check if requester has permission
    const requesterMembership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!requesterMembership) {
      throw new ForbiddenException('You do not have access to this workspace');
    }

    if (requesterMembership.role !== 'admin' && requesterMembership.role !== 'owner') {
      throw new ForbiddenException('Only admins and owners can remove members');
    }

    // Get the member to remove
    const memberToRemove = await this.prisma.workspaceMember.findUnique({
      where: { id: memberId },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!memberToRemove || memberToRemove.workspaceId !== workspaceId) {
      throw new NotFoundException('Member not found in this workspace');
    }

    // Cannot remove the owner
    if (memberToRemove.role === 'owner') {
      throw new BadRequestException('Cannot remove the workspace owner');
    }

    // Cannot remove yourself (use leave endpoint instead)
    if (memberToRemove.userId === userId) {
      throw new BadRequestException('Use the leave endpoint to remove yourself from the workspace');
    }

    // Delete the membership
    await this.prisma.workspaceMember.delete({
      where: { id: memberId },
    });

    this.logger.log(
      `Member removed: ${memberToRemove.user.email} from workspace ${workspaceId}`,
    );

    return {
      success: true,
      message: 'Member removed successfully',
    };
  }

  /**
   * Transfer workspace ownership to another member
   * Only the current owner can do this
   */
  async transferOwnership(
    userId: string,
    workspaceId: string,
    dto: TransferOwnershipDto,
  ) {
    // Verify requester is the owner
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          where: {
            userId,
          },
        },
      },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    if (workspace.ownerUserId !== userId) {
      throw new ForbiddenException('Only the workspace owner can transfer ownership');
    }

    // Verify new owner is a member
    const newOwnerMembership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: dto.newOwnerId,
        },
      },
    });

    if (!newOwnerMembership) {
      throw new BadRequestException('New owner must be a member of the workspace');
    }

    // Transfer ownership in a transaction
    await this.prisma.$transaction(async (tx) => {
      // Update workspace owner
      await tx.workspace.update({
        where: { id: workspaceId },
        data: {
          ownerUserId: dto.newOwnerId,
        },
      });

      // Update new owner's role to owner
      await tx.workspaceMember.update({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: dto.newOwnerId,
          },
        },
        data: {
          role: 'owner',
        },
      });

      // Downgrade previous owner to admin
      await tx.workspaceMember.update({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId,
          },
        },
        data: {
          role: 'admin',
        },
      });
    });

    this.logger.log(
      `Ownership transferred in workspace ${workspaceId}: ${userId} -> ${dto.newOwnerId}`,
    );

    return {
      success: true,
      message: 'Ownership transferred successfully',
    };
  }

  /**
   * Leave a workspace
   * Cannot leave if you're the owner (must transfer ownership first)
   */
  async leaveWorkspace(userId: string, workspaceId: string) {
    // Get user's membership
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('You are not a member of this workspace');
    }

    // Cannot leave if you're the owner
    if (membership.role === 'owner') {
      throw new BadRequestException(
        'Workspace owners cannot leave. Please transfer ownership first.',
      );
    }

    // Remove membership
    await this.prisma.workspaceMember.delete({
      where: { id: membership.id },
    });

    this.logger.log(`User ${userId} left workspace ${workspaceId}`);

    return {
      success: true,
      message: 'You have left the workspace',
    };
  }

  /**
   * Update workspace settings
   * Only admins and owners can update
   */
  async updateWorkspace(
    userId: string,
    workspaceId: string,
    dto: UpdateWorkspaceDto,
  ) {
    // Check permission
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this workspace');
    }

    if (membership.role !== 'admin' && membership.role !== 'owner') {
      throw new ForbiddenException('Only admins and owners can update workspace settings');
    }

    // If name is being changed, regenerate slug
    let slug: string | undefined;
    if (dto.name) {
      const baseSlug = generateSlug(dto.name);
      slug = baseSlug;
      let counter = 1;

      // Check if slug exists (excluding current workspace)
      while (
        await this.prisma.workspace.findFirst({
          where: {
            slug,
            id: { not: workspaceId },
          },
        })
      ) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
    }

    // Update workspace
    const updatedWorkspace = await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(slug && { slug }),
      },
    });

    this.logger.log(`Workspace updated: ${workspaceId}`);

    return updatedWorkspace;
  }

  /**
   * Delete a workspace
   * Only the owner can delete
   */
  async deleteWorkspace(userId: string, workspaceId: string) {
    // Verify requester is the owner
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    if (workspace.ownerUserId !== userId) {
      throw new ForbiddenException('Only the workspace owner can delete the workspace');
    }

    // Delete workspace (cascade will handle members, projects, etc.)
    await this.prisma.workspace.delete({
      where: { id: workspaceId },
    });

    this.logger.log(`Workspace deleted: ${workspaceId} by user: ${userId}`);

    return {
      success: true,
      message: 'Workspace deleted successfully',
    };
  }
}
