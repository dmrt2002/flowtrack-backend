/**
 * Pitch Configuration Controller
 *
 * REST API endpoints for managing workspace pitch configuration
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpStatus,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UnifiedAuthGuard } from '../../../auth/guards/unified-auth.guard';
import { User, UserPayload } from '../../../auth/decorators/user.decorator';
import { PitchConfigService } from '../services/pitch-config.service';
import { PitchTemplateService } from '../services/pitch-template.service';
import {
  PitchConfiguration,
  PitchQuickSettings,
  PitchTemplate,
  PitchAdvancedConfig,
} from '../types/pitch-config.types';

@ApiTags('Pitch Configuration')
@Controller('pitch-config')
@UseGuards(UnifiedAuthGuard)
@ApiBearerAuth()
export class PitchConfigController {
  private readonly logger = new Logger(PitchConfigController.name);

  constructor(
    private readonly configService: PitchConfigService,
    private readonly templateService: PitchTemplateService,
  ) {}

  /**
   * Get workspace pitch configuration
   * GET /api/v1/pitch-config
   */
  @Get()
  @ApiOperation({
    summary: 'Get workspace pitch configuration',
    description: 'Retrieves the current pitch generation configuration for the workspace',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Configuration retrieved successfully',
  })
  async getConfig(@User() user: UserPayload & { workspaces: any[] }): Promise<PitchConfiguration> {
    const workspaceId = user.workspaces[0]?.id;
    if (!workspaceId) {
      throw new Error('No workspace found for user');
    }
    return this.configService.getConfig(workspaceId);
  }

  /**
   * Get all templates (built-in + custom)
   * GET /api/v1/pitch-config/templates
   */
  @Get('templates')
  @ApiOperation({
    summary: 'Get all pitch templates',
    description: 'Retrieves all available templates including built-in and custom templates',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Templates retrieved successfully',
  })
  async getAllTemplates(@User() user: UserPayload & { workspaces: any[] }): Promise<PitchTemplate[]> {
    const workspaceId = user.workspaces[0]?.id;
    if (!workspaceId) {
      throw new Error('No workspace found for user');
    }
    return this.configService.getAllTemplates(workspaceId);
  }

  /**
   * Update quick settings
   * PATCH /api/v1/pitch-config/quick-settings
   */
  @Patch('quick-settings')
  @ApiOperation({
    summary: 'Update quick settings',
    description: 'Updates tone, length, and focus areas for pitch generation',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Quick settings updated successfully',
  })
  async updateQuickSettings(
    @User() user: UserPayload & { workspaces: any[] },
    @Body() quickSettings: Partial<PitchQuickSettings>,
  ): Promise<PitchConfiguration> {
    const workspaceId = user.workspaces[0]?.id;
    if (!workspaceId) {
      throw new Error('No workspace found for user');
    }
    this.logger.log(`Updating quick settings for workspace ${workspaceId}`);
    return this.configService.updateQuickSettings(workspaceId, quickSettings);
  }

  /**
   * Select template
   * POST /api/v1/pitch-config/select-template
   */
  @Post('select-template')
  @ApiOperation({
    summary: 'Select active template',
    description: 'Sets the active template for pitch generation',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template selected successfully',
  })
  async selectTemplate(
    @User() user: UserPayload & { workspaces: any[] },
    @Body() body: { templateId: string },
  ): Promise<PitchConfiguration> {
    const workspaceId = user.workspaces[0]?.id;
    if (!workspaceId) {
      throw new Error('No workspace found for user');
    }
    this.logger.log(`Selecting template ${body.templateId} for workspace ${workspaceId}`);
    return this.configService.selectTemplate(workspaceId, body.templateId);
  }

  /**
   * Create custom template
   * POST /api/v1/pitch-config/templates
   */
  @Post('templates')
  @ApiOperation({
    summary: 'Create custom template',
    description: 'Creates a new custom pitch template',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Custom template created successfully',
  })
  async createTemplate(
    @User() user: UserPayload & { workspaces: any[] },
    @Body() template: Omit<PitchTemplate, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<PitchConfiguration> {
    const workspaceId = user.workspaces[0]?.id;
    if (!workspaceId) {
      throw new Error('No workspace found for user');
    }
    this.logger.log(`Creating custom template for workspace ${workspaceId}`);
    return this.configService.createCustomTemplate(workspaceId, template);
  }

  /**
   * Update custom template
   * PATCH /api/v1/pitch-config/templates/:templateId
   */
  @Patch('templates/:templateId')
  @ApiOperation({
    summary: 'Update custom template',
    description: 'Updates an existing custom template',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Custom template updated successfully',
  })
  async updateTemplate(
    @User() user: UserPayload & { workspaces: any[] },
    @Param('templateId') templateId: string,
    @Body() updates: Partial<PitchTemplate>,
  ): Promise<PitchConfiguration> {
    const workspaceId = user.workspaces[0]?.id;
    if (!workspaceId) {
      throw new Error('No workspace found for user');
    }
    this.logger.log(`Updating template ${templateId} for workspace ${workspaceId}`);
    return this.configService.updateCustomTemplate(workspaceId, templateId, updates);
  }

  /**
   * Delete custom template
   * DELETE /api/v1/pitch-config/templates/:templateId
   */
  @Delete('templates/:templateId')
  @ApiOperation({
    summary: 'Delete custom template',
    description: 'Deletes a custom template',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Custom template deleted successfully',
  })
  async deleteTemplate(
    @User() user: UserPayload & { workspaces: any[] },
    @Param('templateId') templateId: string,
  ): Promise<PitchConfiguration> {
    const workspaceId = user.workspaces[0]?.id;
    if (!workspaceId) {
      throw new Error('No workspace found for user');
    }
    this.logger.log(`Deleting template ${templateId} for workspace ${workspaceId}`);
    return this.configService.deleteCustomTemplate(workspaceId, templateId);
  }

  /**
   * Update advanced config
   * PATCH /api/v1/pitch-config/advanced
   */
  @Patch('advanced')
  @ApiOperation({
    summary: 'Update advanced configuration',
    description: 'Updates advanced pitch generation settings including custom prompts',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Advanced config updated successfully',
  })
  async updateAdvancedConfig(
    @User() user: UserPayload & { workspaces: any[] },
    @Body() advancedConfig: Partial<PitchAdvancedConfig>,
  ): Promise<PitchConfiguration> {
    const workspaceId = user.workspaces[0]?.id;
    if (!workspaceId) {
      throw new Error('No workspace found for user');
    }
    this.logger.log(`Updating advanced config for workspace ${workspaceId}`);
    return this.configService.updateAdvancedConfig(workspaceId, advancedConfig);
  }

  /**
   * Validate template syntax
   * POST /api/v1/pitch-config/validate-template
   */
  @Post('validate-template')
  @ApiOperation({
    summary: 'Validate template syntax',
    description: 'Validates Handlebars template syntax without saving',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template validation result',
  })
  async validateTemplate(
    @Body() body: { template: string },
  ): Promise<{ valid: boolean; error?: string }> {
    return this.templateService.validateTemplate(body.template);
  }

  /**
   * Reset to default configuration
   * POST /api/v1/pitch-config/reset
   */
  @Post('reset')
  @ApiOperation({
    summary: 'Reset to default configuration',
    description: 'Resets all pitch configuration to default values',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Configuration reset successfully',
  })
  async resetToDefault(@User() user: UserPayload & { workspaces: any[] }): Promise<PitchConfiguration> {
    const workspaceId = user.workspaces[0]?.id;
    if (!workspaceId) {
      throw new Error('No workspace found for user');
    }
    this.logger.log(`Resetting config to default for workspace ${workspaceId}`);
    return this.configService.resetToDefault(workspaceId);
  }
}
