import { IsString, IsNumber } from 'class-validator';

export class EndSessionDto {
  @IsString()
  meetingId: string;

  @IsNumber()
  endTime: number;

  @IsNumber()
  totalChunks: number;
}
