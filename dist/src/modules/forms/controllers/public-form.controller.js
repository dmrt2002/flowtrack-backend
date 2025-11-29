"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicFormController = void 0;
const common_1 = require("@nestjs/common");
const form_submission_service_1 = require("../services/form-submission.service");
const workflow_trigger_service_1 = require("../services/workflow-trigger.service");
const form_submission_dto_1 = require("../dto/form-submission.dto");
const public_decorator_1 = require("../../../auth/decorators/public.decorator");
const zod_validation_pipe_1 = require("../../../common/pipes/zod-validation.pipe");
let PublicFormController = class PublicFormController {
    formSubmissionService;
    workflowTriggerService;
    constructor(formSubmissionService, workflowTriggerService) {
        this.formSubmissionService = formSubmissionService;
        this.workflowTriggerService = workflowTriggerService;
    }
    async getPublicForm(workspaceSlug) {
        return this.formSubmissionService.getPublicFormBySlug(workspaceSlug);
    }
    async submitForm(workspaceSlug, submission, origin, userAgent, ipAddress, req) {
        const result = await this.formSubmissionService.submitForm(workspaceSlug, submission, {
            ipAddress,
            userAgent,
            origin,
        });
        const formSchema = await this.formSubmissionService.getPublicFormBySlug(workspaceSlug);
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
            console.error('Failed to trigger workflow:', error);
        });
        return result;
    }
    async trackFormView(workspaceSlug, userAgent, ipAddress, body) {
        await this.formSubmissionService.trackFormView(workspaceSlug, {
            utk: body.utk,
            userAgent,
            ipAddress,
        });
    }
    getEmbedScript(req) {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
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
};
exports.PublicFormController = PublicFormController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('public/:workspaceSlug'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('workspaceSlug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PublicFormController.prototype, "getPublicForm", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('public/:workspaceSlug/submit'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Param)('workspaceSlug')),
    __param(1, (0, common_1.Body)(new zod_validation_pipe_1.ZodValidationPipe(form_submission_dto_1.FormSubmissionSchema))),
    __param(2, (0, common_1.Headers)('origin')),
    __param(3, (0, common_1.Headers)('user-agent')),
    __param(4, (0, common_1.Ip)()),
    __param(5, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String, String, Object]),
    __metadata("design:returntype", Promise)
], PublicFormController.prototype, "submitForm", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('public/:workspaceSlug/view'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('workspaceSlug')),
    __param(1, (0, common_1.Headers)('user-agent')),
    __param(2, (0, common_1.Ip)()),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], PublicFormController.prototype, "trackFormView", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('embed/script.js'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", String)
], PublicFormController.prototype, "getEmbedScript", null);
exports.PublicFormController = PublicFormController = __decorate([
    (0, common_1.Controller)('forms'),
    __metadata("design:paramtypes", [form_submission_service_1.FormSubmissionService,
        workflow_trigger_service_1.WorkflowTriggerService])
], PublicFormController);
//# sourceMappingURL=public-form.controller.js.map