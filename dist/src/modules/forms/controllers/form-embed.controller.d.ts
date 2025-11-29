import type { Request } from 'express';
import { PrismaService } from '../../../prisma/prisma.service';
import { EmbedConfigDto } from '../dto/embed-config.dto';
export declare class FormEmbedController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getEmbedCode(workflowId: string, req: Request): Promise<EmbedConfigDto>;
    getEmbeddableWorkflows(workspaceId: string): Promise<{
        workflowId: any;
        name: any;
        status: any;
        workspaceSlug: any;
        publicFormUrl: string;
        fieldCount: any;
        totalExecutions: any;
        lastExecutedAt: any;
        createdAt: any;
    }[]>;
}
