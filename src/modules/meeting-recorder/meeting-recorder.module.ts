import { Module } from '@nestjs/common';
import { MeetingRecorderGateway } from './meeting-recorder.gateway';
import { MeetingRecorderService } from './meeting-recorder.service';
import { MeetingRecorderController } from './meeting-recorder.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { AudioProcessorService } from './processors/audio-processor.service';
import { TranscriptionService } from './processors/transcription.service';
import { DiarizationService } from './processors/diarization.service';
import { SummarizationService } from './processors/summarization.service';
import { PyannoteDiarizationService } from './processors/pyannote-diarization.service';
import { ProcessingOrchestratorService } from './processors/processing-orchestrator.service';

@Module({
  imports: [PrismaModule],
  providers: [
    MeetingRecorderGateway,
    MeetingRecorderService,
    AudioProcessorService,
    TranscriptionService,
    DiarizationService,
    SummarizationService,
    PyannoteDiarizationService,
    ProcessingOrchestratorService,
  ],
  controllers: [MeetingRecorderController],
  exports: [MeetingRecorderService, ProcessingOrchestratorService],
})
export class MeetingRecorderModule {}
