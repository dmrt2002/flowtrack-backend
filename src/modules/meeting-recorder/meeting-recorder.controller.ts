import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { MeetingRecorderService } from './meeting-recorder.service';
import { ProcessingOrchestratorService } from './processors/processing-orchestrator.service';

// TODO: Import your auth guards
// import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('api/meeting-recordings')
// @UseGuards(JwtAuthGuard) // Add authentication
export class MeetingRecorderController {
  constructor(
    private meetingRecorderService: MeetingRecorderService,
    private processingOrchestrator: ProcessingOrchestratorService,
  ) {}

  /**
   * List all recordings for a workspace
   */
  @Get()
  async listRecordings(
    @Query('workspaceId') workspaceId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.meetingRecorderService.listRecordings(
      workspaceId,
      limit ? parseInt(limit.toString(), 10) : 50,
      offset ? parseInt(offset.toString(), 10) : 0,
    );
  }

  /**
   * Get recording details
   */
  @Get(':id')
  async getRecording(@Param('id') id: string) {
    return this.meetingRecorderService.getRecording(id);
  }

  /**
   * Get transcript for a recording
   */
  @Get(':id/transcript')
  async getTranscript(@Param('id') id: string) {
    const recording = await this.meetingRecorderService.getRecording(id);

    if (!recording) {
      throw new Error('Recording not found');
    }

    return {
      meetingId: recording.id,
      meetingTitle: recording.meetingTitle,
      recordingStartedAt: recording.recordingStartedAt,
      durationSeconds: recording.durationSeconds,
      transcriptSegments: recording.transcriptSegments,
    };
  }

  /**
   * Get summary for a recording
   */
  @Get(':id/summary')
  async getSummary(@Param('id') id: string) {
    const recording = await this.meetingRecorderService.getRecording(id);

    if (!recording) {
      throw new Error('Recording not found');
    }

    return {
      meetingId: recording.id,
      meetingTitle: recording.meetingTitle,
      summary: recording.meetingSummary,
    };
  }

  /**
   * Manually trigger processing for a recording
   * Use this to process/reprocess recordings with the new echo-removal pipeline
   */
  @Post(':id/process')
  async processRecording(@Param('id') id: string) {
    await this.processingOrchestrator.processRecording(id);
    return {
      success: true,
      message: 'Processing started',
      meetingId: id,
    };
  }

  /**
   * Delete recording
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRecording(@Param('id') id: string) {
    await this.meetingRecorderService.deleteRecording(id);
  }
}
