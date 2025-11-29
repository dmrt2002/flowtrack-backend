import { PrismaService } from '../../../prisma/prisma.service';
export declare class CalendarLinkGeneratorService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    generateCalendlyLink(leadId: string, workspaceId: string): Promise<string | null>;
    getPrimaryCalendarLink(leadId: string, workspaceId: string): Promise<{
        provider: 'CALENDLY' | null;
        link: string | null;
    }>;
    isCalendlyAvailable(workspaceId: string): Promise<boolean>;
}
