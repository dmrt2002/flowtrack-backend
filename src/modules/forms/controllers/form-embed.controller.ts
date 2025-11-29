import {
  Controller,
  Get,
  Param,
  Req,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../../../prisma/prisma.service';
import { UnifiedAuthGuard } from '../../../auth/guards/unified-auth.guard';
import { EmbedConfigDto } from '../dto/embed-config.dto';
import { WorkflowStatus, FieldType } from '@prisma/client';

@Controller('forms')
@UseGuards(UnifiedAuthGuard)
export class FormEmbedController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get embed code for a workflow
   * Returns iframe code, script tag, and API examples
   *
   * @example GET /api/v1/forms/embed-code/:workflowId
   */
  @Get('embed-code/:workflowId')
  async getEmbedCode(
    @Param('workflowId') workflowId: string,
    @Req() req: Request,
  ): Promise<EmbedConfigDto> {
    // Get workflow with workspace info
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
      throw new NotFoundException(`Workflow not found: ${workflowId}`);
    }

    // Determine base URL from request or environment
    const protocol = req.protocol;
    const host = req.get('host');
    const baseUrl = process.env.FRONTEND_URL || `${protocol}://${host}`;
    const apiBaseUrl = `${protocol}://${host}`;

    const workspaceSlug = workflow.workspace.slug;
    const publicFormUrl = `${baseUrl}/p/${workspaceSlug}`;
    const apiEndpoint = `${apiBaseUrl}/api/v1/forms/public/${workspaceSlug}/submit`;

    // Generate iframe embed code
    const iframeCode = `<iframe
  src="${publicFormUrl}"
  width="100%"
  height="600"
  frameborder="0"
  scrolling="no"
  title="FlowTrack Form">
</iframe>`;

    // Generate script tag embed code
    const scriptCode = `<!-- FlowTrack Form Embed -->
<div data-flowtrack-form="${workspaceSlug}"></div>
<script src="${apiBaseUrl}/api/v1/forms/embed/script.js" async></script>`;

    // Generate cURL example
    const exampleData = workflow.formFields.reduce((acc: Record<string, string>, field) => {
      let exampleValue = '';
      switch (field.fieldType) {
        case FieldType.EMAIL:
          exampleValue = 'user@example.com';
          break;
        case FieldType.NUMBER:
          exampleValue = '1000';
          break;
        case FieldType.CHECKBOX:
          exampleValue = 'true';
          break;
        case FieldType.DROPDOWN:
          const options = field.options as any[];
          exampleValue = options && options[0] ? options[0].value : 'option1';
          break;
        case FieldType.DATE:
          exampleValue = new Date().toISOString().split('T')[0];
          break;
        default:
          exampleValue = field.fieldKey === 'name' ? 'John Doe' :
                        field.fieldKey === 'companyName' ? 'Acme Inc' :
                        'Example value';
      }
      acc[field.fieldKey] = exampleValue;
      return acc;
    }, {} as Record<string, string>);

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

    // Generate JavaScript fetch example
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

    // Generate Python requests example
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
        description:
          'Direct iframe embed. Paste this code where you want the form to appear.',
      },
      script: {
        html: scriptCode,
        description:
          'JavaScript widget with auto-resizing. Recommended for most use cases.',
      },
      api: {
        endpoint: apiEndpoint,
        method: 'POST',
        curlExample,
        javascriptExample,
        pythonExample,
        description:
          'REST API for headless integration. Build your own UI and submit data programmatically.',
      },
      formConfig: {
        publicUrl: publicFormUrl,
        fields: workflow.formFields.map((field: any) => ({
          fieldKey: field.fieldKey,
          label: field.label,
          type: field.fieldType,
          required: field.isRequired,
        })),
      },
    };
  }

  /**
   * Get all workflows with embed URLs for current workspace
   *
   * @example GET /api/v1/forms/workspace/:workspaceId/embeddable
   */
  @Get('workspace/:workspaceId/embeddable')
  async getEmbeddableWorkflows(@Param('workspaceId') workspaceId: string) {
    const workflows = await this.prisma.workflow.findMany({
      where: {
        workspaceId,
        status: {
          in: [WorkflowStatus.active, WorkflowStatus.draft],
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

    return workflows.map((workflow: any) => ({
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
}
