import { PartialType } from '@nestjs/swagger';
import { CreateProjectDto } from './create-project.dto';
import { OmitType } from '@nestjs/swagger';

export class UpdateProjectDto extends PartialType(
  OmitType(CreateProjectDto, ['workspaceId'] as const),
) {}
