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
exports.FormEmbedController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
const unified_auth_guard_1 = require("../../../auth/guards/unified-auth.guard");
const client_1 = require("@prisma/client");
let FormEmbedController = class FormEmbedController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getEmbedCode(workflowId, req) {
        const workflow = await this.prisma.workflow.findUnique({
            where: { id: workflowId },
            include: {
                workspace: true,
                formFields: {
                    where: {
                        isActive: true,
                        deletedAt: null,
                    },
                    orderBy: {
                        displayOrder: 'asc',
                    },
                },
            },
        });
        if (!workflow) {
            throw new common_1.NotFoundException(`Workflow not found: ${workflowId}`);
        }
        const protocol = req.protocol;
        const host = req.get('host');
        const baseUrl = process.env.FRONTEND_URL || `${protocol}://${host}`;
        const apiBaseUrl = `${protocol}://${host}`;
        const workspaceSlug = workflow.workspace.slug;
        const publicFormUrl = `${baseUrl}/p/${workspaceSlug}`;
        const apiEndpoint = `${apiBaseUrl}/api/v1/forms/public/${workspaceSlug}/submit`;
        const iframeCode = `<iframe
  src="${publicFormUrl}"
  width="100%"
  height="600"
  frameborder="0"
  scrolling="no"
  title="FlowTrack Form">
</iframe>`;
        const scriptCode = `<!-- FlowTrack Form Embed -->
<div data-flowtrack-form="${workspaceSlug}"></div>
<script src="${apiBaseUrl}/api/v1/forms/embed/script.js" async></script>`;
        const exampleData = workflow.formFields.reduce((acc, field) => {
            let exampleValue = '';
            switch (field.fieldType) {
                case client_1.FieldType.EMAIL:
                    exampleValue = 'user@example.com';
                    break;
                case client_1.FieldType.NUMBER:
                    exampleValue = '1000';
                    break;
                case client_1.FieldType.CHECKBOX:
                    exampleValue = 'true';
                    break;
                case client_1.FieldType.DROPDOWN:
                    const options = field.options;
                    exampleValue = options && options[0] ? options[0].value : 'option1';
                    break;
                case client_1.FieldType.DATE:
                    exampleValue = new Date().toISOString().split('T')[0];
                    break;
                default:
                    exampleValue = field.fieldKey === 'name' ? 'John Doe' :
                        field.fieldKey === 'companyName' ? 'Acme Inc' :
                            'Example value';
            }
            acc[field.fieldKey] = exampleValue;
            return acc;
        }, {});
        const curlExample = `curl -X POST '${apiEndpoint}' \\
  -H 'Content-Type: application/json' \\
  -d '{
  "fields": ${JSON.stringify(exampleData, null, 4).replace(/\n/g, '\n  ')},
  "tracking": {
    "utk": "visitor_unique_id",
    "utmSource": "website",
    "referrer": "https://example.com"
  }
}'`;
        const javascriptExample = `fetch('${apiEndpoint}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    fields: ${JSON.stringify(exampleData, null, 2).replace(/\n/g, '\n    ')},
    tracking: {
      utk: 'visitor_unique_id',
      utmSource: 'website',
      referrer: window.location.href
    }
  })
})
.then(response => response.json())
.then(data => {
  console.log('Lead created:', data.leadId);
  console.log('Message:', data.message);
})
.catch(error => {
  console.error('Error:', error);
});`;
        const pythonExample = `import requests

url = '${apiEndpoint}'
payload = {
    'fields': ${JSON.stringify(exampleData, null, 4).replace(/\n/g, '\n    ')},
    'tracking': {
        'utk': 'visitor_unique_id',
        'utmSource': 'website',
        'referrer': 'https://example.com'
    }
}

response = requests.post(url, json=payload)
data = response.json()

print(f"Lead created: {data['leadId']}")
print(f"Message: {data['message']}")`;
        return {
            workspaceSlug,
            workflowId,
            iframe: {
                html: iframeCode,
                description: 'Direct iframe embed. Paste this code where you want the form to appear.',
            },
            script: {
                html: scriptCode,
                description: 'JavaScript widget with auto-resizing. Recommended for most use cases.',
            },
            api: {
                endpoint: apiEndpoint,
                method: 'POST',
                curlExample,
                javascriptExample,
                pythonExample,
                description: 'REST API for headless integration. Build your own UI and submit data programmatically.',
            },
            formConfig: {
                publicUrl: publicFormUrl,
                fields: workflow.formFields.map((field) => ({
                    fieldKey: field.fieldKey,
                    label: field.label,
                    type: field.fieldType,
                    required: field.isRequired,
                })),
            },
        };
    }
    async getEmbeddableWorkflows(workspaceId) {
        const workflows = await this.prisma.workflow.findMany({
            where: {
                workspaceId,
                status: {
                    in: [client_1.WorkflowStatus.active, client_1.WorkflowStatus.draft],
                },
                deletedAt: null,
            },
            include: {
                workspace: {
                    select: {
                        slug: true,
                        name: true,
                    },
                },
                formFields: {
                    where: { isActive: true, deletedAt: null },
                    select: {
                        id: true,
                        fieldKey: true,
                        label: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        const baseUrl = process.env.FRONTEND_URL || 'https://app.flowtrack.com';
        return workflows.map((workflow) => ({
            workflowId: workflow.id,
            name: workflow.name,
            status: workflow.status,
            workspaceSlug: workflow.workspace.slug,
            publicFormUrl: `${baseUrl}/p/${workflow.workspace.slug}`,
            fieldCount: workflow.formFields.length,
            totalExecutions: workflow.totalExecutions,
            lastExecutedAt: workflow.lastExecutedAt,
            createdAt: workflow.createdAt,
        }));
    }
};
exports.FormEmbedController = FormEmbedController;
__decorate([
    (0, common_1.Get)('embed-code/:workflowId'),
    __param(0, (0, common_1.Param)('workflowId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FormEmbedController.prototype, "getEmbedCode", null);
__decorate([
    (0, common_1.Get)('workspace/:workspaceId/embeddable'),
    __param(0, (0, common_1.Param)('workspaceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FormEmbedController.prototype, "getEmbeddableWorkflows", null);
exports.FormEmbedController = FormEmbedController = __decorate([
    (0, common_1.Controller)('forms'),
    (0, common_1.UseGuards)(unified_auth_guard_1.UnifiedAuthGuard),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], FormEmbedController);
//# sourceMappingURL=form-embed.controller.js.map