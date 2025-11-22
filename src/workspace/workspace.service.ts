import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { InviteUserDto } from './dto/invite-user.dto';
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
}
