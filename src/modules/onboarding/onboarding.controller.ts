import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { UnifiedAuthGuard } from '../../auth/guards/unified-auth.guard';
import { User } from '../../auth/decorators/user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { OnboardingService } from './services/onboarding.service';
import type {
  StrategySelectionDto,
  ConfigurationDto,
  OAuthCompleteDto,
  SimulationDto,
  FormFieldsDto,
} from './dto';
import {
  strategySelectionSchema,
  configurationSchema,
  oauthCompleteSchema,
  simulationSchema,
  formFieldsSchema,
} from './dto';

@Controller('onboarding')
@UseGuards(UnifiedAuthGuard)
export class OnboardingController {
  constructor(private onboardingService: OnboardingService) {}

  /**
   * POST /api/v1/onboarding/strategy
   * Step 1: Save strategy selection
   */
  @Post('strategy')
  async selectStrategy(
    @User() user: any,
    @Body(new ZodValidationPipe(strategySelectionSchema))
    dto: StrategySelectionDto,
  ) {
    return this.onboardingService.saveStrategy(user.id, dto);
  }

  /**
   * GET /api/v1/onboarding/form-fields/:workflowId
   * Get form fields for a workflow
   */
  @Get('form-fields/:workflowId')
  async getFormFields(
    @User() user: any,
    @Param('workflowId') workflowId: string,
  ) {
    return this.onboardingService.getFormFields(user.id, workflowId);
  }

  /**
   * PUT /api/v1/onboarding/form-fields
   * Step 2a: Save form field configurations
   */
  @Put('form-fields')
  async saveFormFields(
    @User() user: any,
    @Body(new ZodValidationPipe(formFieldsSchema)) dto: FormFieldsDto,
  ) {
    return this.onboardingService.saveFormFields(user.id, dto);
  }

  /**
   * POST /api/v1/onboarding/configure
   * Step 3: Save configuration (Email Configuration / Mad Libs)
   */
  @Post('configure')
  async saveConfiguration(
    @User() user: any,
    @Body(new ZodValidationPipe(configurationSchema)) dto: ConfigurationDto,
  ) {
    return this.onboardingService.saveConfiguration(user.id, dto);
  }

  /**
   * POST /api/v1/onboarding/oauth-complete
   * Step 3: Confirm OAuth connection
   */
  @Post('oauth-complete')
  async confirmOAuth(
    @User() user: any,
    @Body(new ZodValidationPipe(oauthCompleteSchema)) dto: OAuthCompleteDto,
  ) {
    return this.onboardingService.confirmOAuthConnection(user.id, dto);
  }

  /**
   * POST /api/v1/onboarding/simulate
   * Step 4: Generate simulation
   */
  @Post('simulate')
  async generateSimulation(
    @User() user: any,
    @Body(new ZodValidationPipe(simulationSchema)) dto: SimulationDto,
  ) {
    return this.onboardingService.generateSimulation(user.id, dto);
  }

  /**
   * GET /api/v1/onboarding/status
   * Get current onboarding progress
   */
  @Get('status')
  async getStatus(@User() user: any) {
    return this.onboardingService.getOnboardingStatus(user.id);
  }
}
