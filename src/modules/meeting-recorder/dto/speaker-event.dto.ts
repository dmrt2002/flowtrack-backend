import { IsString, IsNumber, IsEnum } from 'class-validator';

export enum SpeakerState {
  SPEAKING = 'speaking',
  SILENT = 'silent',
}

export class SpeakerEventDto {
  @IsNumber()
  timestamp: number;

  @IsString()
  speakerName: string;

  @IsEnum(SpeakerState)
  state: SpeakerState;
}
