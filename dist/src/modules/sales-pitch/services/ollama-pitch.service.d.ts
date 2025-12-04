import { PitchContext, SalesPitch } from '../types/pitch.types';
export declare class OllamaPitchService {
    private readonly logger;
    private readonly ollamaUrl;
    private readonly model;
    generatePitch(context: PitchContext, customPrompt?: string, temperature?: number): Promise<SalesPitch>;
    checkOllamaAvailable(): Promise<boolean>;
    private buildPrompt;
    private parseResponse;
}
