import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PasswordService } from '../../auth/services/password.service';
import { UpdateProfileDto, ChangePasswordDto } from './dto';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
        hasCompletedOnboarding: true,
        emailVerifiedAt: true,
        authProvider: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update user profile
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
        hasCompletedOnboarding: true,
        emailVerifiedAt: true,
        authProvider: true,
      },
    });

    return updatedUser;
  }

  /**
   * Change user password
   * Only for LOCAL auth users (not OAuth users)
   */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    // Get user with password hash
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        authProvider: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Only allow password change for local auth users
    if (user.authProvider !== 'local') {
      throw new BadRequestException(
        `Cannot change password for ${user.authProvider} accounts. Please manage your password through ${user.authProvider}.`,
      );
    }

    // Verify current password
    if (!user.passwordHash) {
      throw new BadRequestException('No password set for this account');
    }

    const isCurrentPasswordValid = await this.passwordService.verifyPassword(
      user.passwordHash,
      dto.currentPassword,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Check if new password is different from current
    const isSamePassword = await this.passwordService.verifyPassword(
      user.passwordHash,
      dto.newPassword,
    );

    if (isSamePassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    // Hash new password
    const newPasswordHash = await this.passwordService.hashPassword(dto.newPassword);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
      },
    });

    return {
      success: true,
      message: 'Password changed successfully',
    };
  }

  /**
   * Get connected OAuth accounts for user
   */
  async getConnectedAccounts(userId: string) {
    const oauthAccounts = await this.prisma.oAuthCredential.findMany({
      where: { userId },
      select: {
        id: true,
        providerType: true,
        providerEmail: true,
        createdAt: true,
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return oauthAccounts;
  }

  /**
   * Disconnect OAuth account
   * Only allow if user has other auth methods (password or other OAuth)
   */
  async disconnectOAuthAccount(userId: string, credentialId: string) {
    // Get user's auth info
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        authProvider: true,
        passwordHash: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get the OAuth credential
    const credential = await this.prisma.oAuthCredential.findUnique({
      where: { id: credentialId },
    });

    if (!credential) {
      throw new NotFoundException('OAuth credential not found');
    }

    // Verify credential belongs to user
    if (credential.userId !== userId) {
      throw new UnauthorizedException('This credential does not belong to you');
    }

    // Count total OAuth credentials
    const totalOAuthAccounts = await this.prisma.oAuthCredential.count({
      where: { userId },
    });

    // Prevent disconnecting if it's the only auth method
    if (!user.passwordHash && totalOAuthAccounts === 1) {
      throw new BadRequestException(
        'Cannot disconnect your only authentication method. Please set a password first.',
      );
    }

    // Delete the OAuth credential
    await this.prisma.oAuthCredential.delete({
      where: { id: credentialId },
    });

    return {
      success: true,
      message: 'OAuth account disconnected successfully',
    };
  }

  /**
   * Delete user account
   * This is a destructive action that removes all user data
   */
  async deleteAccount(userId: string) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        workspaceMemberships: {
          include: {
            workspace: {
              select: {
                ownerUserId: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user owns any workspaces
    const ownedWorkspaces = user.workspaceMemberships.filter(
      (member: any) => member.workspace.ownerUserId === userId,
    );

    if (ownedWorkspaces.length > 0) {
      throw new BadRequestException(
        'Cannot delete account while owning workspaces. Please transfer ownership or delete your workspaces first.',
      );
    }

    // Delete user (cascade will handle related records)
    await this.prisma.user.delete({
      where: { id: userId },
    });

    return {
      success: true,
      message: 'Account deleted successfully',
    };
  }
}
