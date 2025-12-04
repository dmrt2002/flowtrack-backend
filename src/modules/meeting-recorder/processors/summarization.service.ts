import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import axios from 'axios';

interface SummaryResult {
  summaryText: string;
  keyDecisions: string[];
  actionItems: Array<{ task: string; owner?: string }>;
  topics: string[];
}

@Injectable()
export class SummarizationService {
  private readonly logger = new Logger(SummarizationService.name);
  private readonly ollamaUrl: string;

  constructor(private prisma: PrismaService) {
    // Get Ollama URL from environment or use default
    this.ollamaUrl =
      process.env.OLLAMA_URL || 'http://localhost:11434/api/generate';
  }

  /**
   * Generate AI summary of meeting transcript
   */
  async generateSummary(meetingId: string): Promise<void> {
    try {
      this.logger.log(`Generating summary for meeting: ${meetingId}`);

      // Get transcript segments
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

      // Get unique participants
      const participants: string[] = Array.from(
        new Set(segments.map((segment) => segment.speakerName)),
      );

      // Format transcript
      const transcript = segments
        .map((segment) => `${segment.speakerName}: ${segment.text}`)
        .join('\n');

      // Generate summary using Ollama
      const startTime = Date.now();
      const summary = await this.callOllama(transcript, participants);
      const generationDurationMs = Date.now() - startTime;

      // Save to database
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
    } catch (error) {
      this.logger.error('Failed to generate summary:', error);
      throw error;
    }
  }

  /**
   * Call Ollama API for text generation
   */
  private async callOllama(
    transcript: string,
    participants: string[],
  ): Promise<SummaryResult> {
    try {
      const prompt = this.buildPrompt(transcript, participants);

      this.logger.log('Calling Ollama API...');

      const response = await axios.post(
        this.ollamaUrl,
        {
          model: 'llama3', // or 'mistral', 'mixtral', etc.
          prompt,
          stream: false,
          options: {
            temperature: 0.7,
            top_p: 0.9,
          },
        },
        {
          timeout: 120000, // 2 minute timeout
        },
      );

      const generatedText = response.data.response;

      // Parse the structured response
      return this.parseOllamaResponse(generatedText);
    } catch (error) {
      this.logger.error('Ollama API call failed:', error);

      // Return fallback summary if Ollama fails
      return {
        summaryText: 'Failed to generate summary. Please check Ollama service.',
        keyDecisions: [],
        actionItems: [],
        topics: [],
      };
    }
  }

  /**
   * Build structured prompt for Ollama
   */
  private buildPrompt(transcript: string, participants: string[]): string {
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

  /**
   * Parse Ollama response into structured data
   */
  private parseOllamaResponse(text: string): SummaryResult {
    const result: SummaryResult = {
      summaryText: '',
      keyDecisions: [],
      actionItems: [],
      topics: [],
    };

    try {
      // Extract summary
      const summaryMatch = text.match(
        /SUMMARY:\s*([\s\S]*?)(?=KEY DECISIONS:|ACTION ITEMS:|TOPICS:|$)/i,
      );
      if (summaryMatch) {
        result.summaryText = summaryMatch[1].trim();
      }

      // Extract key decisions
      const decisionsMatch = text.match(
        /KEY DECISIONS:\s*([\s\S]*?)(?=ACTION ITEMS:|TOPICS:|$)/i,
      );
      if (decisionsMatch) {
        result.keyDecisions = decisionsMatch[1]
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.startsWith('-'))
          .map((line) => line.substring(1).trim())
          .filter(Boolean);
      }

      // Extract action items
      const actionItemsMatch = text.match(
        /ACTION ITEMS:\s*([\s\S]*?)(?=TOPICS:|$)/i,
      );
      if (actionItemsMatch) {
        result.actionItems = actionItemsMatch[1]
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.startsWith('-'))
          .map((line) => {
            const cleaned = line.substring(1).trim();
            const colonIndex = cleaned.indexOf(':');

            if (colonIndex > 0 && colonIndex < 30) {
              // Has owner
              return {
                owner: cleaned.substring(0, colonIndex).trim(),
                task: cleaned.substring(colonIndex + 1).trim(),
              };
            } else {
              return { task: cleaned };
            }
          })
          .filter((item) => item.task);
      }

      // Extract topics
      const topicsMatch = text.match(/TOPICS:\s*([\s\S]*?)$/i);
      if (topicsMatch) {
        result.topics = topicsMatch[1]
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.startsWith('-'))
          .map((line) => line.substring(1).trim())
          .filter(Boolean);
      }
    } catch (error) {
      this.logger.warn('Failed to parse Ollama response:', error);
      // Return partial results
    }

    // Fallback summary if parsing failed
    if (!result.summaryText) {
      result.summaryText = text.substring(0, 500) + '...';
    }

    return result;
  }

  /**
   * Check if Ollama is available
   */
  async checkOllamaAvailable(): Promise<boolean> {
    try {
      const response = await axios.get('http://localhost:11434/api/version', {
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * List available Ollama models
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await axios.get('http://localhost:11434/api/tags');
      return response.data.models.map((m: any) => m.name);
    } catch (error) {
      this.logger.error('Failed to list Ollama models:', error);
      return [];
    }
  }
}
