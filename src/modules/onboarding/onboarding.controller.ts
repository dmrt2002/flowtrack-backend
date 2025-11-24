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
  CalendlyDto,
  SchedulingPreferenceDto,
} from './dto';
import {
  strategySelectionSchema,
  configurationSchema,
  oauthCompleteSchema,
  simulationSchema,
  formFieldsSchema,
  calendlySchema,
  schedulingPreferenceSchema,
} from './dto';

@Controller('onboarding')
@UseGuards(UnifiedAuthGuard)
export class OnboardingController {
  constructor(private onboardingService: OnboardingService) {}

  /**
   * GET /api/v1/onboarding/init
   * Initialize onboarding - auto-creates workflow if needed
   * This replaces strategy selection as the first step
   */
  @Get('init')
  async initOnboarding(@User() user: any) {
    return this.onboardingService.getOrCreateWorkflow(user.id);
  }

  /**
   * POST /api/v1/onboarding/strategy
   * Step 1: Save strategy selection (DEPRECATED - kept for backward compatibility)
   * @deprecated Use GET /api/v1/onboarding/init instead
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
   * Step 2: Save form field configurations (Form Builder)
   */
  @Put('form-fields')
  async saveFormFields(
    @User() user: any,
    @Body(new ZodValidationPipe(formFieldsSchema)) dto: FormFieldsDto,
  ) {
    return this.onboardingService.saveFormFields(user.id, dto);
  }

  /**
   * POST /api/v1/onboarding/calendly
   * Step 2.5: Save Calendly link (deprecated - use scheduling-preference)
   */
  @Post('calendly')
  async saveCalendlyLink(
    @User() user: any,
    @Body(new ZodValidationPipe(calendlySchema)) dto: CalendlyDto,
  ) {
    return this.onboardingService.saveCalendlyLink(user.id, dto);
  }

  /**
   * POST /api/v1/onboarding/scheduling-preference
   * Step 3: Save scheduling preference (Integrations - Calendly or Google Meet)
   */
  @Post('scheduling-preference')
  async saveSchedulingPreference(
    @User() user: any,
    @Body(new ZodValidationPipe(schedulingPreferenceSchema))
    dto: SchedulingPreferenceDto,
  ) {
    return this.onboardingService.saveSchedulingPreference(user.id, dto);
  }

  /**
   * POST /api/v1/onboarding/configure
   * Step 4: Save configuration (Email Configuration / Mad Libs)
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
   * Step 3 (Legacy): Confirm OAuth connection (Deprecated - OAuth now handled in Integrations step)
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
   * Step 5: Generate simulation
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
