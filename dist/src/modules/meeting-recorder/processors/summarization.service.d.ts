import { PrismaService } from '../../../prisma/prisma.service';
export declare class SummarizationService {
    private prisma;
    private readonly logger;
    private readonly ollamaUrl;
    constructor(prisma: PrismaService);
    generateSummary(meetingId: string): Promise<void>;
    private callOllama;
    private buildPrompt;
    private parseOllamaResponse;
    checkOllamaAvailable(): Promise<boolean>;
    listModels(): Promise<string[]>;
}
