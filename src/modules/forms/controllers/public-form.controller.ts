import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Headers,
  Req,
  Ip,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { FormSubmissionService } from '../services/form-submission.service';
import { WorkflowTriggerService } from '../services/workflow-trigger.service';
import type {
  FormSubmissionDto,
  FormSubmissionResponseDto,
} from '../dto/form-submission.dto';
import { FormSubmissionSchema } from '../dto/form-submission.dto';
import { PublicFormSchemaDto } from '../dto/embed-config.dto';
import { Public } from '../../../auth/decorators/public.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';

@Controller('forms')
export class PublicFormController {
  constructor(
    private readonly formSubmissionService: FormSubmissionService,
    private readonly workflowTriggerService: WorkflowTriggerService,
  ) {}

  /**
   * Get public form schema by workspace slug
   * Public endpoint - no authentication required
   *
   * @example GET /api/v1/forms/public/acme-corp
   */
  @Public()
  @Get('public/:workspaceSlug')
  @HttpCode(HttpStatus.OK)
  async getPublicForm(
    @Param('workspaceSlug') workspaceSlug: string,
  ): Promise<PublicFormSchemaDto> {
    return this.formSubmissionService.getPublicFormBySlug(workspaceSlug);
  }

  /**
   * Submit form and create lead
   * Public endpoint - no authentication required
   *
   * @example POST /api/v1/forms/public/acme-corp/submit
   * @body { fields: { email: "user@example.com", name: "John Doe", ... } }
   */
  @Public()
  @Post('public/:workspaceSlug/submit')
  @HttpCode(HttpStatus.CREATED)
  async submitForm(
    @Param('workspaceSlug') workspaceSlug: string,
    @Body(new ZodValidationPipe(FormSubmissionSchema))
    submission: FormSubmissionDto,
    @Headers('origin') origin: string,
    @Headers('user-agent') userAgent: string,
    @Ip() ipAddress: string,
    @Req() req: Request,
  ): Promise<FormSubmissionResponseDto> {
    // Submit form and create lead
    const result = await this.formSubmissionService.submitForm(
      workspaceSlug,
      submission,
      {
        ipAddress,
        userAgent,
        origin,
      },
    );

    // Trigger workflow in background (don't wait for completion)
    // Get form schema to get workflow ID
    const formSchema = await this.formSubmissionService.getPublicFormBySlug(
      workspaceSlug,
    );

    // Trigger workflow asynchronously
    this.workflowTriggerService
      .triggerFormWorkflow(result.leadId, formSchema.workflowId, {
        submissionData: submission.fields,
        tracking: submission.tracking,
        metadata: {
          ipAddress,
          userAgent,
          origin,
        },
      })
      .catch((error) => {
        // Log error but don't fail the response
        console.error('Failed to trigger workflow:', error);
      });

    return result;
  }

  /**
   * Track form view (for analytics)
   * Public endpoint - no authentication required
   *
   * @example POST /api/v1/forms/public/acme-corp/view
   */
  @Public()
  @Post('public/:workspaceSlug/view')
  @HttpCode(HttpStatus.NO_CONTENT)
  async trackFormView(
    @Param('workspaceSlug') workspaceSlug: string,
    @Headers('user-agent') userAgent: string,
    @Ip() ipAddress: string,
    @Body() body: { utk?: string },
  ): Promise<void> {
    await this.formSubmissionService.trackFormView(workspaceSlug, {
      utk: body.utk,
      userAgent,
      ipAddress,
    });
  }

  /**
   * Get embed script (static JavaScript file)
   * Public endpoint - serves the embed widget code
   *
   * @example GET /api/v1/forms/embed/script.js
   */
  @Public()
  @Get('embed/script.js')
  @HttpCode(HttpStatus.OK)
  getEmbedScript(@Req() req: Request): string {
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    // Return the embed widget JavaScript
    return `
(function() {
  'use strict';

  // FlowTrack Form Embed Widget
  // Version: 1.0.0
  // Usage: <div data-flowtrack-form="workspace-slug"></div>

  var FLOWTRACK_BASE_URL = '${baseUrl}';

  // Find all FlowTrack form containers
  var containers = document.querySelectorAll('[data-flowtrack-form]');

  if (containers.length === 0) {
    console.warn('FlowTrack: No form containers found. Add data-flowtrack-form attribute to a div.');
    return;
  }

  containers.forEach(function(container) {
    var workspaceSlug = container.getAttribute('data-flowtrack-form');

    if (!workspaceSlug) {
      console.error('FlowTrack: data-flowtrack-form attribute is empty');
      return;
    }

    // Create iframe
    var iframe = document.createElement('iframe');
    iframe.src = FLOWTRACK_BASE_URL + '/p/' + workspaceSlug;
    iframe.style.width = '100%';
    iframe.style.border = 'none';
    iframe.style.overflow = 'hidden';
    iframe.style.display = 'block';
    iframe.style.minHeight = '400px';
    iframe.setAttribute('scrolling', 'no');
    iframe.setAttribute('title', 'FlowTrack Form');

    // Listen for resize messages from iframe
    window.addEventListener('message', function(event) {
      // Validate origin for security (optional - allows all for flexibility)
      // if (event.origin !== FLOWTRACK_BASE_URL) return;

      if (event.data && event.data.type === 'flowtrack:resize') {
        iframe.style.height = event.data.height + 'px';
      }

      // Handle form submission success
      if (event.data && event.data.type === 'flowtrack:submit:success') {
        // Custom event for parent page to listen to
        var customEvent = new CustomEvent('flowtrack:submit', {
          detail: { leadId: event.data.leadId, workspaceSlug: workspaceSlug }
        });
        window.dispatchEvent(customEvent);
      }
    });

    // Insert iframe
    container.appendChild(iframe);

    // Track form view
    fetch(FLOWTRACK_BASE_URL + '/api/v1/forms/public/' + workspaceSlug + '/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        utk: getCookie('flowtrack_utk') || generateUTK()
      })
    }).catch(function() {
      // Silently fail analytics tracking
    });
  });

  // Helper: Generate unique tracking key
  function generateUTK() {
    var utk = 'utk_' + Math.random().toString(36).substr(2, 9) + Date.now();
    setCookie('flowtrack_utk', utk, 365);
    return utk;
  }

  // Helper: Get cookie
  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
  }

  // Helper: Set cookie
  function setCookie(name, value, days) {
    var expires = '';
    if (days) {
      var date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      expires = '; expires=' + date.toUTCString();
    }
    document.cookie = name + '=' + value + expires + '; path=/';
  }
})();
    `.trim();
  }
}
