import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Param,
} from '@nestjs/common';
import { UnifiedAuthGuard } from '../../auth/guards/unified-auth.guard';
import { UserService } from './user.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  updateProfileSchema,
  changePasswordSchema,
  type UpdateProfileDto,
  type ChangePasswordDto,
} from './dto';

@Controller('user')
@UseGuards(UnifiedAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * GET /user/profile
   * Get current user's profile
   */
  @Get('profile')
  @HttpCode(HttpStatus.OK)
  async getProfile(@Request() req: any) {
    return this.userService.getUserProfile(req.user.id);
  }

  /**
   * PATCH /user/profile
   * Update current user's profile
   */
  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @Request() req: any,
    @Body(new ZodValidationPipe(updateProfileSchema)) dto: UpdateProfileDto,
  ) {
    return this.userService.updateProfile(req.user.id, dto);
  }

  /**
   * PATCH /user/password
   * Change current user's password
   */
  @Patch('password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Request() req: any,
    @Body(new ZodValidationPipe(changePasswordSchema)) dto: ChangePasswordDto,
  ) {
    return this.userService.changePassword(req.user.id, dto);
  }

  /**
   * GET /user/connected-accounts
   * Get user's connected OAuth accounts
   */
  @Get('connected-accounts')
  @HttpCode(HttpStatus.OK)
  async getConnectedAccounts(@Request() req: any) {
    return this.userService.getConnectedAccounts(req.user.id);
  }

  /**
   * DELETE /user/connected-accounts/:credentialId
   * Disconnect an OAuth account
   */
  @Delete('connected-accounts/:credentialId')
  @HttpCode(HttpStatus.OK)
  async disconnectOAuthAccount(
    @Request() req: any,
    @Param('credentialId') credentialId: string,
  ) {
    return this.userService.disconnectOAuthAccount(req.user.id, credentialId);
  }

  /**
   * DELETE /user/account
   * Delete user account (destructive)
   */
  @Delete('account')
  @HttpCode(HttpStatus.OK)
  async deleteAccount(@Request() req: any) {
    return this.userService.deleteAccount(req.user.id);
  }
}
