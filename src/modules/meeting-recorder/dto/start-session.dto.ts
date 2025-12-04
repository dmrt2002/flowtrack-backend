import { IsString, IsOptional, IsEnum } from 'class-validator';

export enum MeetingPlatform {
  GOOGLE_MEET = 'GOOGLE_MEET',
  ZOOM = 'ZOOM',
  TEAMS = 'TEAMS',
  UNKNOWN = 'UNKNOWN',
}

export class StartSessionDto {
  @IsString()
  @IsOptional() // Made optional for testing
  workspaceId?: string;

  @IsEnum(MeetingPlatform)
  platform: MeetingPlatform;

  @IsString()
  @IsOptional()
  meetingUrl?: string;

  @IsString()
  @IsOptional()
  meetingTitle?: string;

  @IsString()
  @IsOptional()
  accessToken?: string;

  @IsString()
  @IsOptional()
  leadId?: string;
}
