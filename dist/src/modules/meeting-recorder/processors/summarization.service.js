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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var SummarizationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SummarizationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
const axios_1 = __importDefault(require("axios"));
let SummarizationService = SummarizationService_1 = class SummarizationService {
    prisma;
    logger = new common_1.Logger(SummarizationService_1.name);
    ollamaUrl;
    constructor(prisma) {
        this.prisma = prisma;
        this.ollamaUrl =
            process.env.OLLAMA_URL || 'http://localhost:11434/api/generate';
    }
    async generateSummary(meetingId) {
        try {
            this.logger.log(`Generating summary for meeting: ${meetingId}`);
            const segments = await this.prisma.transcriptSegment.findMany({
                where: { meetingRecordingId: meetingId },
                orderBy: { startTimeMs: 'asc' },
                select: {
                    speakerName: true,
                    text: true,
                },
            });
            if (segments.length === 0) {
                this.logger.warn('No transcript segments found');
                return;
            }
            const participants = Array.from(new Set(segments.map((segment) => segment.speakerName)));
            const transcript = segments
                .map((segment) => `${segment.speakerName}: ${segment.text}`)
                .join('\n');
            const startTime = Date.now();
            const summary = await this.callOllama(transcript, participants);
            const generationDurationMs = Date.now() - startTime;
            await this.prisma.meetingSummary.upsert({
                where: { meetingRecordingId: meetingId },
                create: {
                    meetingRecordingId: meetingId,
                    summaryText: summary.summaryText,
                    keyDecisions: summary.keyDecisions,
                    actionItems: summary.actionItems,
                    participants,
                    topics: summary.topics,
                    generatedBy: 'OLLAMA_LLAMA3',
                    generationDurationMs,
                },
                update: {
                    summaryText: summary.summaryText,
                    keyDecisions: summary.keyDecisions,
                    actionItems: summary.actionItems,
                    participants,
                    topics: summary.topics,
                    generationDurationMs,
                },
            });
            this.logger.log(`Summary generated in ${generationDurationMs}ms`);
        }
        catch (error) {
            this.logger.error('Failed to generate summary:', error);
            throw error;
        }
    }
    async callOllama(transcript, participants) {
        try {
            const prompt = this.buildPrompt(transcript, participants);
            this.logger.log('Calling Ollama API...');
            const response = await axios_1.default.post(this.ollamaUrl, {
                model: 'llama3',
                prompt,
                stream: false,
                options: {
                    temperature: 0.7,
                    top_p: 0.9,
                },
            }, {
                timeout: 120000,
            });
            const generatedText = response.data.response;
            return this.parseOllamaResponse(generatedText);
        }
        catch (error) {
            this.logger.error('Ollama API call failed:', error);
            return {
                summaryText: 'Failed to generate summary. Please check Ollama service.',
                keyDecisions: [],
                actionItems: [],
                topics: [],
            };
        }
    }
    buildPrompt(transcript, participants) {
        return `You are an AI assistant analyzing a meeting transcript. Please provide a structured analysis.

PARTICIPANTS: ${participants.join(', ')}

TRANSCRIPT:
${transcript.substring(0, 8000)} ${transcript.length > 8000 ? '...(truncated)' : ''}

INSTRUCTIONS:
1. Provide a concise 2-3 sentence summary of the meeting
2. List key decisions that were made
3. List action items with owners (if mentioned)
4. Identify main topics discussed

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:

SUMMARY:
[Your 2-3 sentence summary here]

KEY DECISIONS:
- [Decision 1]
- [Decision 2]

ACTION ITEMS:
- [Owner if known]: [Action item 1]
- [Owner if known]: [Action item 2]

TOPICS:
- [Topic 1]
- [Topic 2]

Respond with only the formatted output above. Be concise and factual.`;
    }
    parseOllamaResponse(text) {
        const result = {
            summaryText: '',
            keyDecisions: [],
            actionItems: [],
            topics: [],
        };
        try {
            const summaryMatch = text.match(/SUMMARY:\s*([\s\S]*?)(?=KEY DECISIONS:|ACTION ITEMS:|TOPICS:|$)/i);
            if (summaryMatch) {
                result.summaryText = summaryMatch[1].trim();
            }
            const decisionsMatch = text.match(/KEY DECISIONS:\s*([\s\S]*?)(?=ACTION ITEMS:|TOPICS:|$)/i);
            if (decisionsMatch) {
                result.keyDecisions = decisionsMatch[1]
                    .split('\n')
                    .map((line) => line.trim())
                    .filter((line) => line.startsWith('-'))
                    .map((line) => line.substring(1).trim())
                    .filter(Boolean);
            }
            const actionItemsMatch = text.match(/ACTION ITEMS:\s*([\s\S]*?)(?=TOPICS:|$)/i);
            if (actionItemsMatch) {
                result.actionItems = actionItemsMatch[1]
                    .split('\n')
                    .map((line) => line.trim())
                    .filter((line) => line.startsWith('-'))
                    .map((line) => {
                    const cleaned = line.substring(1).trim();
                    const colonIndex = cleaned.indexOf(':');
                    if (colonIndex > 0 && colonIndex < 30) {
                        return {
                            owner: cleaned.substring(0, colonIndex).trim(),
                            task: cleaned.substring(colonIndex + 1).trim(),
                        };
                    }
                    else {
                        return { task: cleaned };
                    }
                })
                    .filter((item) => item.task);
            }
            const topicsMatch = text.match(/TOPICS:\s*([\s\S]*?)$/i);
            if (topicsMatch) {
                result.topics = topicsMatch[1]
                    .split('\n')
                    .map((line) => line.trim())
                    .filter((line) => line.startsWith('-'))
                    .map((line) => line.substring(1).trim())
                    .filter(Boolean);
            }
        }
        catch (error) {
            this.logger.warn('Failed to parse Ollama response:', error);
        }
        if (!result.summaryText) {
            result.summaryText = text.substring(0, 500) + '...';
        }
        return result;
    }
    async checkOllamaAvailable() {
        try {
            const response = await axios_1.default.get('http://localhost:11434/api/version', {
                timeout: 5000,
            });
            return response.status === 200;
        }
        catch (error) {
            return false;
        }
    }
    async listModels() {
        try {
            const response = await axios_1.default.get('http://localhost:11434/api/tags');
            return response.data.models.map((m) => m.name);
        }
        catch (error) {
            this.logger.error('Failed to list Ollama models:', error);
            return [];
        }
    }
};
exports.SummarizationService = SummarizationService;
exports.SummarizationService = SummarizationService = SummarizationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SummarizationService);
//# sourceMappingURL=summarization.service.js.map